"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { WeekdayPicker } from "@/components/weekday-picker";
import { createTeamAction } from "../actions";

export function TeamForm({ sports }: { sports: readonly string[] }) {
  const [state, action] = useActionState(createTeamAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <fieldset className="space-y-4">
        <div>
          <label className="label" htmlFor="name">
            Teamname
          </label>
          <input id="name" name="name" required className="input" placeholder="z. B. VC Deshalb 1. Damen" />
        </div>
        <div>
          <label className="label" htmlFor="sport">
            Sportart
          </label>
          <select id="sport" name="sport" className="input" defaultValue="Volleyball">
            {sports.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <label className="card flex items-center gap-3 px-4 py-3">
          <input type="checkbox" name="isYouth" className="size-5 accent-[var(--brand)]" />
          <span>
            <span className="block font-medium">Jugendteam</span>
            <span className="block text-xs text-muted">Eltern melden ihre Kinder an und antworten für sie.</span>
          </span>
        </label>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold">Erstes Training (optional)</legend>
        <WeekdayPicker />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="startTime">
              Beginn
            </label>
            <input id="startTime" name="startTime" type="time" className="input" defaultValue="19:00" />
          </div>
          <div>
            <label className="label" htmlFor="endTime">
              Ende
            </label>
            <input id="endTime" name="endTime" type="time" className="input" defaultValue="20:30" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="location">
            Ort
          </label>
          <input id="location" name="location" className="input" placeholder="z. B. Sporthalle am Deich" />
        </div>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton pendingText="Lege an …">Team anlegen</SubmitButton>
    </form>
  );
}
