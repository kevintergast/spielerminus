import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { Db } from "../db";
import { schema } from "../db";
import type { Attendance, EventType, Rsvp } from "../db/schema";
import { newId, nowSeconds } from "../ids";
import { addDays, DEFAULT_TZ, isoWeekday, todayIn, unixToZoned, zonedToUnix } from "../time";
import { type Actor, AccessError, actingPersonIds, audit, requireTeamAccess } from "./access";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  training: "Training",
  match: "Spiel",
  tournament: "Turnier",
  event: "Event",
  other: "Sonstiges",
};

export const RSVP_LABELS: Record<Rsvp, string> = {
  pending: "Offen",
  accepted: "Zugesagt",
  declined: "Abgesagt",
  maybe: "Unsicher",
  no_response: "Keine Rückmeldung",
};

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  present: "Anwesend",
  late: "Verspätet",
  excused: "Entschuldigt",
  unexcused: "Unentschuldigt",
};

export const ABSENCE_LABELS = { vacation: "Urlaub", sick: "Krank", injured: "Verletzt", other: "Abwesend" } as const;

const SERIES_HORIZON_DAYS = 56;

type SeriesInput = {
  type: EventType;
  title: string;
  weekdays: number[];
  startTime: string;
  durationMin: number;
  location: string;
  rsvpMode: "opt_in" | "opt_out";
  deadlineMinutesBefore: number | null;
  startsOn?: string;
  endsOn?: string | null;
};

export async function createSeries(db: Db, actor: Actor, teamId: string, input: SeriesInput) {
  await requireTeamAccess(db, actor.userId, teamId, "event.manage");
  const team = await db.select().from(schema.teams).where(eq(schema.teams.id, teamId)).get();
  const tz = team?.timezone ?? DEFAULT_TZ;
  const seriesId = newId();
  const startsOn = input.startsOn ?? todayIn(tz);
  await db.insert(schema.eventSeries).values({
    id: seriesId,
    teamId,
    type: input.type,
    title: input.title,
    weekdays: input.weekdays,
    startTime: input.startTime,
    durationMin: input.durationMin,
    location: input.location,
    startsOn,
    endsOn: input.endsOn ?? null,
    rsvpMode: input.rsvpMode,
    deadlineMinutesBefore: input.deadlineMinutesBefore,
    generatedUntil: addDays(startsOn, -1),
  });
  await audit(db, actor, teamId, "series.created", seriesId);
  await extendSeries(db, seriesId, addDays(todayIn(tz), SERIES_HORIZON_DAYS));
  return seriesId;
}

/** Erzeugt Termine einer Serie bis einschließlich `until` (idempotent über generatedUntil). */
export async function extendSeries(db: Db, seriesId: string, until: string) {
  const s = await db.select().from(schema.eventSeries).where(eq(schema.eventSeries.id, seriesId)).get();
  if (!s) return 0;
  const team = await db.select().from(schema.teams).where(eq(schema.teams.id, s.teamId)).get();
  const tz = team?.timezone ?? DEFAULT_TZ;
  const last = s.endsOn && s.endsOn < until ? s.endsOn : until;
  let day = addDays(s.generatedUntil, 1);
  if (day < s.startsOn) day = s.startsOn;
  let created = 0;
  while (day <= last) {
    if (s.weekdays.includes(isoWeekday(day))) {
      const startsAt = zonedToUnix(day, s.startTime, tz);
      if (startsAt > nowSeconds()) {
        await createEventRow(db, s.teamId, {
          seriesId: s.id,
          type: s.type,
          title: s.title,
          startsAt,
          endsAt: startsAt + s.durationMin * 60,
          location: s.location,
          rsvpMode: s.rsvpMode,
          rsvpDeadline: s.deadlineMinutesBefore != null ? startsAt - s.deadlineMinutesBefore * 60 : null,
        });
        created++;
      }
    }
    day = addDays(day, 1);
  }
  if (last > s.generatedUntil) {
    await db.update(schema.eventSeries).set({ generatedUntil: last }).where(eq(schema.eventSeries.id, s.id));
  }
  return created;
}

export async function extendAllSeries(db: Db) {
  const all = await db.select().from(schema.eventSeries).all();
  let created = 0;
  for (const s of all) created += await extendSeries(db, s.id, addDays(todayIn(DEFAULT_TZ), SERIES_HORIZON_DAYS));
  return created;
}

type EventRowInput = {
  seriesId?: string | null;
  type: EventType;
  title: string;
  startsAt: number;
  endsAt: number;
  meetAt?: number | null;
  location: string;
  opponent?: string | null;
  rsvpMode: "opt_in" | "opt_out";
  rsvpDeadline: number | null;
  maxParticipants?: number | null;
};

