import { and, asc, eq, gte } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { nowSeconds } from "@/lib/ids";
import { EVENT_TYPE_LABELS } from "@/lib/services/events";
import { getTeamByInviteCode } from "@/lib/services/teams";
import { formatEventTime } from "@/lib/time";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const team = await getTeamByInviteCode(await getDb(), code);
  return team
    ? { title: `Einladung: ${team.name}`, description: `Tritt ${team.name} bei spielerminus bei und sag für Termine zu.` }
    : { title: "Einladung" };
}

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = await getDb();
  const team = await getTeamByInviteCode(db, code);
  if (!team) notFound();
  const next = await db
    .select()
    .from(schema.events)
    .where(and(eq(schema.events.teamId, team.id), gte(schema.events.startsAt, nowSeconds()), eq(schema.events.status, "scheduled")))
    .orderBy(asc(schema.events.startsAt))
    .get();
  const user = await getSessionUser();
  const target = `/join/${team.inviteCode}/wer`;
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <p className="text-center text-sm font-semibold text-brand">spielerminus</p>
      <div className="card space-y-4 p-6 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand text-3xl font-black text-brand-contrast">{team.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-sm text-muted">
            {team.sport}
            {team.isYouth ? " · Jugendteam" : ""}
          </p>
        </div>
        {next && (
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
            Nächster Termin: <strong>{EVENT_TYPE_LABELS[next.type]}</strong>, {formatEventTime(next.startsAt, team.timezone)}
          </p>
        )}
      </div>
      <Link href={user ? target : `/login?next=${encodeURIComponent(target)}`} className="btn-primary w-full">
        {team.isYouth ? "Mein Kind anmelden" : "Beitreten"}
      </Link>
      <p className="text-center text-xs text-muted">Kostenlos, ohne Passwort. Du brauchst nur deine E-Mail-Adresse.</p>
    </main>
  );
}
