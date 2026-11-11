import { BottomNav } from "@/components/bottom-nav";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
