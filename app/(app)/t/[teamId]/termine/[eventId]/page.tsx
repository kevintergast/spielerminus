import { notFound } from "next/navigation";
import { AttendanceButtons } from "@/components/attendance-buttons";
import { Main, PageHeader, Section } from "@/components/page";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { loadTeam } from "@/lib/auth/team";
import type { Rsvp } from "@/lib/db/schema";
import { nowSeconds } from "@/lib/ids";
import { ATTENDANCE_LABELS, EVENT_TYPE_LABELS, getEventDetail, RSVP_LABELS } from "@/lib/services/events";
import { formatEventTime, formatRelative, unixToZoned } from "@/lib/time";
import { cancelEventAction } from "../actions";

const GROUPS: { key: Rsvp[]; label: string; cls: string }[] = [
  { key: ["accepted"], label: "Dabei", cls: "text-yes" },
  { key: ["maybe"], label: "Unsicher", cls: "text-maybe" },
  { key: ["declined"], label: "Nicht dabei", cls: "text-no" },
  { key: ["pending", "no_response"], label: "Noch offen", cls: "text-open" },
];

const CHANNEL_LABELS: Record<string, string> = { app: "App", push: "Push", link: "Link", api: "API", mcp: "MCP", phone: "Telefon", system: "System" };

export default async function EventPage({ params }: { params: Promise<{ teamId: string; eventId: string }> }) {
  const { teamId, eventId } = await params;
  const { user, db, team } = await loadTeam(teamId, `/t/${teamId}/termine/${eventId}`);
  const detail = await getEventDetail(db, user.id, eventId);
  if (!detail || detail.event.teamId !== teamId) notFound();
  const { event: ev, access, responses, history } = detail;
  const tz = team.timezone;
  const started = ev.startsAt < nowSeconds();
  const isTrainer = access.can("rsvp.others");
  const showResponses = ev.responsesVisible || isTrainer;
  const deadlinePassed = ev.rsvpDeadline != null && ev.rsvpDeadline < nowSeconds();

  return (
    <>
      <PageHeader title={ev.title + (ev.opponent ? ` · ${ev.opponent}` : "")} subtitle={EVENT_TYPE_LABELS[ev.type]} back={`/t/${teamId}`} />
      <Main>
        <div className="card space-y-2 p-4">
          {ev.status === "cancelled" && <p className="chip bg-no-bg text-no">Abgesagt{ev.cancelReason ? `: ${ev.cancelReason}` : ""}</p>}
          <p className="text-lg font-bold">{formatEventTime(ev.startsAt, tz)} – {unixToZoned(ev.endsAt, tz).time}</p>
          {ev.meetAt && <p className="text-sm">Treffpunkt: {unixToZoned(ev.meetAt, tz).time} Uhr</p>}
          {ev.location && (
            <a className="block text-sm text-brand underline" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(ev.location)}`} target="_blank" rel="noopener noreferrer">
              {ev.location}
            </a>
          )}
          {ev.rsvpDeadline && (
            <p className={`text-sm ${deadlinePassed ? "text-no" : "text-muted"}`}>
              Antwortfrist: {formatEventTime(ev.rsvpDeadline, tz)} ({formatRelative(ev.rsvpDeadline)})
            </p>
          )}
          {ev.maxParticipants && <p className="text-sm text-muted">Höchstens {ev.maxParticipants} Teilnehmende</p>}
          {ev.rsvpMode === "opt_out" && <p className="text-sm text-muted">Alle sind eingeplant. Wer nicht kann, sagt ab.</p>}
        </div>

        {ev.mine.length > 0 && ev.status === "scheduled" && (
          <Section title={ev.mine.length > 1 ? "Eure Antworten" : "Deine Antwort"}>
            <div className="card p-4">
              <RsvpButtons eventId={ev.id} persons={ev.mine} showNames={ev.mine.length > 1} locked={started && !isTrainer ? "Der Termin hat begonnen." : undefined} />
            </div>
          </Section>
        )}

        {showResponses && (
          <Section title={`Rückmeldungen (${responses.length})`}>
            <div className="card divide-y divide-border">
              {GROUPS.map((g) => {
                const list = responses.filter((r) => g.key.includes(r.rsvp));
                if (!list.length) return null;
                return (
                  <div key={g.label} className="p-4">
                    <p className={`mb-2 text-sm font-semibold ${g.cls}`}>
                      {g.label} · {list.length}
                    </p>
                    <ul className="space-y-2">
                      {list.map((r) => (
                        <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <span className="min-w-0 flex-1">
                            {r.firstName} {r.lastName}
                            {r.reason && <span className="text-muted"> · {r.reason}</span>}
                            {r.rsvp === "no_response" && <span className="text-muted"> · {RSVP_LABELS.no_response}</span>}
                          </span>
                          {isTrainer && access.can("attendance.write") && started ? (
                            <AttendanceButtons invitationId={r.id} value={r.attendance} />
                          ) : (
                            r.attendance && <span className="chip bg-surface-2 text-muted">{ATTENDANCE_LABELS[r.attendance]}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {isTrainer && history.length > 0 && (
          <Section title="Verlauf">
            <ul className="card divide-y divide-border text-sm">
              {history.slice(0, 50).map(({ c, p, u }) => (
                <li key={c.id} className="px-4 py-2.5">
                  <span className="font-medium">{p.firstName}</span>: {RSVP_LABELS[c.fromRsvp]} → {RSVP_LABELS[c.toRsvp]}
                  {c.reason ? ` (${c.reason})` : ""}
                  <span className="block text-xs text-muted">
                    {formatEventTime(c.at, tz)} · {CHANNEL_LABELS[c.channel]}
                    {u && u.firstName !== p.firstName ? ` · durch ${u.firstName}` : ""}
                    {ev.rsvpDeadline && c.at > ev.rsvpDeadline ? " · nach Frist" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {access.can("event.manage") && ev.status === "scheduled" && !started && (
          <Section title="Termin absagen">
            <form action={cancelEventAction.bind(null, teamId, ev.id)} className="card space-y-3 p-4">
              <input name="reason" className="input" placeholder="Grund (optional), z. B. Halle gesperrt" />
              <button className="btn-secondary w-full text-no">Absagen und Team benachrichtigen</button>
            </form>
          </Section>
        )}
      </Main>
    </>
  );
}
