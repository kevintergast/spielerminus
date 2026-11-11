import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

/** Datenbank für die aktuelle Anfrage (Seiten, Server Actions, Route Handler). */
export async function getDb(): Promise<Db> {
  const { env } = await getCloudflareContext({ async: true });
  return createDb(env.DB);
}

export async function getEnv(): Promise<CloudflareEnv> {
  return (await getCloudflareContext({ async: true })).env;
}

export { schema };
