import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { schema } from "../db";
import type { Channel } from "../db/schema";
import { nowSeconds } from "../ids";
import { setRsvp } from "./events";

export const QUICK_ACTIONS = ["accepted", "declined"] as const;
export type QuickAction = (typeof QUICK_ACTIONS)[number];

export async function loadActionToken(db: Db, token: string) {
  const t = await db.select().from(schema.actionTokens).where(eq(schema.actionTokens.id, token)).get();
  if (!t) return null;
  const ev = await db.select().from(schema.events).where(eq(schema.events.id, t.targetId)).get();
  const person = await db.select().from(schema.persons).where(eq(schema.persons.id, t.personId)).get();
  const team = ev ? await db.select().from(schema.teams).where(eq(schema.teams.id, ev.teamId)).get() : null;
  const inv = ev
    ? await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.eventId, ev.id))
        .all()
        .then((l) => l.find((i) => i.personId === t.personId))
    : undefined;
  return { token: t, event: ev, person, team, invitation: inv, expired: t.expiresAt < nowSeconds() };
}

/** Schnellantwort über ein Einmal-Token (Push-Button oder Schnellantwort-Seite). */
export async function redeemActionToken(db: Db, token: string, action: QuickAction, channel: Extract<Channel, "push" | "link">) {
  const loaded = await loadActionToken(db, token);
  if (!loaded?.event) throw new Error("Dieser Link ist ungültig.");
  if (loaded.token.usedAt) throw new Error("Dieser Link wurde schon benutzt. Ändern kannst du deine Antwort in der App.");
  if (loaded.expired) throw new Error("Dieser Link ist abgelaufen.");
  await setRsvp(db, { userId: loaded.token.userId, channel }, { eventId: loaded.event.id, personId: loaded.token.personId, rsvp: action });
  await db
    .update(schema.actionTokens)
    .set({ usedAt: nowSeconds(), usedAction: action })
    .where(eq(schema.actionTokens.id, token));
  return loaded;
}
