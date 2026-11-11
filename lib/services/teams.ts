import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "../db";
import { schema } from "../db";
import type { Role } from "../db/schema";
import { newId } from "../ids";
import { type Actor, AccessError, actingPersonIds, audit, requireTeamAccess } from "./access";
import { createSeries, inviteToUpcomingEvents } from "./events";

export const SPORTS = ["Volleyball", "Fußball", "Handball", "Basketball", "Hockey", "Tennis", "Sonstiges"] as const;

function newInviteCode(): string {
  // gut lesbar, ohne 0/O und 1/l
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

/** Eigene Person des Users (wird beim ersten Bedarf angelegt). */
export async function ensureSelfPerson(db: Db, user: typeof schema.users.$inferSelect): Promise<string> {
  const self = await db
    .select({ personId: schema.delegations.personId })
    .from(schema.delegations)
    .where(and(eq(schema.delegations.userId, user.id), eq(schema.delegations.kind, "self")))
    .get();
  if (self) return self.personId;
  const personId = newId();
  await db.insert(schema.persons).values({ id: personId, firstName: user.firstName, lastName: user.lastName });
  await db.insert(schema.delegations).values({ userId: user.id, personId, kind: "self" });
  return personId;
}

export type CreateTeamInput = {
  name: string;
  sport: string;
  isYouth: boolean;
  training?: { weekdays: number[]; startTime: string; durationMin: number; location: string };
};

export async function createTeam(db: Db, user: typeof schema.users.$inferSelect, input: CreateTeamInput) {
  const teamId = newId();
  await db.insert(schema.teams).values({
    id: teamId,
    name: input.name.trim(),
    sport: input.sport,
    isYouth: input.isYouth,
    ownerUserId: user.id,
    inviteCode: newInviteCode(),
  });
  const personId = await ensureSelfPerson(db, user);
  // Bei Jugendteams spielt der Ersteller nicht selbst mit.
  const roles: Role[] = input.isYouth ? ["admin", "trainer"] : ["admin", "trainer", "player"];
  await db.insert(schema.memberships).values({ id: newId(), teamId, personId, roles });
  const actor: Actor = { userId: user.id, channel: "app" };
  await audit(db, actor, teamId, "team.created", teamId, { name: input.name });
  if (input.training && input.training.weekdays.length) {
    await createSeries(db, actor, teamId, {
      type: "training",
      title: "Training",
      weekdays: input.training.weekdays,
      startTime: input.training.startTime,
      durationMin: input.training.durationMin,
      location: input.training.location,
      rsvpMode: "opt_in",
      deadlineMinutesBefore: null,
    });
  }
  return teamId;
}

export async function listMyTeams(db: Db, userId: string) {
  const persons = await actingPersonIds(db, userId);
  if (!persons.length) return [];
  const rows = await db
    .selectDistinct({ team: schema.teams })
    .from(schema.memberships)
    .innerJoin(schema.teams, eq(schema.teams.id, schema.memberships.teamId))
    .where(inArray(schema.memberships.personId, persons))
    .orderBy(asc(schema.teams.name))
    .all();
  return rows.map((r) => r.team);
}

export async function getTeamByInviteCode(db: Db, code: string) {
  return db.select().from(schema.teams).where(eq(schema.teams.inviteCode, code.toLowerCase())).get();
}

export type RosterEntry = {
  membershipId: string;
  personId: string;
  firstName: string;
  lastName: string;
  isMinor: boolean;
  roles: Role[];
  status: "active" | "inactive";
  position: string | null;
  linkedUsers: { userId: string; kind: string; name: string; hasPush: boolean; installed: boolean }[];
};

export async function getRoster(db: Db, teamId: string): Promise<RosterEntry[]> {
  const rows = await db
    .select({ m: schema.memberships, p: schema.persons })
    .from(schema.memberships)
    .innerJoin(schema.persons, eq(schema.persons.id, schema.memberships.personId))
    .where(eq(schema.memberships.teamId, teamId))
    .all();
  const personIds = rows.map((r) => r.p.id);
  const links = personIds.length
    ? await db
        .select({ d: schema.delegations, u: schema.users })
        .from(schema.delegations)
        .innerJoin(schema.users, eq(schema.users.id, schema.delegations.userId))
        .where(inArray(schema.delegations.personId, personIds))
        .all()
    : [];
  const userIds = [...new Set(links.map((l) => l.u.id))];
  const subs = userIds.length
    ? await db
        .select({ userId: schema.pushSubscriptions.userId, installed: schema.pushSubscriptions.installed })
        .from(schema.pushSubscriptions)
        .where(inArray(schema.pushSubscriptions.userId, userIds))
        .all()
    : [];
  return rows
    .map((r) => ({
      membershipId: r.m.id,
      personId: r.p.id,
      firstName: r.p.firstName,
      lastName: r.p.lastName,
      isMinor: r.p.isMinor,
      roles: r.m.roles,
      status: r.m.status,
      position: r.m.position,
      linkedUsers: links
        .filter((l) => l.d.personId === r.p.id)
        .map((l) => ({
          userId: l.u.id,
          kind: l.d.kind,
          name: `${l.u.firstName} ${l.u.lastName}`.trim(),
          hasPush: subs.some((s) => s.userId === l.u.id),
          installed: subs.some((s) => s.userId === l.u.id && s.installed),
        })),
    }))
    .sort((a, b) => a.lastName.localeCompare(b.lastName, "de") || a.firstName.localeCompare(b.firstName, "de"));
}

/** Kader-Einträge ohne verknüpften Account (zum Auswählen beim Beitritt). */
export async function unclaimedPersons(db: Db, teamId: string, minors: boolean) {
  const roster = await getRoster(db, teamId);
  return roster.filter(
    (r) => r.isMinor === minors && r.status === "active" && !r.linkedUsers.some((l) => l.kind === "self"),
  );
}

export type JoinInput =
  | { mode: "self"; personId?: string }
  | { mode: "guardian"; children: { personId?: string; firstName?: string; lastName?: string }[] };

export async function joinTeam(db: Db, user: typeof schema.users.$inferSelect, teamId: string, input: JoinInput) {
  const actor: Actor = { userId: user.id, channel: "app" };
  const team = await db.select().from(schema.teams).where(eq(schema.teams.id, teamId)).get();
  if (!team) throw new AccessError("Team nicht gefunden.");
  const touched: string[] = [];

  if (input.mode === "self") {
    let personId: string;
    if (input.personId) {
      // Kader-Eintrag übernehmen, falls er noch frei ist
      const free = (await unclaimedPersons(db, teamId, false)).find((p) => p.personId === input.personId);
      if (!free) throw new AccessError("Dieser Eintrag ist schon vergeben.");
      const existingSelf = await db
        .select()
        .from(schema.delegations)
        .where(and(eq(schema.delegations.userId, user.id), eq(schema.delegations.kind, "self")))
        .get();
      if (existingSelf) {
        // User hat schon eine eigene Person: Mitgliedschaft des Kader-Eintrags auf sie umhängen
        const already = await db
          .select()
          .from(schema.memberships)
          .where(and(eq(schema.memberships.teamId, teamId), eq(schema.memberships.personId, existingSelf.personId)))
          .get();
        if (!already) {
          await db
            .update(schema.memberships)
            .set({ personId: existingSelf.personId })
            .where(eq(schema.memberships.id, free.membershipId));
          await db
            .update(schema.invitations)
            .set({ personId: existingSelf.personId })
            .where(eq(schema.invitations.personId, input.personId));
        }
        personId = existingSelf.personId;
      } else {
        await db.insert(schema.delegations).values({ userId: user.id, personId: input.personId, kind: "self" });
        await db
          .update(schema.persons)
          .set({ firstName: user.firstName, lastName: user.lastName })
          .where(eq(schema.persons.id, input.personId));
        personId = input.personId;
      }
    } else {
      personId = await ensureSelfPerson(db, user);
      const existing = await db
        .select()
        .from(schema.memberships)
        .where(and(eq(schema.memberships.teamId, teamId), eq(schema.memberships.personId, personId)))
        .get();
      if (!existing) {
        await db.insert(schema.memberships).values({ id: newId(), teamId, personId, roles: ["player"] });
      }
    }
    touched.push(personId);
  } else {
    for (const child of input.children) {
      let personId = child.personId;
      if (personId) {
        const known = (await unclaimedPersons(db, teamId, true)).concat(
          // vertretene Kinder dürfen weitere Stellvertreter bekommen (z. B. getrennt lebende Eltern)
          (await getRoster(db, teamId)).filter((r) => r.isMinor && r.personId === child.personId),
        );
        if (!known.some((k) => k.personId === personId)) throw new AccessError("Kind nicht im Kader gefunden.");
      } else {
        if (!child.firstName?.trim()) continue;
        personId = newId();
        await db.insert(schema.persons).values({
          id: personId,
          firstName: child.firstName.trim(),
          lastName: (child.lastName ?? user.lastName).trim(),
          isMinor: true,
        });
        await db.insert(schema.memberships).values({ id: newId(), teamId, personId, roles: ["player"] });
      }
      await db
        .insert(schema.delegations)
        .values({ userId: user.id, personId, kind: "guardian" })
        .onConflictDoNothing();
      touched.push(personId);
    }
  }
  for (const personId of touched) await inviteToUpcomingEvents(db, teamId, personId);
  await audit(db, actor, teamId, "team.joined", user.id, { persons: touched });
  return touched;
}

export async function addRosterPerson(
  db: Db,
  actor: Actor,
  teamId: string,
  input: { firstName: string; lastName: string; isMinor: boolean; roles: Role[]; position?: string },
) {
  await requireTeamAccess(db, actor.userId, teamId, "member.manage");
  const personId = newId();
  await db.insert(schema.persons).values({
    id: personId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    isMinor: input.isMinor,
  });
  await db.insert(schema.memberships).values({
    id: newId(),
    teamId,
    personId,
    roles: input.roles.length ? input.roles : ["player"],
    position: input.position?.trim() || null,
  });
  await inviteToUpcomingEvents(db, teamId, personId);
  await audit(db, actor, teamId, "member.added", personId);
  return personId;
}

export async function setMembershipStatus(db: Db, actor: Actor, teamId: string, membershipId: string, status: "active" | "inactive") {
  await requireTeamAccess(db, actor.userId, teamId, "member.manage");
  const m = await db
    .update(schema.memberships)
    .set({ status })
    .where(and(eq(schema.memberships.id, membershipId), eq(schema.memberships.teamId, teamId)))
    .returning()
    .get();
  if (m && status === "active") await inviteToUpcomingEvents(db, teamId, m.personId);
  await audit(db, actor, teamId, `member.${status}`, membershipId);
}

export async function setMembershipRoles(db: Db, actor: Actor, teamId: string, membershipId: string, roles: Role[]) {
  const access = await requireTeamAccess(db, actor.userId, teamId, "member.manage");
  if (roles.includes("admin") && !access.can("team.manage")) throw new AccessError("Nur Admins können Admins ernennen.");
  await db
    .update(schema.memberships)
    .set({ roles })
    .where(and(eq(schema.memberships.id, membershipId), eq(schema.memberships.teamId, teamId)));
  await audit(db, actor, teamId, "member.roles", membershipId, { roles });
}
