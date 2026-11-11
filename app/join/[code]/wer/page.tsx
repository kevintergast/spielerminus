import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getTeamAccess } from "@/lib/services/access";
import { getTeamByInviteCode, unclaimedPersons } from "@/lib/services/teams";
import { JoinForm } from "./join-form";

export const metadata = { title: "Beitreten" };

export default async function WhoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser(`/join/${code}/wer`);
  const db = await getDb();
  const team = await getTeamByInviteCode(db, code);
  if (!team) notFound();
  const access = await getTeamAccess(db, user.id, team.id);
  if (access && !team.isYouth) redirect(`/t/${team.id}`);
  const strip = (l: Awaited<ReturnType<typeof unclaimedPersons>>) => l.map(({ personId, firstName, lastName }) => ({ personId, firstName, lastName }));
  const adults = team.isYouth ? [] : strip(await unclaimedPersons(db, team.id, false));
  const kids = team.isYouth ? strip(await unclaimedPersons(db, team.id, true)) : [];
  return (
    <main className="mx-auto w-full max-w-sm flex-1 space-y-6 px-4 py-10">
      <h1 className="text-xl font-bold">{team.name}</h1>
      <JoinForm code={team.inviteCode} isYouth={team.isYouth} adults={adults} kids={kids} userName={`${user.firstName} ${user.lastName}`} />
    </main>
  );
}
