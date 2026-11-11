import { readdirSync, readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import { createDb, type Db, schema } from "../lib/db";
import { newId, newSecret } from "../lib/ids";
import { createTeam } from "../lib/services/teams";

/** Frische, echte D1-Datenbank (Miniflare, nur im Speicher) mit allen Migrationen. */
export async function testDb(): Promise<{ db: Db; d1: D1Database; dispose: () => Promise<void> }> {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: ["DB"],
  });
  const d1 = (await mf.getD1Database("DB")) as unknown as D1Database;
  for (const file of readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(`drizzle/${file}`, "utf8");
    for (const stmt of sql.split("--> statement-breakpoint")) if (stmt.trim()) await d1.prepare(stmt).run();
  }
  return { db: createDb(d1), d1, dispose: () => mf.dispose() };
}

export async function makeUser(db: Db, firstName: string, lastName = "Test") {
  const id = newId();
  await db.insert(schema.users).values({
    id,
    email: `${firstName.toLowerCase()}.${id}@vc-deshalb.test`,
    firstName,
    lastName,
    phoneE164: "+493023125099",
    icalToken: newSecret(12),
  });
  return (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, id) }))!;
}

/** Team mit Trainerin (Besitzerin) und einer Spielerin. */
export async function makeTeam(db: Db) {
  const owner = await makeUser(db, "Lena", "Becker");
  const teamId = await createTeam(db, owner, { name: "VC Deshalb Test", sport: "Volleyball", isYouth: false });
  return { owner, teamId };
}

export const env = {
  NEXTJS_ENV: "development",
  APP_URL: "http://localhost:3000",
  MAIL_FROM: "spielerminus <noreply@spielerminus.app>",
  VAPID_PUBLIC_KEY: "",
  VAPID_PRIVATE_KEY: "",
  VAPID_SUBJECT: "https://spielerminus.app",
} as unknown as CloudflareEnv;
