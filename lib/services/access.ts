import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "../db";
import { schema } from "../db";
import type { Channel, Role } from "../db/schema";

export type Actor = { userId: string; channel: Channel };

export const PERMISSIONS = [
  "team.manage",
  "member.manage",
  "event.manage",
  "rsvp.others",
  "attendance.write",
  "finance.write",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [...PERMISSIONS],
  trainer: ["member.manage", "event.manage", "rsvp.others", "attendance.write"],
  treasurer: ["finance.write"],
  player: [],
  staff: [],
  guest: [],
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  trainer: "Trainer",
  treasurer: "Kasse",
  player: "Spieler",
  staff: "Betreuer",
  guest: "Gast",
};

export class AccessError extends Error {
  constructor(message = "Dafür fehlt dir die Berechtigung.") {
    super(message);
  }
}

/** Personen, für die der User handeln darf (er selbst und vertretene Personen). */
export async function actingPersonIds(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .select({ personId: schema.delegations.personId })
    .from(schema.delegations)
    .where(eq(schema.delegations.userId, userId))
    .all();
  return rows.map((r) => r.personId);
}

export type TeamAccess = {
  team: typeof schema.teams.$inferSelect;
  roles: Set<Role>;
  isOwner: boolean;
  personIds: string[];
  can: (p: Permission) => boolean;
};

/** Rollen des Users im Team (über seine eigenen Personen). Null, wenn kein Mitglied. */
export async function getTeamAccess(db: Db, userId: string, teamId: string): Promise<TeamAccess | null> {
  const team = await db.select().from(schema.teams).where(eq(schema.teams.id, teamId)).get();
  if (!team) return null;
  const persons = await actingPersonIds(db, userId);
  const own = await db
    .select({ personId: schema.delegations.personId })
    .from(schema.delegations)
    .where(and(eq(schema.delegations.userId, userId), eq(schema.delegations.kind, "self")))
    .all();
  const ownIds = own.map((o) => o.personId);
  const memberships = persons.length
    ? await db
        .select()
        .from(schema.memberships)
        .where(and(eq(schema.memberships.teamId, teamId), inArray(schema.memberships.personId, persons)))
        .all()
    : [];
  const isOwner = team.ownerUserId === userId;
  if (!memberships.length && !isOwner) return null;
  // Rollen zählen nur für die eigene Person; vertretene Kinder geben keine Trainerrechte.
  const roles = new Set<Role>(memberships.filter((m) => ownIds.includes(m.personId)).flatMap((m) => m.roles));
  if (isOwner) roles.add("admin");
  const perms = new Set([...roles].flatMap((r) => ROLE_PERMISSIONS[r]));
  return {
    team,
    roles,
    isOwner,
    personIds: memberships.map((m) => m.personId),
    can: (p) => perms.has(p),
  };
}

export async function requireTeamAccess(db: Db, userId: string, teamId: string, perm?: Permission) {
  const access = await getTeamAccess(db, userId, teamId);
  if (!access) throw new AccessError("Du bist nicht in diesem Team.");
  if (perm && !access.can(perm)) throw new AccessError();
  return access;
}

export async function audit(
  db: Db,
  actor: Actor | null,
  teamId: string | null,
  action: string,
  entityId?: string,
  data?: unknown,
) {
  await db.insert(schema.auditLog).values({
    id: crypto.randomUUID(),
    teamId,
    actorUserId: actor?.userId ?? null,
    channel: actor?.channel ?? "system",
    action,
    entityId: entityId ?? null,
    data: data ?? null,
  });
}
