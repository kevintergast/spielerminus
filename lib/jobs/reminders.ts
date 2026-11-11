import { and, eq, gt, inArray, isNull, lte, ne } from "drizzle-orm";
import type { Db } from "../db";
import { getEnv, schema } from "../db";
import { newId, newSecret, nowSeconds } from "../ids";
import { sendMail } from "../mail";
import { pushToUser } from "../push/send";
import { EVENT_TYPE_LABELS } from "../services/events";
import { DEFAULT_TZ, formatEventTime, unixToZoned } from "../time";

const DAY = 86400;
const QUIET_FROM = 21;
const QUIET_TO = 8;

type Stage = "invite" | "reminder1" | "reminder2";

/** Fällige Stufe einer offenen Einladung, oder null. Nur die höchste fällige Stufe zählt. */
export function dueStage(ev: { startsAt: number; rsvpDeadline: number | null }, now: number): Stage | null {
  const ref = ev.rsvpDeadline ?? ev.startsAt;
  if (ref <= now) return null;
  if (now >= ref - DAY) return "reminder2";
  if (now >= ref - 2 * DAY) return "reminder1";
  if (now >= ev.startsAt - 7 * DAY) return "invite";
  return null;
}

const STAGE_ORDER: Stage[] = ["invite", "reminder1", "reminder2"];

export function isQuietHour(now: number, tz = DEFAULT_TZ): boolean {
  const hour = Number(unixToZoned(now, tz).time.slice(0, 2));
  return hour >= QUIET_FROM || hour < QUIET_TO;
}

async function usersForPerson(db: Db, personId: string) {
  return db
    .select({ u: schema.users, kind: schema.delegations.kind })
    .from(schema.delegations)
    .innerJoin(schema.users, eq(schema.users.id, schema.delegations.userId))
    .where(eq(schema.delegations.personId, personId))
    .all();
}

export async function createActionToken(db: Db, userId: string, personId: string, ev: { id: string; startsAt: number }) {
  const id = newSecret(18);
  await db.insert(schema.actionTokens).values({
    id,
    userId,
    personId,
    kind: "rsvp",
    targetId: ev.id,
    expiresAt: Math.min(ev.startsAt, nowSeconds() + 7 * DAY),
  });
  return id;
}

/** Schickt Push (mit Buttons) an alle Geräte, ohne Push-Gerät eine E-Mail. */
async function notifyPersonAboutEvent(
  db: Db,
  env: CloudflareEnv,
  invitation: typeof schema.invitations.$inferSelect,
  ev: typeof schema.events.$inferSelect,
  team: typeof schema.teams.$inferSelect,
  stage: Stage,
) {
  const person = await db.select().from(schema.persons).where(eq(schema.persons.id, invitation.personId)).get();
  if (!person) return [];
  const users = await usersForPerson(db, person.id);
  const when = formatEventTime(ev.startsAt, team.timezone);
  const what = `${ev.title}${ev.opponent ? ` · ${ev.opponent}` : ""}`;
  const channels = new Set<string>();
  for (const { u, kind } of users) {
    const forWhom = kind === "self" ? "dir" : person.firstName;
    const token = await createActionToken(db, u.id, person.id, ev);
    const title = stage === "invite" ? `${team.name}: ${what}` : `Noch keine Antwort von ${forWhom}`;
    const body = stage === "invite" ? `${when}${ev.location ? ` · ${ev.location}` : ""}. Bist du dabei?` : `${what}, ${when}`;
    const delivered = await pushToUser(db, env, u.id, {
      title,
      body: kind === "self" ? body : `${person.firstName}: ${body}`,
      url: `/t/${team.id}/termine/${ev.id}`,
      tag: `ev-${ev.id}-${person.id}`,
      token,
      actions: [
        { action: "accepted", title: "✓ Zusagen" },
        { action: "declined", title: "✕ Absagen" },
      ],
    });
    if (delivered > 0) {
      channels.add("push");
      continue;
    }
    // E-Mail nur bei Erinnerungen bzw. der Einladung, wenn kein Push-Gerät da ist
    await sendMail(
      {
        to: u.email,
        subject: `${title} (${when})`,
        text: [
          `${EVENT_TYPE_LABELS[ev.type]}: ${what}`,
          `${when}${ev.location ? `, ${ev.location}` : ""}`,
          ...(kind === "self" ? [] : [`Für: ${person.firstName}`]),
          "",
          `Zu- oder absagen mit einem Tipp: ${env.APP_URL}/q/${token}`,
          "",
          `Team ${team.name} auf spielerminus`,
        ].join("\n"),
      },
      env,
    );
    channels.add("email");
  }
  return [...channels];
}

