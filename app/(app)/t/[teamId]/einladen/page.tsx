import QRCode from "qrcode";
import { Main, PageHeader } from "@/components/page";
import { loadTeam } from "@/lib/auth/team";
import { getEnv } from "@/lib/db";
import { ShareButtons } from "./share-buttons";

export const metadata = { title: "Einladen" };

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ neu?: string }>;
}) {
  const { teamId } = await params;
  const { neu } = await searchParams;
  const { team } = await loadTeam(teamId, `/t/${teamId}/einladen`);
  const env = await getEnv();
  const url = `${env.APP_URL}/join/${team.inviteCode}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  const text = `Komm in unser Team „${team.name}“ bei spielerminus: ${url}`;
  return (
    <>
      <PageHeader title="Mitglieder einladen" back={`/t/${teamId}`} />
      <Main>
        {neu === "1" && (
          <div className="card border-brand/40 bg-brand/5 p-4">
            <p className="font-semibold">Team ist angelegt ✓</p>
            <p className="text-sm text-muted">Schick jetzt den Link in eure Gruppe. Wer ihn öffnet, ist in einer Minute dabei.</p>
          </div>
        )}
        <ShareButtons url={url} text={text} title={team.name} />
        <div className="card space-y-3 p-4 text-center">
          <p className="text-sm font-medium">Oder im Training scannen lassen</p>
          <div className="mx-auto w-56 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="font-mono text-xs break-all text-muted">{url}</p>
        </div>
      </Main>
    </>
  );
}
