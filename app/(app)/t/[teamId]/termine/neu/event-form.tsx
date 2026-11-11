"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { WeekdayPicker } from "@/components/weekday-picker";
import { createEventAction } from "../actions";

const TYPES = [
  ["training", "Training"],
  ["match", "Spiel"],
  ["tournament", "Turnier"],
  ["event", "Event"],
  ["other", "Sonstiges"],
] as const;

export function EventForm({ teamId, today }: { teamId: string; today: string }) {
  const [state, action] = useActionState(createEventAction.bind(null, teamId), undefined);
  const [type, setType] = useState("training");
  const [repeat, setRepeat] = useState(false);
  const isGame = type === "match" || type === "tournament";
  return (
    <form action={action} className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {TYPES.map(([v, l]) => (
          <label key={v}>
            <input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v)} className="peer sr-only" />
            <span className="chip min-h-10 cursor-pointer border border-border px-4 text-sm peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-contrast">{l}</span>
          </label>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="title">
          Titel (optional)
        </label>
        <input id="title" name="title" className="input" placeholder={isGame ? "z. B. Ligaspiel" : "z. B. Training"} />
      </div>
      {isGame && (
        <div>
          <label className="label" htmlFor="opponent">
            Gegner
          </label>
          <input id="opponent" name="opponent" className="input" placeholder="z. B. TV Irgendwo" />
        </div>
      )}
      <label className="flex items-center gap-3 px-1">
        <input type="checkbox" name="repeat" value="weekly" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} className="size-5 accent-[var(--brand)]" />
        <span className="font-medium">Wöchentlich wiederholen</span>
      </label>
      {repeat && <WeekdayPicker />}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label" htmlFor="date">
            {repeat ? "Ab" : "Datum"}
          </label>
          <input id="date" name="date" type="date" className="input" defaultValue={today} required={!repeat} />
        </div>
        {repeat && (
          <div className="col-span-2">
            <label className="label" htmlFor="endsOn">
              Bis (optional)
            </label>
            <input id="endsOn" name="endsOn" type="date" className="input" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="startTime">
            Beginn
          </label>
          <input id="startTime" name="startTime" type="time" className="input" defaultValue="19:00" required />
        </div>
        <div>
          <label className="label" htmlFor="endTime">
            Ende
          </label>
          <input id="endTime" name="endTime" type="time" className="input" defaultValue="20:30" required />
        </div>
        {!repeat && isGame && (
          <div className="col-span-2">
            <label className="label" htmlFor="meetTime">
              Treffpunkt um
            </label>
            <input id="meetTime" name="meetTime" type="time" className="input" />
          </div>
        )}
      </div>
      <div>
        <label className="label" htmlFor="location">
          Ort / Halle
        </label>
        <input id="location" name="location" className="input" placeholder="Adresse oder Hallenname" />
      </div>
      <details className="card px-4 py-3">
        <summary className="cursor-pointer font-medium">Zusage-Einstellungen</summary>
        <div className="mt-4 space-y-4">
          <fieldset className="space-y-2">
            <label className="flex items-center gap-3">
              <input type="radio" name="rsvpMode" value="opt_in" defaultChecked className="size-5 accent-[var(--brand)]" />
              Mitglieder müssen zusagen
            </label>
            <label className="flex items-center gap-3">
              <input type="radio" name="rsvpMode" value="opt_out" className="size-5 accent-[var(--brand)]" />
              Alle sind dabei, wer nicht kann, sagt ab
            </label>
          </fieldset>
          <div>
            <label className="label" htmlFor="deadlineHours">
              Antwortfrist: Stunden vor Beginn
            </label>
            <input id="deadlineHours" name="deadlineHours" type="number" min="0" max="336" inputMode="numeric" className="input" placeholder="keine Frist" />
          </div>
          {!repeat && (
            <div>
              <label className="label" htmlFor="maxParticipants">
                Höchstzahl Teilnehmende
              </label>
              <input id="maxParticipants" name="maxParticipants" type="number" min="1" inputMode="numeric" className="input" placeholder="unbegrenzt" />
            </div>
          )}
        </div>
      </details>
      <FormMessage state={state} />
      <SubmitButton pendingText="Speichere …">{repeat ? "Serie anlegen" : "Termin anlegen"}</SubmitButton>
    </form>
  );
}
