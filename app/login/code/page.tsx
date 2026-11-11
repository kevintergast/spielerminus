import Link from "next/link";
import { redirect } from "next/navigation";
import { CodeForm } from "./code-form";

export const metadata = { title: "Code eingeben" };

export default async function CodePage({ searchParams }: { searchParams: Promise<{ email?: string; next?: string }> }) {
  const { email, next = "/start" } = await searchParams;
  if (!email) redirect("/login");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-bold">Schau in dein Postfach</h1>
        <p className="text-sm text-muted">
          Wir haben einen Code an <strong className="text-text">{email}</strong> geschickt.
        </p>
      </div>
      <CodeForm email={email} next={next} />
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-center text-sm text-muted underline">
        Andere E-Mail-Adresse verwenden
      </Link>
    </main>
  );
}
