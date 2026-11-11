import { Main, PageHeader, Section } from "@/components/page";
import { loadTeam } from "@/lib/auth/team";
import { ROLES } from "@/lib/db/schema";
import { ROLE_LABELS } from "@/lib/services/access";
import { getRoster } from "@/lib/services/teams";
import { setRolesAction, setStatusAction } from "./actions";
import { AddPersonForm } from "./add-person-form";

export const metadata = { title: "Kader" };

export default async function RosterPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { db, access, team } = await loadTeam(teamId, `/t/${teamId}/kader`);
  const roster = await getRoster(db, teamId);
  const canManage = access.can("member.manage");
  const active = roster.filter((r) => r.status === "active");
  const inactive = roster.filter((r) => r.status === "inactive");

  const Entry = ({ r }: { r: (typeof roster)[number] }) => {
    const reach = r.linkedUsers.some((u) => u.hasPush) ? "Push" : r.linkedUsers.length ? "E-Mail" : "kein Login";
    return (
      <li className="card px-4 py-3">
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 font-bold">{r.firstName.slice(0, 1)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {r.firstName} {r.lastName}
                {team.ownerUserId && r.linkedUsers.some((u) => u.userId === team.ownerUserId && u.kind === "self") ? " · Besitzer" : ""}
              </span>
              <span className="block truncate text-xs text-muted">
                {r.roles.map((x) => ROLE_LABELS[x]).join(", ")}
                {r.position ? ` · ${r.position}` : ""}
                {r.isMinor ? " · minderjährig" : ""}
              </span>
            </span>
            <span className={`chip ${reach === "Push" ? "bg-yes-bg text-yes" : reach === "E-Mail" ? "bg-open-bg text-open" : "bg-maybe-bg text-maybe"}`}>{reach}</span>
          </summary>
          <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
            {r.linkedUsers.length > 0 && (
              <p className="text-muted">
                {r.linkedUsers.map((u) => `${u.name}${u.kind === "guardian" ? " (Elternteil)" : ""}`).join(", ")}
              </p>
            )}
            {canManage && (
              <>
                <form action={setRolesAction.bind(null, teamId, r.membershipId)} className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((role) => (
                      <label key={role} className="flex items-center gap-1.5">
                        <input type="checkbox" name="role" value={role} defaultChecked={r.roles.includes(role)} className="size-4 accent-[var(--brand)]" />
                        {ROLE_LABELS[role]}
                      </label>
                    ))}
                  </div>
                  <button className="btn-secondary min-h-10 w-full text-sm">Rollen speichern</button>
                </form>
                <form action={setStatusAction.bind(null, teamId, r.membershipId, r.status === "active" ? "inactive" : "active")}>
                  <button className="btn-ghost min-h-10 w-full text-sm">{r.status === "active" ? "Auf inaktiv setzen" : "Wieder aktiv setzen"}</button>
                </form>
              </>
            )}
          </div>
        </details>
      </li>
    );
  };

  return (
    <>
      <PageHeader title="Kader" subtitle={`${active.length} aktiv`} back={`/t/${teamId}`} />
      <Main>
        <ul className="space-y-2">
          {active.map((r) => (
            <Entry key={r.membershipId} r={r} />
          ))}
        </ul>
        {inactive.length > 0 && (
          <Section title="Inaktiv">
            <ul className="space-y-2 opacity-70">
              {inactive.map((r) => (
                <Entry key={r.membershipId} r={r} />
              ))}
            </ul>
          </Section>
        )}
        {canManage && (
          <Section title="Person hinzufügen">
            <div className="card p-4">
              <AddPersonForm teamId={teamId} isYouth={team.isYouth} />
            </div>
          </Section>
        )}
      </Main>
    </>
  );
}