async function createEventRow(db: Db, teamId: string, input: EventRowInput) {
  const id = newId();
  await db.insert(schema.events).values({ id, teamId, ...input, seriesId: input.seriesId ?? null });
  await inviteTeam(db, id);
  return id;
}

export type CreateEventInput = {
  type: EventType;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  meetTime?: string;
  location: string;
  opponent?: string;
  rsvpMode: "opt_in" | "opt_out";
  deadlineHoursBefore?: number | null;
  maxParticipants?: number | null;
};

export async function createEvent(db: Db, actor: Actor, teamId: string, input: CreateEventInput) {
  const access = await requireTeamAccess(db, actor.userId, teamId, "event.manage");
  const tz = access.team.timezone;
  const startsAt = zonedToUnix(input.date, input.startTime, tz);
  let endsAt = zonedToUnix(input.date, input.endTime, tz);
  if (endsAt <= startsAt) endsAt += 86400;
  const id = await createEventRow(db, teamId, {
    type: input.type,
    title: input.title || EVENT_TYPE_LABELS[input.type],
    startsAt,
    endsAt,
    meetAt: input.meetTime ? zonedToUnix(input.date, input.meetTime, tz) : null,
    location: input.location,
    opponent: input.opponent || null,
    rsvpMode: input.rsvpMode,
    rsvpDeadline: input.deadlineHoursBefore ? startsAt - input.deadlineHoursBefore * 3600 : null,
    maxParticipants: input.maxParticipants || null,
  });
  await audit(db, actor, teamId, "event.created", id);
  return id;
}

async function absenceFor(db: Db, personId: string, ts: number, tz: string) {
  const date = unixToZoned(ts, tz).date;
  return db
    .select()
    .from(schema.absences)
    .where(
      and(eq(schema.absences.personId, personId), lte(schema.absences.fromDate, date), gte(schema.absences.toDate, date)),
    )
    .get();
}

/** Lädt alle aktiven Spieler des Teams zu einem Termin ein (fehlende Einladungen werden ergänzt). */
async function inviteTeam(db: Db, eventId: string) {
  const ev = await db.select().from(schema.events).where(eq(schema.events.id, eventId)).get();
  if (!ev) return;
  const members = await db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.teamId, ev.teamId), eq(schema.memberships.status, "active")))
    .all();
  for (const m of members.filter((m) => m.roles.includes("player"))) await invitePerson(db, ev, m.personId);
}

async function invitePerson(db: Db, ev: typeof schema.events.$inferSelect, personId: string) {
  const team = await db.select().from(schema.teams).where(eq(schema.teams.id, ev.teamId)).get();
  const absence = await absenceFor(db, personId, ev.startsAt, team?.timezone ?? DEFAULT_TZ);
  const rsvp: Rsvp = absence ? "declined" : ev.rsvpMode === "opt_out" ? "accepted" : "pending";
  await db
    .insert(schema.invitations)
    .values({
      id: newId(),
      eventId: ev.id,
      personId,
      rsvp,
      reason: absence ? ABSENCE_LABELS[absence.kind] : null,
      respondedAt: absence ? nowSeconds() : null,
    })
    .onConflictDoNothing();
}

/** Für neue Mitglieder: Einladungen zu allen kommenden Terminen. */
export async function inviteToUpcomingEvents(db: Db, teamId: string, personId: string) {
  const m = await db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.teamId, teamId), eq(schema.memberships.personId, personId)))
    .get();
  if (!m || m.status !== "active" || !m.roles.includes("player")) return;
  const upcoming = await db
    .select()
    .from(schema.events)
    .where(and(eq(schema.events.teamId, teamId), gte(schema.events.startsAt, nowSeconds()), eq(schema.events.status, "scheduled")))
    .all();
  for (const ev of upcoming) await invitePerson(db, ev, personId);
}

export type EventListItem = typeof schema.events.$inferSelect & {
  counts: Record<Rsvp, number>;
  mine: { personId: string; firstName: string; invitationId: string; rsvp: Rsvp; reason: string | null }[];
};

/** Kommende Termine (inkl. heute begonnener) mit Zählern und den eigenen Antworten. */
export async function listTeamEvents(
  db: Db,
  userId: string,
  teamId: string,
  opts: { from?: number; to?: number; limit?: number; past?: boolean } = {},
): Promise<EventListItem[]> {
  const from = opts.from ?? nowSeconds() - 3 * 3600;
  const where = opts.past
    ? and(eq(schema.events.teamId, teamId), lte(schema.events.startsAt, nowSeconds()))
    : and(eq(schema.events.teamId, teamId), gte(schema.events.endsAt, from), opts.to ? lte(schema.events.startsAt, opts.to) : undefined);
  const evs = await db
    .select()
    .from(schema.events)
    .where(where)
    .orderBy(opts.past ? sql`${schema.events.startsAt} desc` : asc(schema.events.startsAt))
    .limit(opts.limit ?? 50)
    .all();
  return decorateEvents(db, userId, evs);
}