export async function runReminders(db: Db, env: CloudflareEnv, now = nowSeconds()) {
  if (isQuietHour(now)) return 0;
  const rows = await db
    .select({ i: schema.invitations, e: schema.events, t: schema.teams })
    .from(schema.invitations)
    .innerJoin(schema.events, eq(schema.events.id, schema.invitations.eventId))
    .innerJoin(schema.teams, eq(schema.teams.id, schema.events.teamId))
    .where(
      and(
        eq(schema.invitations.rsvp, "pending"),
        eq(schema.events.status, "scheduled"),
        gt(schema.events.startsAt, now),
        lte(schema.events.startsAt, now + 8 * DAY),
      ),
    )
    .all();
  if (!rows.length) return 0;
  const sent = await db
    .select()
    .from(schema.outreach)
    .where(inArray(schema.outreach.invitationId, rows.map((r) => r.i.id)))
    .all();
  let count = 0;
  for (const { i, e, t } of rows) {
    const stage = dueStage(e, now);
    if (!stage) continue;
    const done = sent.filter((s) => s.invitationId === i.id).map((s) => STAGE_ORDER.indexOf(s.stage));
    if (done.some((d) => d >= STAGE_ORDER.indexOf(stage))) continue;
    // Erst den Eintrag anlegen (verhindert Doppelversand bei überlappenden Cron-Läufen)
    const inserted = await db
      .insert(schema.outreach)
      .values({ id: newId(), invitationId: i.id, stage, channels: [] })
      .onConflictDoNothing()
      .returning()
      .get();
    if (!inserted) continue;
    const channels = await notifyPersonAboutEvent(db, env, i, e, t, stage);
    await db.update(schema.outreach).set({ channels }).where(eq(schema.outreach.id, inserted.id));
    count++;
  }
  return count;
}

/** Nach Fristende: offene Antworten werden zu „keine Rückmeldung“. */
export async function processDeadlines(db: Db, now = nowSeconds()) {
  const due = await db
    .select()
    .from(schema.events)
    .where(and(lte(schema.events.rsvpDeadline, now), isNull(schema.events.deadlineProcessedAt), eq(schema.events.status, "scheduled")))
    .all();
  for (const ev of due) {
    const open = await db
      .select()
      .from(schema.invitations)
      .where(and(eq(schema.invitations.eventId, ev.id), eq(schema.invitations.rsvp, "pending")))
      .all();
    for (const inv of open) {
      await db.update(schema.invitations).set({ rsvp: "no_response" }).where(eq(schema.invitations.id, inv.id));
      await db.insert(schema.rsvpChanges).values({
        id: newId(),
        invitationId: inv.id,
        fromRsvp: "pending",
        toRsvp: "no_response",
        channel: "system",
      });
    }
    await db.update(schema.events).set({ deadlineProcessedAt: now }).where(eq(schema.events.id, ev.id));
  }
  return due.length;
}

/** Benachrichtigt alle, die nicht abgesagt haben, über eine Terminabsage. */
export async function notifyEventCancelled(db: Db, eventId: string, env?: CloudflareEnv) {
  const resolvedEnv = env ?? (await getEnv());
  const ev = await db.select().from(schema.events).where(eq(schema.events.id, eventId)).get();
  if (!ev) return;
  const team = await db.select().from(schema.teams).where(eq(schema.teams.id, ev.teamId)).get();
  if (!team) return;
  const invs = await db
    .select()
    .from(schema.invitations)
    .where(and(eq(schema.invitations.eventId, eventId), ne(schema.invitations.rsvp, "declined")))
    .all();
  const notified = new Set<string>();
  for (const inv of invs) {
    for (const { u } of await usersForPerson(db, inv.personId)) {
      if (notified.has(u.id)) continue;
      notified.add(u.id);
      const title = `Abgesagt: ${ev.title}`;
      const body = `${formatEventTime(ev.startsAt, team.timezone)}${ev.cancelReason ? ` · ${ev.cancelReason}` : ""}`;
      const delivered = await pushToUser(db, resolvedEnv, u.id, { title, body, url: `/t/${team.id}/termine/${ev.id}`, tag: `ev-${ev.id}` });
      if (!delivered) await sendMail({ to: u.email, subject: `${team.name}: ${title}`, text: `${title}\n${body}` }, resolvedEnv);
    }
  }
}
