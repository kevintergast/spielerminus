"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { resendCodeAction, verifyCodeAction } from "../actions";

export function CodeForm({ email, next }: { email: string; next: string }) {
  const [state, action] = useActionState(verifyCodeAction, undefined);
  const [resendState, resend] = useActionState(resendCodeAction, undefined);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="code" className="label">
            Code aus der E-Mail
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            required
            autoFocus
            className="input text-center text-2xl tracking-[0.4em]"
            placeholder="••••••"
          />
        </div>
        <FormMessage state={state} />
        <SubmitButton pendingText="Prüfe …">Anmelden</SubmitButton>
      </form>
      <form action={resend} className="text-center">
        <input type="hidden" name="email" value={email} />
        <SubmitButton className="btn-ghost" pendingText="Sende …">
          Neuen Code senden
        </SubmitButton>
        <FormMessage state={resendState} />
      </form>
    </div>
  );
}
