"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form";
import { destroySession, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ABSENCE_LABELS, createAbsence, deleteAbsence } from "@/lib/services/events";
import { formatDate } from "@/lib/time";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function createAbsenceAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const fromDate = String(form.get("fromDate") ?? "");
  const toDate = String(form.get("toDate") ?? "") || fromDate;
  const kind = String(form.get("kind")) as keyof typeof ABSENCE_LABELS;
  if (!DATE.test(fromDate) || !DATE.test(toDate)) return { error: "Bitte gib einen Zeitraum an." };
  if (!(kind in ABSENCE_LABELS)) return { error: "Bitte wähle einen Grund." };
  const personIds = form.getAll("personId").map(String);
  if (!personIds.length) return { error: "Bitte wähle, für wen die Abwesenheit gilt." };
  let affected = 0;
  try {
    const db = await getDb();
    for (const personId of personIds) {
      const res = await createAbsence(db, { userId: user.id, channel: "app" }, { personId, fromDate, toDate, kind, note: String(form.get("note") ?? "") });
      affected += res.affected;
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/", "layout");
  return { ok: `Eingetragen: ${formatDate(fromDate)} bis ${formatDate(toDate)}. ${affected} Termin${affected === 1 ? "" : "e"} automatisch abgesagt.` };
}

export async function deleteAbsenceAction(absenceId: string) {
  const user = await requireUser();
  await deleteAbsence(await getDb(), { userId: user.id, channel: "app" }, absenceId);
  revalidatePath("/ich");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
