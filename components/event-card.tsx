import Link from "next/link";
import type { EventListItem } from "@/lib/services/events";
import { EVENT_TYPE_LABELS } from "@/lib/services/events";
import { formatEventTime, formatRelative } from "@/lib/time";
import { nowSeconds } from "@/lib/ids";
import { RsvpButtons } from "./rsvp-buttons";

const TYPE_STYLE: Record<string, string> = {
  training: "bg-surface-2 text-text",
  match: "bg-brand text-brand-contrast",
  tournament: "bg-brand-strong text-brand-contrast",
  event: "bg-maybe-bg text-maybe",
  other: "bg-surface-2 text-muted",
};

export function EventCard({
  ev,
  teamName,
  tz,
  showNames,
}: {
  ev: EventListItem;
  teamName?: string;
  tz: string;
  showNames?: boolean;
}) {
  const href = `/t/${ev.teamId}/termine/${ev.id}`;
  const started = ev.startsAt < nowSeconds();
  const deadlinePassed = ev.rsvpDeadline != null && ev.rsvpDeadline < nowSeconds();
  const cancelled = ev.status === "cancelled";
  return (
    <article className={`card overflow-hidden ${cancelled ? "opacity-60" : ""}`}>
      <Link href={href} className="block px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 text-xs">
          <span className={`chip ${TYPE_STYLE[ev.type]}`}>{EVENT_TYPE_LABELS[ev.type]}</span>
          {teamName && <span className="truncate text-muted">{teamName}</span>}
          <span className="ml-auto shrink-0 text-muted">{formatRelative(ev.startsAt)}</span>
        </div>
        <h3 className={`mt-1.5 text-base font-bold ${cancelled ? "line-through" : ""}`}>
          {ev.title}
          {ev.opponent ? ` · ${ev.opponent}` : ""}
        </h3>
        <p className="text-sm text-muted">
          {formatEventTime(ev.startsAt, tz)}
          {ev.location ? ` · ${ev.location}` : ""}
        </p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-medium whitespace-nowrap">
          <span className="text-yes">{ev.counts.accepted} dabei</span>
          <span className="text-no">{ev.counts.declined} nicht</span>
          {ev.counts.maybe > 0 && <span className="text-maybe">{ev.counts.maybe} unsicher</span>}
          <span className="text-open">{ev.counts.pending + ev.counts.no_response} offen</span>
          {ev.rsvpDeadline && !deadlinePassed && !started && (
            <span className="ml-auto text-muted">Frist {formatRelative(ev.rsvpDeadline)}</span>
          )}
        </p>
      </Link>
      {ev.mine.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          {cancelled ? (
            <p className="text-sm font-medium text-no">Abgesagt{ev.cancelReason ? `: ${ev.cancelReason}` : ""}</p>
          ) : (
            <RsvpButtons
              eventId={ev.id}
              persons={ev.mine}
              showNames={showNames ?? ev.mine.length > 1}
              locked={started ? "Termin läuft oder ist vorbei." : undefined}
            />
          )}
        </div>
      )}
    </article>
  );
}
