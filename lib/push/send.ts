import { buildPushPayload } from "@block65/webcrypto-web-push";
import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { schema } from "../db";

export type PushData = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  token?: string;
  actions?: { action: string; title: string }[];
};

/** Schickt eine Push-Nachricht an alle Geräte des Users. Gibt die Zahl erfolgreicher Zustellungen zurück. */
export async function pushToUser(db: Db, env: CloudflareEnv, userId: string, data: PushData): Promise<number> {
  if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return 0;
  const subs = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, userId)).all();
  let delivered = 0;
  for (const s of subs) {
    try {
      const payload = await buildPushPayload(
        { data: JSON.stringify(data), options: { ttl: 6 * 3600, urgency: "high" } },
        { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
        { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY },
      );
      const res = await fetch(s.endpoint, payload);
      if (res.status === 404 || res.status === 410) {
        await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, s.id));
      } else if (res.ok) {
        delivered++;
      }
    } catch (e) {
      console.error("[push]", (e as Error).message);
    }
  }
  return delivered;
}
