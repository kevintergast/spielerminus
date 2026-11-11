"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/form";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { createTeam, SPORTS } from "@/lib/services/teams";

export async function createTeamAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(form.get("name") ?? "").trim();
  const sport = String(form.get("sport") ?? "");
  if (name.length < 2) return { error: "Bitte gib einen Teamnamen an." };
  if (!SPORTS.includes(sport as (typeof SPORTS)[number])) return { error: "Bitte wähle eine Sportart." };
  const weekdays = form.getAll("weekday").map(Number).filter((n) => n >= 1 && n <= 7);
  const startTime = String(form.get("startTime") ?? "");
  const endTime = String(form.get("endTime") ?? "");
  let training;
  if (weekdays.length) {
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return { error: "Bitte gib Beginn und Ende des Trainings an." };
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    let durationMin = eh * 60 + em - (sh * 60 + sm);
    if (durationMin <= 0) durationMin += 24 * 60;
    training = { weekdays, startTime, durationMin, location: String(form.get("location") ?? "").trim() };
  }
  const db = await getDb();
  const teamId = await createTeam(db, user, { name, sport, isYouth: form.get("isYouth") === "on", training });
  redirect(`/t/${teamId}/einladen?neu=1`);
}
