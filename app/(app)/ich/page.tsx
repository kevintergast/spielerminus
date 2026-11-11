import { eq, inArray } from "drizzle-orm";
import { InstallSteps } from "@/components/install-guide";
import { Main, PageHeader, Section } from "@/components/page";
import { PushToggle } from "@/components/push-toggle";
import { requireUser } from "@/lib/auth/session";
import { getDb, getEnv, schema } from "@/lib/db";
import { actingPersonIds } from "@/lib/services/access";
import { ABSENCE_LABELS, listAbsences } from "@/lib/services/events";
import { formatDate, todayIn } from "@/lib/time";
import { ProfileForm } from "../../willkommen/profile-form";
import { AbsenceForm } from "./absence-form";
import { deleteAbsenceAction, logoutAction } from "./actions";

export const metadata = { title: "Ich" };

export default async function MePage() {
  const user = await requireUser("/ich");
  const db = await getDb();
  const env = await getEnv();
  const personIds = await actingPersonIds(db, user.id);
  const persons = personIds.length ? await db.select().from(schema.persons).where(inArray(schema.persons.id, personIds)).all() : [];
  const delegations = await db.select().from(schema.delegations).where(eq(schema.delegations.userId, user.id)).all();
  const label = (id: string) => {
    const p = persons.find((x) => x.id === id);
    const self = delegations.find((d) => d.personId === id)?.kind === "self";
    return self ? "Ich" : (p?.firstName ?? "");
  };
  const absences = await listAbsences(db, user.id);
  const icalUrl = `${env.APP_URL}/api/ical/${user.icalToken}.ics`;
  return (
    <>
      <PageHeader title={`${user.firstName} ${user.lastName}`} subtitle={user.email} />
      <Main>
        <Section title="Benachrichtigungen">
          <div className="card p-4">
            <PushToggle vapidPublicKey={env.VAPID_PUBLIC_KEY} />
          </div>
        </Section>

        <Section title="Abwesenheiten">
          <div className="card space-y-4 p-4">
            {absences.length > 0 && (
              <ul className="space-y-2">
                {absences.map(({ a, p }) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1">
                      <strong>{ABSENCE_LABELS[a.kind]}</strong> {formatDate(a.fromDate)} – {formatDate(a.toDate)}
                      {persons.length > 1 && <span className="text-muted"> · {label(p.id)}</span>}
                    </span>
                    <form action={deleteAbsenceAction.bind(null, a.id)}>
                      <button className="btn-ghost min-h-9 px-2 text-sm text-no">Löschen</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {persons.length > 0 ? (
              <AbsenceForm persons={persons.map((p) => ({ id: p.id, name: label(p.id) }))} today={todayIn()} />
            ) : (
              <p className="text-sm text-muted">Sobald du in einem Team bist, kannst du hier Urlaub oder Krankheit eintragen.</p>
            )}
          </div>
        </Section>

        <Section title="App installieren">
          <div className="card p-4">
            <InstallSteps />
          </div>
        </Section>

        <Section title="Kalender abonnieren">
          <div className="card space-y-2 p-4 text-sm">
            <p className="text-muted">Alle Termine deiner Teams in deinem Handy-Kalender. Der Link ist persönlich, teile ihn nicht.</p>
            <a className="btn-secondary w-full" href={icalUrl.replace(/^https?:/, "webcal:")}>
              Kalender abonnieren
            </a>
            <p className="font-mono text-xs break-all text-muted">{icalUrl}</p>
          </div>
        </Section>

        <Section title="Profil">
          <div className="card p-4">
            <ProfileForm next="/ich" submitLabel="Speichern" defaults={{ firstName: user.firstName, lastName: user.lastName, phone: user.phoneE164 }} />
          </div>
        </Section>

        <form action={logoutAction}>
          <button className="btn-ghost w-full text-no">Abmelden</button>
        </form>
      </Main>
    </>
  );
}
