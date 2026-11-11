"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { createAbsenceAction } from "./actions";

export function AbsenceForm({ persons, today }: { persons: { id: string; name: string }[]; today: string }) {
  const [state, action] = useActionState(createAbsenceAction, undefined);
  return (
    <form action={action} className="space-y-3">
      {persons.length > 1 ? (
        <div className="flex flex-wrap gap-3 text-sm">
          {persons.map((p) => (
            <label key={p.id} className="flex items-center gap-2">
              <input type="checkbox" name="personId" value={p.id} defaultChecked className="size-5 accent-[var(--brand)]" />
              {p.name}
            </label>
          ))}
        </div>
      ) : (
        persons[0] && <input type="hidden" name="personId" value={persons[0].id} />
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="fromDate">
            Von
          </label>
          <input id="fromDate" name="fromDate" type="date" required min={today} defaultValue={today} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="toDate">
            Bis
          </label>
          <input id="toDate" name="toDate" type="date" min={today} className="input" />
        </div>
      </div>
      <select name="kind" className="input" defaultValue="vacation" aria-label="Grund">
        <option value="vacation">Urlaub</option>
        <option value="sick">Krank</option>
        <option value="injured">Verletzt</option>
        <option value="other">Sonstiges</option>
      </select>
      <FormMessage state={state} />
      <SubmitButton className="btn-secondary w-full" pendingText="Trage ein …">
        Abwesenheit eintragen
      </SubmitButton>
    </form>
  );
}
