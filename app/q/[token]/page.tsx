import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { EVENT_TYPE_LABELS, RSVP_LABELS } from "@/lib/services/events";
import { loadActionToken, QUICK_ACTIONS, type QuickAction, redeemActionToken } from "@/lib/services/quick-actions";
import { formatEventTime } from "@/lib/time";

export const metadata = { title: "Schnellantwort", robots: { index: false } };

export default async function QuickPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ fehler?: string }>;
}) {
  const { token } = await params;
  const { fehler } = await searchParams;
  const db = await getDb();
  const data = await loadActionToken(db, token);
  if (!data?.event || !data.team || !data.person) notFound();
  const { event: ev, team, person, invitation } = data;

  async function answer(form: FormData) {
    "use server";
    const action = String(form.get("action")) as QuickAction;
    if (!QUICK_ACTIONS.includes(action)) return;
    const { redirect } = await import("next/navigation");
    try {
      await redeemActionToken(await getDb(), token, action, "link");
    } catch (e) {
      redirect(`/q/${token}?fehler=${encodeURIComponent((e as Error).message)}`);
    }
    redirect(`/q/${token}`);
  }

  const used = Boolean(data.token.usedAt);
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="card space-y-1 p-5">
        <p className="text-sm text-muted">{team.name}</p>
        <h1 className="text-xl font-bold">
          {ev.title === EVENT_TYPE_LABELS[ev.type] ? ev.title : `${EVENT_TYPE_LABELS[ev.type]}: ${ev.title}`}
          {ev.opponent ? ` · ${ev.opponent}` : ""}
        </h1>
        <p className="text-sm">{formatEventTime(ev.startsAt, team.timezone)}</p>
        {ev.location && <p className="text-sm text-muted">{ev.location}</p>}
        <p className="pt-2 text-sm">
          Antwort für <strong>{person.firstName}</strong>: {invitation ? RSVP_LABELS[invitation.rsvp] : "–"}
        </p>
      </div>
      {fehler && <p className="rounded-xl bg-no-bg px-4 py-3 text-sm font-medium text-no">{fehler}</p>}
      {used ? (
        <p className="rounded-xl bg-yes-bg px-4 py-3 text-center font-semibold text-yes">Gespeichert ✓</p>
      ) : data.expired || ev.status === "cancelled" ? (
        <p className="text-center text-sm text-muted">{ev.status === "cancelled" ? "Der Termin wurde abgesagt." : "Dieser Link ist abgelaufen."}</p>
      ) : (
        <form action={answer} className="grid grid-cols-2 gap-3">
          <button name="action" value="accepted" className="btn min-h-16 bg-yes text-lg text-white">
            ✓ Dabei
          </button>
          <button name="action" value="declined" className="btn min-h-16 bg-no text-lg text-white">
            ✕ Nicht dabei
          </button>
        </form>
      )}
      <Link href={`/t/${team.id}/termine/${ev.id}`} className="btn-ghost w-full">
        In der App öffnen
      </Link>
    </main>
  );
}
