import { Main, PageHeader } from "@/components/page";
import { requireUser } from "@/lib/auth/session";
import { SPORTS } from "@/lib/services/teams";
import { TeamForm } from "./team-form";

export const metadata = { title: "Team anlegen" };

export default async function NewTeamPage() {
  await requireUser("/teams/neu");
  return (
    <>
      <PageHeader title="Team anlegen" back="/teams" />
      <Main>
        <TeamForm sports={SPORTS} />
      </Main>
    </>
  );
}