export async function decorateEvents(db: Db, userId: string, evs: (typeof schema.events.$inferSelect)[]) {
  if (!evs.length) return [];
  const ids = evs.map((e) => e.id);
  const persons = await actingPersonIds(db, userId);
  const inv = await db
    .select({ i: schema.invitations, p: schema.persons })
    .from(schema.invitations)
    .innerJoin(schema.persons, eq(schema.persons.id, schema.invitations.personId))
    .where(inArray(schema.invitations.eventId, ids))
    .all();
  return evs.map((ev) => {
    const mine = inv.filter((x) => x.i.eventId === ev.id);
    const counts = { pending: 0, accepted: 0, declined: 0, maybe: 0, no_response: 0 } as Record<Rsvp, number>;
    for (const x of mine) counts[x.i.rsvp]++;
    return {
      ...ev,
      counts,
      mine: mine
        .filter((x) => persons.includes(x.i.personId))
        .map((x) => ({
          personId: x.p.id,
          firstName: x.p.firstName,
          invitationId: x.i.id,
          rsvp: x.i.rsvp,
          reason: x.i.reason,
        })),
    };
  });
}

export async function getEventDetail(db: Db, userId: string, eventId: string) {
  const ev = await db.select().from(schema.events).where(eq(schema.events.id, eventId)).get();
  if (!ev) return null;
  const access = await requireTeamAccess(db, userId, ev.teamId);
  const [decorated] = await decorateEvents(db, userId, [ev]);
  const responses = await db
    .select({ i: schema.invitations, p: schema.persons })
    .from(schema.invitations)
    .innerJoin(schema.persons, eq(schema.persons.id, schema.invitations.personId))
    .where(eq(schema.invitations.eventId, eventId))
    .all();
  const history = access.can("rsvp.others")
    ? await db
        .select({ c: schema.rsvpChanges, p: schema.persons, u: schema.users })
        .from(schema.rsvpChanges)
        .innerJoin(schema.invitations, eq(schema.invitations.id, schema.rsvpChanges.invitationId))
        .innerJoin(schema.persons, eq(schema.persons.id, schema.invitations.personId))
        .leftJoin(schema.users, eq(schema.users.id, schema.rsvpChanges.actorUserId))
        .where(eq(schema.invitations.eventId, eventId))
        .orderBy(sql`${schema.rsvpChanges.at} desc`)
        .all()
    : [];
  return {
    event: decorated,
    access,
    responses: responses
      .map((r) => ({ ...r.i, firstName: r.p.firstName, lastName: r.p.lastName }))
      .sort((a, b) => a.firstName.localeCompare(b.firstName, "de")),
    history,
  };
}

export class RsvpError extends Error {}

export async function setRsvp(
  db: Db,
  actor: Actor,
  input: { eventId: string; personId: string; rsvp: Exclude<Rsvp, "pending" | "no_response">; reason?: string | null },
) {
  const ev = await db.select().from(schema.events).where(eq(schema.events.id, input.eventId)).get();
  if (!ev) throw new RsvpError("Termin nicht gefunden.");
  if (ev.status === "cancelled") throw new RsvpError("Der Termin wurde abgesagt.");
  const acting = await actingPersonIds(db, actor.userId);
  const access = await requireTeamAccess(db, actor.userId, ev.teamId);
  const forOther = !acting.includes(input.personId);
  if (forOther && !access.can("rsvp.others")) throw new AccessError("Du kannst nur für dich selbst antworten.");
  if (!forOther && ev.startsAt < nowSeconds() && !access.can("rsvp.others"))
    throw new RsvpError("Der Termin hat schon begonnen.");

  const inv = await db
    .select()
    .from(schema.invitations)
    .where(and(eq(schema.invitations.eventId, ev.id), eq(schema.invitations.personId, input.personId)))
    .get();
  if (!inv) throw new RsvpError("Für diesen Termin bist du nicht eingeladen.");
  if (inv.rsvp === input.rsvp && (inv.reason ?? null) === (input.reason ?? null)) return inv;

  if (input.rsvp === "accepted" && ev.maxParticipants) {
    const accepted = await db
      .select({ n: sql<number>`count(*)` })
      .from(schema.invitations)
      .where(and(eq(schema.invitations.eventId, ev.id), eq(schema.invitations.rsvp, "accepted")))
      .get();
    if ((accepted?.n ?? 0) >= ev.maxParticipants) throw new RsvpError("Der Termin ist schon voll.");
  }

  const reason = input.rsvp === "accepted" ? null : input.reason?.trim() || null;
  await db
    .update(schema.invitations)
    .set({ rsvp: input.rsvp, reason, respondedAt: nowSeconds() })
    .where(eq(schema.invitations.id, inv.id));
  await db.insert(schema.rsvpChanges).values({
    id: newId(),
    invitationId: inv.id,
    fromRsvp: inv.rsvp,
    toRsvp: input.rsvp,
    reason,
    actorUserId: actor.userId,
    channel: actor.channel,
  });
  return { ...inv, rsvp: input.rsvp, reason };
}

