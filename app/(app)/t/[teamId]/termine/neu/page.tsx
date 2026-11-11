import { notFound } from "next/navigation";
import { Main, PageHeader } from "@/components/page";
import { loadTeam } from "@/lib/auth/team";
import { todayIn } from "@/lib/time";
import { EventForm } from "./event-form";

export const metadata = { title: "Neuer Termin" };

export default async function NewEventPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { access, team } = await loadTeam(teamId, `/t/${teamId}/termine/neu`);
  if (!access.can("event.manage")) notFound();
  return (
    <>
      <PageHeader title="Neuer Termin" back={`/t/${teamId}`} />
      <Main>
        <EventForm teamId={teamId} today={todayIn(team.timezone)} />
      </Main>
    </>
  );
}
