"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/form";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getTeamByInviteCode, joinTeam } from "@/lib/services/teams";

export async function joinAction(code: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const db = await getDb();
  const team = await getTeamByInviteCode(db, code);
  if (!team) return { error: "Diese Einladung gibt es nicht mehr." };
  try {
    if (form.get("mode") === "guardian") {
      const children: { personId?: string; firstName?: string; lastName?: string }[] = form
        .getAll("childId")
        .map((id) => ({ personId: String(id) }));
      const newFirst = String(form.get("childFirstName") ?? "").trim();
      if (newFirst) children.push({ firstName: newFirst, lastName: String(form.get("childLastName") ?? "") });
      if (!children.length) return { error: "Bitte wähle dein Kind aus oder trag es ein." };
      await joinTeam(db, user, team.id, { mode: "guardian", children });
    } else {
      const personId = String(form.get("personId") ?? "");
      await joinTeam(db, user, team.id, { mode: "self", personId: personId && personId !== "new" ? personId : undefined });
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(`/t/${team.id}?neu=1`);
}
