"use server";

import { eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { nowSeconds } from "@/lib/ids";

export async function dismissInstallHintAction() {
  const user = await requireUser();
  const db = await getDb();
  await db.update(schema.users).set({ installHintDismissedAt: nowSeconds() }).where(eq(schema.users.id, user.id));
}

export async function countInstallHintAction() {
  const user = await requireUser();
  const db = await getDb();
  await db
    .update(schema.users)
    .set({ installHintCount: sql`${schema.users.installHintCount} + 1` })
    .where(eq(schema.users.id, user.id));
}
