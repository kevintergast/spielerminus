import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { Empty, Main, PageHeader, Section } from "@/components/page";
import { InstallBanner } from "@/components/install-guide";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getHome } from "@/lib/services/home";

export const metadata = { title: "Start" };

export default async function StartPage() {
  const user = await requireUser("/start");
  const db = await getDb();
  const { teams, events, openCount } = await getHome(db, user.id);
  const teamName = new Map(teams.map((t) => [t.id, t]));
  return (
    <>
      <PageHeader title={`Hallo ${user.firstName}`} subtitle={openCount ? `${openCount} Termin${openCount === 1 ? "" : "e"} ohne Antwort` : "Alles beantwortet"} />
      <Main>
        <InstallBanner dismissed={Boolean(user.installHintDismissedAt)} />
        {teams.length === 0 ? (
          <div className="card space-y-4 p-5">
            <h2 className="text-lg font-bold">Los geht&apos;s</h2>
            <p className="text-sm text-muted">Leg ein Team an oder öffne den Einladungslink, den du von deinem Team bekommen hast.</p>
            <Link href="/teams/neu" className="btn-primary w-full">
              Team anlegen
            </Link>
          </div>
        ) : (
          <Section title="Nächste Termine">
            {events.length ? (
              <div className="space-y-3">
                {events.map((ev) => (
                  <EventCard key={ev.id} ev={ev} tz={teamName.get(ev.teamId)?.timezone ?? "Europe/Berlin"} teamName={teams.length > 1 ? teamName.get(ev.teamId)?.name : undefined} />
                ))}
              </div>
            ) : (
              <Empty>In den nächsten zwei Wochen stehen keine Termine an.</Empty>
            )}
          </Section>
        )}
      </Main>
    </>
  );
}
