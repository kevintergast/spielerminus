"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { saveProfileAction } from "./actions";

export function ProfileForm({
  next,
  defaults,
  submitLabel = "Weiter",
}: {
  next: string;
  defaults: { firstName: string; lastName: string; phone: string };
  submitLabel?: string;
}) {
  const [state, action] = useActionState(saveProfileAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="firstName">
            Vorname
          </label>
          <input id="firstName" name="firstName" autoComplete="given-name" required className="input" defaultValue={defaults.firstName} />
        </div>
        <div>
          <label className="label" htmlFor="lastName">
            Nachname
          </label>
          <input id="lastName" name="lastName" autoComplete="family-name" required className="input" defaultValue={defaults.lastName} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="phone">
          Handynummer
        </label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required className="input" placeholder="0151 23456789" defaultValue={defaults.phone} />
        <p className="mt-1.5 text-xs text-muted">Nur für dein Team sichtbar. Anrufe gibt es nur, wenn du sie extra erlaubst.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Speichere …">{submitLabel}</SubmitButton>
    </form>
  );
}
