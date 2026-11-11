"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { requestCodeAction } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(requestCodeAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">
          E-Mail-Adresse
        </label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required className="input" placeholder="du@beispiel.de" autoFocus />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Code wird gesendet …">Code per E-Mail senden</SubmitButton>
      <p className="text-center text-xs text-muted">Kein Passwort nötig. Du bekommst einen 6-stelligen Code.</p>
    </form>
  );
}
