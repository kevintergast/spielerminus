import { notFound } from "next/navigation";
import { getDb } from "../db";
import { getTeamAccess } from "../services/access";
import { requireUser } from "./session";

/** Für Team-Seiten: angemeldeter User, Datenbank und seine Rechte im Team. */
export async function loadTeam(teamId: string, path: string) {
  const user = await requireUser(path);
  const db = await getDb();
  const access = await getTeamAccess(db, user.id, teamId);
  if (!access) notFound();
  return { user, db, access, team: access.team };
}
