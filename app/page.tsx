import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function Home() {
  if (await getSessionUser()) redirect("/start");
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="space-y-4">
        <p className="text-3xl font-black tracking-tight text-brand">spielerminus</p>
        <h1 className="text-4xl leading-tight font-black">Dein Team. Ohne Abo-Schranken.</h1>
        <p className="text-lg text-muted">Termine, Zu- und Absagen, Erinnerungen mit Antwort-Buttons und Abwesenheiten. Alle Funktionen für alle Teams, schnell auf jedem Handy.</p>
      </div>
      <div className="space-y-3">
        <Link href="/login?next=/teams/neu" className="btn-primary w-full">
          Team anlegen
        </Link>
        <Link href="/login" className="btn-secondary w-full">
          Anmelden
        </Link>
      </div>
      <p className="text-sm text-muted">Du hast einen Einladungslink? Öffne ihn einfach, du landest direkt in deinem Team.</p>
    </main>
  );
}
