"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/start", label: "Start", icon: "⌂" },
  { href: "/teams", label: "Teams", icon: "◎" },
  { href: "/ich", label: "Ich", icon: "☺" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-xl">
        {ITEMS.map((it) => {
          const active = path === it.href || path.startsWith(`${it.href}/`) || (it.href === "/teams" && path.startsWith("/t/"));
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center text-xs font-medium ${active ? "text-brand" : "text-muted"}`}
              >
                <span aria-hidden className="text-xl leading-none">
                  {it.icon}
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
