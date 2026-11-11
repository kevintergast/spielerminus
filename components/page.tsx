import Link from "next/link";

export function PageHeader({
  title,
  back,
  subtitle,
  action,
}: {
  title: string;
  back?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-xl items-center gap-2 px-4">
        {back && (
          <Link href={back} aria-label="Zurück" className="-ml-2 flex size-10 items-center justify-center rounded-full text-2xl text-brand">
            ‹
          </Link>
        )}
        <div className="min-w-0 flex-1 py-2">
          <h1 className="truncate text-lg font-bold">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Main({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 pt-4 pb-28">{children}</main>;
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="card px-4 py-6 text-center text-sm text-muted">{children}</p>;
}
