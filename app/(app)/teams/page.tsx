import Link from "next/link";
import { Empty, Main, PageHeader } from "@/components/page";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listMyTeams } from "@/lib/services/teams";

export const metadata = { title: "Teams" };

export default async function TeamsPage() {
  const user = await requireUser("/teams");
  const teams = await listMyTeams(await getDb(), user.id);
  return (
    <>
      <PageHeader title="Deine Teams" action={<Link href="/teams/neu" className="btn-ghost min-h-10 px-3 text-sm">+ Neu</Link>} />
      <Main>
        {teams.length ? (
          <ul className="space-y-2">
            {teams.map((t) => (
              <li key={t.id}>
                <Link href={`/t/${t.id}`} className="card flex items-center gap-3 px-4 py-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-lg font-black text-brand-contrast">{t.name.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{t.name}</span>
                    <span className="block text-xs text-muted">
                      {t.sport}
                      {t.isYouth ? " · Jugend" : ""}
                    </span>
                  </span>
                  <span className="text-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Du bist noch in keinem Team.</Empty>
        )}
        <Link href="/teams/neu" className="btn-secondary w-full">
          Neues Team anlegen
        </Link>
      </Main>
    </>
  );
}
