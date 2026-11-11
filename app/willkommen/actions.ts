"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form";
import { normalizePhone } from "@/lib/auth/login";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";

export async function saveProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!firstName || !lastName) return { error: "Bitte gib Vor- und Nachnamen an." };
  if (!phone) return { error: "Bitte gib eine gültige Telefonnummer an, z. B. 0151 23456789." };
  const db = await getDb();
  await db.update(schema.users).set({ firstName, lastName, phoneE164: phone }).where(eq(schema.users.id, user.id));
  // Eigene Person (falls schon vorhanden) mit aktualisieren
  const self = await db
    .select()
    .from(schema.delegations)
    .where(eq(schema.delegations.userId, user.id))
    .all();
  for (const d of self.filter((d) => d.kind === "self")) {
    await db.update(schema.persons).set({ firstName, lastName }).where(eq(schema.persons.id, d.personId));
  }
  const next = String(form.get("next") ?? "/start");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/start");
}
