"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/form";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ROLES, type Role } from "@/lib/db/schema";
import { addRosterPerson, setMembershipRoles, setMembershipStatus } from "@/lib/services/teams";

export async function addPersonAction(teamId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const firstName = String(form.get("firstName") ?? "").trim();
  if (!firstName) return { error: "Bitte gib mindestens einen Vornamen an." };
  try {
    await addRosterPerson(await getDb(), { userId: user.id, channel: "app" }, teamId, {
      firstName,
      lastName: String(form.get("lastName") ?? ""),
      isMinor: form.get("isMinor") === "on",
      roles: form.get("isGuest") === "on" ? ["guest"] : ["player"],
      position: String(form.get("position") ?? ""),
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/t/${teamId}/kader`);
  return { ok: `${firstName} ist im Kader.` };
}

export async function setStatusAction(teamId: string, membershipId: string, status: "active" | "inactive") {
  const user = await requireUser();
  await setMembershipStatus(await getDb(), { userId: user.id, channel: "app" }, teamId, membershipId, status);
  revalidatePath(`/t/${teamId}/kader`);
}

export async function setRolesAction(teamId: string, membershipId: string, form: FormData) {
  const user = await requireUser();
  const roles = form.getAll("role").filter((r): r is Role => ROLES.includes(r as Role));
  await setMembershipRoles(await getDb(), { userId: user.id, channel: "app" }, teamId, membershipId, roles.length ? roles : ["player"]);
  revalidatePath(`/t/${teamId}/kader`);
}
