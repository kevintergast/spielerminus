"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { addPersonAction } from "./actions";

export function AddPersonForm({ teamId, isYouth }: { teamId: string; isYouth: boolean }) {
  const [state, action] = useActionState(addPersonAction.bind(null, teamId), undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input name="firstName" required placeholder="Vorname" className="input" aria-label="Vorname" />
        <input name="lastName" placeholder="Nachname" className="input" aria-label="Nachname" />
      </div>
      <input name="position" placeholder="Position (optional)" className="input" aria-label="Position" />
      <div className="flex flex-wrap gap-4 px-1 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isMinor" defaultChecked={isYouth} className="size-5 accent-[var(--brand)]" /> minderjährig
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isGuest" className="size-5 accent-[var(--brand)]" /> Gastspieler
        </label>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-secondary w-full" pendingText="Füge hinzu …">
        Zum Kader hinzufügen
      </SubmitButton>
    </form>
  );
}
