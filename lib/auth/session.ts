import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "../db";
import { newSecret, nowSeconds, sha256 } from "../ids";

const COOKIE = "sm_session";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 Tage, gleitend verlängert

export type SessionUser = typeof schema.users.$inferSelect;

export async function createSession(userId: string): Promise<void> {
  const db = await getDb();
  const token = newSecret();
  await db.insert(schema.sessions).values({
    id: await sha256(token),
    userId,
    expiresAt: nowSeconds() + MAX_AGE,
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const id = await sha256(token);
  const row = await db
    .select({ user: schema.users, expiresAt: schema.sessions.expiresAt })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(eq(schema.sessions.id, id))
    .get();
  if (!row || row.expiresAt < nowSeconds()) return null;
  // Gleitende Verlängerung höchstens einmal pro Tag
  if (row.expiresAt - nowSeconds() < MAX_AGE - 86400) {
    await db.update(schema.sessions).set({ expiresAt: nowSeconds() + MAX_AGE }).where(eq(schema.sessions.id, id));
  }
  return row.user;
}

export function isProfileComplete(u: SessionUser): boolean {
  return Boolean(u.firstName && u.lastName && u.phoneE164);
}

/** Für geschützte Seiten: angemeldet und Pflichtangaben vollständig. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
  if (!user) redirect(`/login${next}`);
  if (!isProfileComplete(user)) redirect(`/willkommen${next}`);
  return user;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, await sha256(token)));
  }
  jar.delete(COOKIE);
}
