import { redirect } from "next/navigation";
import { getSessionUser, isProfileComplete } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Willkommen" };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/start" } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (isProfileComplete(user)) redirect(next);
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Willkommen!</h1>
        <p className="text-sm text-muted">Noch kurz zu dir, damit dein Team weiß, wer du bist.</p>
      </div>
      <ProfileForm next={next} defaults={{ firstName: user.firstName, lastName: user.lastName, phone: user.phoneE164 }} />
    </main>
  );
}