export async function setAttendance(db: Db, actor: Actor, invitationId: string, attendance: Attendance | null) {
  const row = await db
    .select({ i: schema.invitations, e: schema.events })
    .from(schema.invitations)
    .innerJoin(schema.events, eq(schema.events.id, schema.invitations.eventId))
    .where(eq(schema.invitations.id, invitationId))
    .get();
  if (!row) throw new RsvpError("Einladung nicht gefunden.");
  await requireTeamAccess(db, actor.userId, row.e.teamId, "attendance.write");
  await db.update(schema.invitations).set({ attendance }).where(eq(schema.invitations.id, invitationId));
  await audit(db, actor, row.e.teamId, "attendance.set", invitationId, { attendance });
}

export async function cancelEvent(db: Db, actor: Actor, eventId: string, reason: string) {
  const ev = await db.select().from(schema.events).where(eq(schema.events.id, eventId)).get();
  if (!ev) throw new RsvpError("Termin nicht gefunden.");
  await requireTeamAccess(db, actor.userId, ev.teamId, "event.manage");
  await db
    .update(schema.events)
    .set({ status: "cancelled", cancelReason: reason.trim() || null })
    .where(eq(schema.events.id, eventId));
  await audit(db, actor, ev.teamId, "event.cancelled", eventId, { reason });
  return ev;
}

/** Abwesenheit eintragen und betroffene offene oder zugesagte Termine absagen. */
export async function createAbsence(
  db: Db,
  actor: Actor,
  input: { personId: string; fromDate: string; toDate: string; kind: keyof typeof ABSENCE_LABELS; note?: string },
) {
  const acting = await actingPersonIds(db, actor.userId);
  if (!acting.includes(input.personId)) throw new AccessError("Du kannst nur für dich oder vertretene Personen Abwesenheiten eintragen.");
  if (input.toDate < input.fromDate) throw new RsvpError("Das Ende liegt vor dem Beginn.");
  const id = newId();
  await db.insert(schema.absences).values({ id, ...input, note: input.note || null, createdBy: actor.userId });
  const fromTs = zonedToUnix(input.fromDate, "00:00");
  const toTs = zonedToUnix(addDays(input.toDate, 1), "00:00");
  const affected = await db
    .select({ i: schema.invitations, e: schema.events })
    .from(schema.invitations)
    .innerJoin(schema.events, eq(schema.events.id, schema.invitations.eventId))
    .where(
      and(
        eq(schema.invitations.personId, input.personId),
        gte(schema.events.startsAt, Math.max(fromTs, nowSeconds())),
        lte(schema.events.startsAt, toTs),
      ),
    )
    .all();
  for (const a of affected) {
    if (a.i.rsvp === "declined") continue;
    await db
      .update(schema.invitations)
      .set({ rsvp: "declined", reason: ABSENCE_LABELS[input.kind], respondedAt: nowSeconds() })
      .where(eq(schema.invitations.id, a.i.id));
    await db.insert(schema.rsvpChanges).values({
      id: newId(),
      invitationId: a.i.id,
      fromRsvp: a.i.rsvp,
      toRsvp: "declined",
      reason: ABSENCE_LABELS[input.kind],
      actorUserId: actor.userId,
      channel: "system",
    });
  }
  return { id, affected: affected.length };
}

export async function deleteAbsence(db: Db, actor: Actor, absenceId: string) {
  const a = await db.select().from(schema.absences).where(eq(schema.absences.id, absenceId)).get();
  if (!a) return;
  const acting = await actingPersonIds(db, actor.userId);
  if (!acting.includes(a.personId)) throw new AccessError();
  await db.delete(schema.absences).where(eq(schema.absences.id, absenceId));
}

export async function listAbsences(db: Db, userId: string) {
  const persons = await actingPersonIds(db, userId);
  if (!persons.length) return [];
  return db
    .select({ a: schema.absences, p: schema.persons })
    .from(schema.absences)
    .innerJoin(schema.persons, eq(schema.persons.id, schema.absences.personId))
    .where(and(inArray(schema.absences.personId, persons), gte(schema.absences.toDate, todayIn())))
    .orderBy(asc(schema.absences.fromDate))
    .all();
}
