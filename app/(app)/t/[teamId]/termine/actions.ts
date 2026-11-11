"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { EVENT_TYPES, type EventType } from "@/lib/db/schema";
import { cancelEvent, createEvent, createSeries } from "@/lib/services/events";
import { notifyEventCancelled } from "@/lib/jobs/reminders";

const TIME = /^\d{2}:\d{2}$/;

export async function createEventAction(teamId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const actor = { userId: user.id, channel: "app" as const };
  const type = String(form.get("type")) as EventType;
  if (!EVENT_TYPES.includes(type)) return { error: "Bitte wähle eine Terminart." };
  const startTime = String(form.get("startTime") ?? "");
  const endTime = String(form.get("endTime") ?? "");
  if (!TIME.test(startTime) || !TIME.test(endTime)) return { error: "Bitte gib Beginn und Ende an." };
  const rsvpMode = form.get("rsvpMode") === "opt_out" ? "opt_out" : "opt_in";
  const deadlineHours = Number(form.get("deadlineHours") || 0) || null;
  const location = String(form.get("location") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const db = await getDb();
  try {
    if (form.get("repeat") === "weekly") {
      const weekdays = form.getAll("weekday").map(Number).filter((n) => n >= 1 && n <= 7);
      if (!weekdays.length) return { error: "Bitte wähle mindestens einen Wochentag." };
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      let durationMin = eh * 60 + em - (sh * 60 + sm);
      if (durationMin <= 0) durationMin += 1440;
      await createSeries(db, actor, teamId, {
        type,
        title: title || (type === "training" ? "Training" : "Termin"),
        weekdays,
        startTime,
        durationMin,
        location,
        rsvpMode,
        deadlineMinutesBefore: deadlineHours ? deadlineHours * 60 : null,
        startsOn: String(form.get("date") || "") || undefined,
        endsOn: String(form.get("endsOn") || "") || null,
      });
    } else {
      const date = String(form.get("date") ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Bitte gib ein Datum an." };
      const meetTime = String(form.get("meetTime") ?? "");
      const id = await createEvent(db, actor, teamId, {
        type,
        title,
        date,
        startTime,
        endTime,
        meetTime: TIME.test(meetTime) ? meetTime : undefined,
        location,
        opponent: String(form.get("opponent") ?? "").trim(),
        rsvpMode,
        deadlineHoursBefore: deadlineHours,
        maxParticipants: Number(form.get("maxParticipants") || 0) || null,
      });
      redirect(`/t/${teamId}/termine/${id}`);
    }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/t/${teamId}`);
}

export async function cancelEventAction(teamId: string, eventId: string, form: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const ev = await cancelEvent(db, { userId: user.id, channel: "app" }, eventId, String(form.get("reason") ?? ""));
  await notifyEventCancelled(db, eventId).catch((e) => console.error(e));
  void ev;
  revalidatePath(`/t/${teamId}`);
  revalidatePath(`/t/${teamId}/termine/${eventId}`);
}
