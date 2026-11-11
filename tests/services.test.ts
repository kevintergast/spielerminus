import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../lib/db";
import { schema } from "../lib/db";
import { nowSeconds } from "../lib/ids";
import { processDeadlines, runReminders } from "../lib/jobs/reminders";
import { createAbsence, createEvent, setRsvp } from "../lib/services/events";
import { redeemActionToken } from "../lib/services/quick-actions";
import { getTeamByInviteCode, joinTeam } from "../lib/services/teams";
import { addDays, todayIn } from "../lib/time";
import { env, makeTeam, makeUser, testDb } from "./helpers";

let db: Db;
let dispose: () => Promise<void>;

beforeEach(async () => {
  ({ db, dispose } = await testDb());
});
afterEach(async () => {
  await dispose();
  vi.restoreAllMocks();
});

async function setup() {
  const { owner, teamId } = await makeTeam(db);
  const team = (await db.query.teams.findFirst({ where: (t, { eq }) => eq(t.id, teamId) }))!;
  const emma = await makeUser(db, "Emma", "Richter");
  const [emmaPerson] = await joinTeam(db, emma, teamId, { mode: "self" });
  const trainer = { userId: owner.id, channel: "app" as const };
  const eventId = await createEvent(db, trainer, teamId, {
    type: "training",
    title: "Training",
    date: addDays(todayIn(), 2),
    startTime: "19:30",
    endTime: "21:00",
    location: "Sporthalle am Deich",
    rsvpMode: "opt_in",
    deadlineHoursBefore: 6,
  });
  return { owner, team, teamId, emma, emmaPerson, eventId, trainer };
}

const invitation = (eventId: string, personId: string) =>
  db.select().from(schema.invitations).where(and(eq(schema.invitations.eventId, eventId), eq(schema.invitations.personId, personId))).get();

describe("Beitritt und Einladungen", () => {
  it("lädt neue Mitglieder zu kommenden Terminen ein und der Einladungscode funktioniert", async () => {
    const { team, eventId, emmaPerson } = await setup();
    expect((await getTeamByInviteCode(db, team.inviteCode.toUpperCase()))?.id).toBe(team.id);
    expect((await invitation(eventId, emmaPerson))?.rsvp).toBe("pending");
  });
});

describe("Zu- und Absagen", () => {
  it("speichert die Antwort mit Verlauf und Kanal", async () => {
    const { emma, emmaPerson, eventId } = await setup();
    await setRsvp(db, { userId: emma.id, channel: "app" }, { eventId, personId: emmaPerson, rsvp: "declined", reason: "Krank" });
    const inv = await invitation(eventId, emmaPerson);
    expect(inv).toMatchObject({ rsvp: "declined", reason: "Krank" });
    const history = await db.select().from(schema.rsvpChanges).where(eq(schema.rsvpChanges.invitationId, inv!.id)).all();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ fromRsvp: "pending", toRsvp: "declined", channel: "app" });
  });

  it("lässt Spielerinnen nicht für andere antworten, Trainer aber schon", async () => {
    const { emma, eventId, teamId, trainer } = await setup();
    const julia = await makeUser(db, "Julia", "Schröder");
    const [juliaPerson] = await joinTeam(db, julia, teamId, { mode: "self" });
    await expect(setRsvp(db, { userId: emma.id, channel: "app" }, { eventId, personId: juliaPerson, rsvp: "accepted" })).rejects.toThrow(/nur für dich/);
    await setRsvp(db, trainer, { eventId, personId: juliaPerson, rsvp: "accepted" });
    expect((await invitation(eventId, juliaPerson))?.rsvp).toBe("accepted");
  });

  it("Eltern antworten für ihr Kind", async () => {
    const { teamId, eventId } = await setup();
    const thomas = await makeUser(db, "Thomas", "Becker");
    const [lina] = await joinTeam(db, thomas, teamId, { mode: "guardian", children: [{ firstName: "Lina", lastName: "Becker" }] });
    await setRsvp(db, { userId: thomas.id, channel: "app" }, { eventId, personId: lina, rsvp: "accepted" });
    expect((await invitation(eventId, lina))?.rsvp).toBe("accepted");
  });
});

describe("Abwesenheiten", () => {
  it("sagen betroffene Termine automatisch ab", async () => {
    const { emma, emmaPerson, eventId } = await setup();
    const res = await createAbsence(db, { userId: emma.id, channel: "app" }, { personId: emmaPerson, fromDate: todayIn(), toDate: addDays(todayIn(), 7), kind: "vacation" });
    expect(res.affected).toBe(1);
    expect(await invitation(eventId, emmaPerson)).toMatchObject({ rsvp: "declined", reason: "Urlaub" });
  });
});

describe("Fristen und Erinnerungen", () => {
  it("setzt offene Antworten nach Fristende auf „keine Rückmeldung“", async () => {
    const { emmaPerson, eventId } = await setup();
    const ev = (await db.query.events.findFirst({ where: (e, { eq }) => eq(e.id, eventId) }))!;
    await processDeadlines(db, ev.rsvpDeadline! + 1);
    expect((await invitation(eventId, emmaPerson))?.rsvp).toBe("no_response");
  });

  it("erinnert nur Offene, schickt jede Stufe einmal und ohne Push-Gerät per E-Mail", async () => {
    const { owner, emma, emmaPerson, eventId, trainer } = await setup();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const ev = (await db.query.events.findFirst({ where: (e, { eq }) => eq(e.id, eventId) }))!;
    // Frist 13:30 → 20 Stunden vorher ist 17:30 am Vortag (keine Ruhezeit), Stufe „reminder2“
    const at = ev.rsvpDeadline! - 20 * 3600;
    // Die Trainerin spielt selbst mit und hat schon zugesagt; erinnert wird nur Emma.
    const ownerPerson = (await db.query.delegations.findFirst({ where: (d, { eq }) => eq(d.userId, owner.id) }))!.personId;
    await setRsvp(db, trainer, { eventId, personId: ownerPerson, rsvp: "accepted" });
    expect(await runReminders(db, env, at)).toBe(1);
    expect(await runReminders(db, env, at + 60)).toBe(0);
    const mails = log.mock.calls.map((c) => String(c[0])).filter((m) => m.startsWith("[mail]"));
    expect(mails).toHaveLength(1);
    expect(mails[0]).toContain(emma.email);
    expect(mails[0]).toContain("Noch keine Antwort");
    const outreach = await db.select().from(schema.outreach).all();
    expect(outreach).toHaveLength(1);
    expect(outreach[0]).toMatchObject({ stage: "reminder2", channels: ["email"] });
    void emmaPerson;
  });

  it("verschickt in der Ruhezeit nichts", async () => {
    const { eventId } = await setup();
    const ev = (await db.query.events.findFirst({ where: (e, { eq }) => eq(e.id, eventId) }))!;
    const night = ev.rsvpDeadline! - 14 * 3600 - 30 * 60; // 23:00 am Vortag
    expect(await runReminders(db, env, night)).toBe(0);
  });
});

describe("Schnellantworten", () => {
  it("funktionieren genau einmal", async () => {
    const { emma, emmaPerson, eventId } = await setup();
    await db.insert(schema.actionTokens).values({ id: "tok", userId: emma.id, personId: emmaPerson, kind: "rsvp", targetId: eventId, expiresAt: nowSeconds() + 3600 });
    await redeemActionToken(db, "tok", "accepted", "push");
    expect((await invitation(eventId, emmaPerson))?.rsvp).toBe("accepted");
    await expect(redeemActionToken(db, "tok", "declined", "push")).rejects.toThrow(/schon benutzt/);
  });
});
