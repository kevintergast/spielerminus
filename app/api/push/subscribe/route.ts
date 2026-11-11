import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { newId, nowSeconds } from "@/lib/ids";

const Body = z.object({
  endpoint: z.string().url().startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(10), auth: z.string().min(4) }),
  platform: z.string().max(40).optional(),
  installed: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const b = parsed.data;
  const db = await getDb();
  await db
    .insert(schema.pushSubscriptions)
    .values({
      id: newId(),
      userId: user.id,
      endpoint: b.endpoint,
      p256dh: b.keys.p256dh,
      auth: b.keys.auth,
      platform: b.platform ?? "",
      installed: b.installed ?? false,
    })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh: b.keys.p256dh, auth: b.keys.auth, installed: b.installed ?? false, lastSeenAt: nowSeconds() },
    });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) {
    const db = await getDb();
    const sub = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, endpoint)).get();
    if (sub?.userId === user.id) await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, sub.id));
  }
  return Response.json({ ok: true });
}
