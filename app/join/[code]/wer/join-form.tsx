"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { joinAction } from "../actions";

type P = { personId: string; firstName: string; lastName: string };

export function JoinForm({
  code,
  isYouth,
  adults,
  kids,
  userName,
}: {
  code: string;
  isYouth: boolean;
  adults: P[];
  kids: P[];
  userName: string;
}) {
  const [state, action] = useActionState(joinAction.bind(null, code), undefined);
  if (isYouth)
    return (
      <form action={action} className="space-y-4">
        <input type="hidden" name="mode" value="guardian" />
        <p className="font-semibold">Welches Kind möchtest du anmelden?</p>
        {kids.length > 0 && (
          <ul className="space-y-2">
            {kids.map((c) => (
              <li key={c.personId}>
                <label className="card flex items-center gap-3 px-4 py-3">
                  <input type="checkbox" name="childId" value={c.personId} className="size-5 accent-[var(--brand)]" />
                  {c.firstName} {c.lastName}
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="card space-y-2 p-4">
          <p className="text-sm font-medium">{kids.length ? "Nicht dabei? Kind neu eintragen" : "Kind eintragen"}</p>
          <div className="grid grid-cols-2 gap-2">
            <input name="childFirstName" placeholder="Vorname" className="input" aria-label="Vorname des Kindes" />
            <input name="childLastName" placeholder="Nachname" className="input" aria-label="Nachname des Kindes" />
          </div>
        </div>
        <p className="text-xs text-muted">Du antwortest für dein Kind. Weitere Elternteile können sich mit demselben Link anmelden.</p>
        <FormMessage state={state} />
        <SubmitButton pendingText="Melde an …">Anmelden</SubmitButton>
      </form>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="mode" value="self" />
      <p className="font-semibold">Wer bist du?</p>
      <ul className="space-y-2">
        {adults.map((p) => (
          <li key={p.personId}>
            <label className="card flex items-center gap-3 px-4 py-3">
              <input type="radio" name="personId" value={p.personId} className="size-5 accent-[var(--brand)]" />
              {p.firstName} {p.lastName}
            </label>
          </li>
        ))}
        <li>
          <label className="card flex items-center gap-3 px-4 py-3">
            <input type="radio" name="personId" value="new" defaultChecked className="size-5 accent-[var(--brand)]" />
            <span>
              Ich bin neu: <strong>{userName}</strong>
            </span>
          </label>
        </li>
      </ul>
      <FormMessage state={state} />
      <SubmitButton pendingText="Trete bei …">Beitreten</SubmitButton>
    </form>
  );
}
