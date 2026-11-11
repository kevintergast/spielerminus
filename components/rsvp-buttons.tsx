"use client";

import { useOptimistic, useState, useTransition } from "react";
import { rsvpAction } from "@/app/(app)/actions";
import type { Rsvp } from "@/lib/db/schema";

const REASONS = ["Krank", "Verletzt", "Arbeit", "Schule", "Urlaub", "Privat"];

type Person = { personId: string; firstName: string; rsvp: Rsvp; reason: string | null };

export function RsvpButtons({
  eventId,
  persons,
  showNames,
  locked,
  onAnswered,
}: {
  eventId: string;
  persons: Person[];
  showNames: boolean;
  locked?: string;
  onAnswered?: () => void;
}) {
  return (
    <div className="space-y-3">
      {persons.map((p) => (
        <PersonRsvp key={p.personId} eventId={eventId} person={p} showName={showNames} locked={locked} onAnswered={onAnswered} />
      ))}
    </div>
  );
}

function PersonRsvp({
  eventId,
  person,
  showName,
  locked,
  onAnswered,
}: {
  eventId: string;
  person: Person;
  showName: boolean;
  locked?: string;
  onAnswered?: () => void;
}) {
  const [state, setOptimistic] = useOptimistic({ rsvp: person.rsvp, reason: person.reason });
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function answer(rsvp: "accepted" | "declined" | "maybe", reason: string | null = null) {
    setError(null);
    startTransition(async () => {
      setOptimistic({ rsvp, reason });
      const res = await rsvpAction({ eventId, personId: person.personId, rsvp, reason });
      if (!res.ok) setError(res.error);
      else onAnswered?.();
    });
  }

  const btn = "flex-1 min-h-11 rounded-xl border text-sm font-semibold transition active:scale-[0.97]";
  return (
    <div className="space-y-2">
      {showName && <p className="text-sm font-medium">{person.firstName}</p>}
      {locked ? (
        <p className="text-sm text-muted">{locked}</p>
      ) : (
        <div className="flex gap-2" role="group" aria-label={`Antwort für ${person.firstName}`}>
          <button
            type="button"
            onClick={() => answer("accepted")}
            aria-pressed={state.rsvp === "accepted"}
            className={`${btn} ${state.rsvp === "accepted" ? "border-yes bg-yes text-white" : "border-border bg-surface text-yes"}`}
          >
            ✓ Dabei
          </button>
          <button
            type="button"
            onClick={() => answer("maybe")}
            aria-pressed={state.rsvp === "maybe"}
            className={`${btn} max-w-16 ${state.rsvp === "maybe" ? "border-maybe bg-maybe text-white" : "border-border bg-surface text-maybe"}`}
            aria-label="Unsicher"
          >
            ?
          </button>
          <button
            type="button"
            onClick={() => answer("declined", state.rsvp === "declined" ? state.reason : null)}
            aria-pressed={state.rsvp === "declined"}
            className={`${btn} ${state.rsvp === "declined" ? "border-no bg-no text-white" : "border-border bg-surface text-no"}`}
          >
            ✕ Nicht dabei
          </button>
        </div>
      )}
      {!locked && state.rsvp === "declined" && (
        <div className="flex flex-wrap gap-1.5" aria-label="Grund (optional)">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => answer("declined", state.reason === r ? null : r)}
              className={`chip min-h-8 border ${state.reason === r ? "border-no bg-no-bg text-no" : "border-border text-muted"}`}
            >
              {r}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-sm font-medium text-no">{error}</p>}
    </div>
  );
}
