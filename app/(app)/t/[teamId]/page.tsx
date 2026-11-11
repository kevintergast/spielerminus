import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { Empty, Main, PageHeader, Section } from "@/components/page";
import { loadTeam } from "@/lib/auth/team";
import { listTeamEvents } from "@/lib/services/events";
import { nowSeconds } from "@/lib/ids";
import { OnboardingHint } from "./onboarding-hint";

export const metadata = { title: "Team" };

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ neu?: string; vergangen?: string }>;
}) {
  const { teamId } = await params;
  const { neu, vergangen } = await searchParams;
  const { user, db, access, team } = await loadTeam(teamId, `/t/${teamId}`);
  const past = vergangen === "1";
  const events = past
    ? await listTeamEvents(db, user.id, teamId, { past: true, limit: 30 })
    : await listTeamEvents(db, user.id, teamId, { to: nowSeconds() + 60 * 86400 });
  const answered = events.reduce((n, e) => n + e.mine.filter((m) => m.rsvp !== "pending").length, 0);
  return (
    <>
      <PageHeader title={team.name} subtitle={`${team.sport}${team.isYouth ? " · Jugend" : ""}`} back="/teams" />
      <Main>
        {neu === "1" && <OnboardingHint teamName={team.name} answered={answered} />}
        <nav className="grid grid-cols-3 gap-2 text-center text-sm font-semibold">
          <Link href={`/t/${teamId}/kader`} className="card py-3">
            Kader
          </Link>
          <Link href={`/t/${teamId}/einladen`} className="card py-3">
            Einladen
          </Link>
          {access.can("event.manage") ? (
            <Link href={`/t/${teamId}/termine/neu`} className="card py-3 text-brand">
              + Termin
            </Link>
          ) : (
            <Link href="/ich" className="card py-3">
              Abwesend?
            </Link>
          )}
        </nav>
        <Section
          title={past ? "Vergangene Termine" : "Kommende Termine"}
          action={
            <Link href={past ? `/t/${teamId}` : `/t/${teamId}?vergangen=1`} className="text-sm font-medium text-brand">
              {past ? "Kommende" : "Vergangene"}
            </Link>
          }
        >
          {events.length ? (
            <div className="space-y-3">
              {events.map((ev) => (
                <EventCard key={ev.id} ev={ev} tz={team.timezone} />
              ))}
            </div>
          ) : (
            <Empty>{past ? "Noch keine vergangenen Termine." : "Keine Termine geplant."}</Empty>
          )}
        </Section>
      </Main>
    </>
  );
}
