"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/form";
import { isValidEmail, normalizeEmail, requestLoginCode, verifyLoginCode } from "@/lib/auth/login";
import { createSession } from "@/lib/auth/session";

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/start";
}

export async function requestCodeAction(_: FormState, form: FormData): Promise<FormState> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  if (!isValidEmail(email)) return { error: "Bitte gib eine gültige E-Mail-Adresse ein." };
  try {
    await requestLoginCode(email);
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(`/login/code?email=${encodeURIComponent(email)}&next=${encodeURIComponent(safeNext(form.get("next")))}`);
}

export async function verifyCodeAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  let userId: string;
  try {
    userId = await verifyLoginCode(email, String(form.get("code") ?? ""));
  } catch (e) {
    return { error: (e as Error).message };
  }
  await createSession(userId);
  redirect(safeNext(form.get("next")));
}

export async function resendCodeAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    await requestLoginCode(String(form.get("email") ?? ""));
    return { ok: "Neuer Code ist unterwegs." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
