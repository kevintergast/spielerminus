import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/start" } = await searchParams;
  if (await getSessionUser()) redirect(next);
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-10">
      <div className="space-y-2 text-center">
        <p className="text-3xl font-black tracking-tight text-brand">spielerminus</p>
        <h1 className="text-xl font-bold">Anmelden oder registrieren</h1>
      </div>
      <LoginForm next={next} />
    </main>
  );
}
