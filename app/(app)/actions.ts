"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import type { Attendance } from "@/lib/db/schema";
import { setAttendance, setRsvp } from "@/lib/services/events";

export type RsvpResult = { ok: true } | { ok: false; error: string };

export async function rsvpAction(input: {
  eventId: string;
  personId: string;
  rsvp: "accepted" | "declined" | "maybe";
  reason?: string | null;
}): Promise<RsvpResult> {
  const user = await requireUser();
  const db = await getDb();
  try {
    await setRsvp(db, { userId: user.id, channel: "app" }, input);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function attendanceAction(invitationId: string, attendance: Attendance | null): Promise<RsvpResult> {
  const user = await requireUser();
  const db = await getDb();
  try {
    await setAttendance(db, { userId: user.id, channel: "app" }, invitationId, attendance);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
