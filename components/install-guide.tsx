"use client";

import { useEffect, useState } from "react";
import { countInstallHintAction, dismissInstallHintAction } from "@/app/(app)/install-actions";
import { detectPlatform, isStandalone, type Platform } from "@/lib/platform";

const STEPS: Record<Platform, { title: string; steps: string[] }> = {
  "in-app": {
    title: "Öffne den Link zuerst im Browser",
    steps: [
      "Tippe oben rechts auf ⋮ oder ⋯ bzw. unten auf das Kompass-Symbol.",
      "Wähle „In Safari öffnen“ bzw. „Im Browser öffnen“.",
      "Melde dich dort mit deiner E-Mail an. Danach zeigen wir dir, wie du die App installierst.",
    ],
  },
  "ios-safari": {
    title: "So kommt spielerminus auf deinen Home-Bildschirm",
    steps: [
      "Tippe auf das Teilen-Symbol (Quadrat mit Pfeil nach oben). In neueren iOS-Versionen liegt es hinter „⋯“.",
      "Scrolle und wähle „Zum Home-Bildschirm“.",
      "Tippe auf „Hinzufügen“ und öffne spielerminus danach über das neue Symbol.",
    ],
  },
  "ios-other": {
    title: "So kommt spielerminus auf deinen Home-Bildschirm",
    steps: [
      "Tippe in der Adress- oder Menüleiste auf das Teilen-Symbol.",
      "Wähle „Zum Home-Bildschirm“.",
      "Tippe auf „Hinzufügen“ und öffne spielerminus danach über das neue Symbol.",
    ],
  },
  "android-chromium": {
    title: "spielerminus als App installieren",
    steps: ["Tippe oben rechts auf das Menü ⋮.", "Wähle „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.", "Bestätige mit „Installieren“."],
  },
  "android-firefox": {
    title: "spielerminus als App installieren",
    steps: ["Tippe auf das Menü ⋮.", "Wähle „Installieren“ bzw. „Zum Startbildschirm hinzufügen“."],
  },
  "desktop-chromium": {
    title: "spielerminus als App installieren",
    steps: ["Klicke rechts in der Adressleiste auf das Installieren-Symbol oder im Menü ⋮ auf „Installieren“."],
  },
  "desktop-safari": {
    title: "spielerminus ins Dock legen",
    steps: ["Wähle im Menü „Ablage“ → „Zum Dock hinzufügen“."],
  },
  other: {
    title: "spielerminus als App nutzen",
    steps: ["Suche im Browser-Menü nach „Installieren“ oder „Zum Startbildschirm hinzufügen“."],
  },
};

function usePlatform() {
  const [state, setState] = useState<{ platform: Platform; standalone: boolean; canPrompt: boolean } | null>(null);
  useEffect(() => {
    const update = () =>
      setState({
        platform: detectPlatform(navigator.userAgent, navigator.maxTouchPoints),
        standalone: isStandalone(),
        canPrompt: Boolean(window.__bip),
      });
    update();
    window.addEventListener("sm:installable", update);
    return () => window.removeEventListener("sm:installable", update);
  }, []);
  return state;
}

export function InstallSteps({ onDone }: { onDone?: () => void }) {
  const p = usePlatform();
  const [copied, setCopied] = useState(false);
  if (!p) return null;
  if (p.standalone) return <p className="text-sm text-yes">spielerminus ist auf diesem Gerät installiert. ✓</p>;
  // Mit nativem Installationsdialog reicht ein Tipp auf den Button.
  const guide = p.canPrompt
    ? { title: STEPS[p.platform].title, steps: ["Tippe auf „App installieren“.", "Bestätige mit „Installieren“."] }
    : STEPS[p.platform];
  async function install() {
    const bip = window.__bip;
    if (!bip) return;
    await bip.prompt();
    const choice = await bip.userChoice;
    window.__bip = null;
    if (choice.outcome === "accepted") onDone?.();
  }
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{guide.title}</h3>
      <ol className="space-y-3">
        {guide.steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-contrast">{i + 1}</span>
            <span className="pt-0.5 text-sm">{s}</span>
          </li>
        ))}
      </ol>
      {p.canPrompt && (
        <button type="button" onClick={install} className="btn-primary w-full">
          App installieren
        </button>
      )}
      {p.platform === "in-app" && (
        <button
          type="button"
          className="btn-secondary w-full"
          onClick={async () => {
            await navigator.clipboard?.writeText(location.href);
            setCopied(true);
          }}
        >
          {copied ? "Link kopiert ✓" : "Link kopieren"}
        </button>
      )}
      {(p.platform.startsWith("ios") || p.platform === "in-app") && (
        <p className="text-xs text-muted">Auf dem iPhone kommen Benachrichtigungen nur an, wenn spielerminus auf dem Home-Bildschirm liegt. Sonst erinnern wir dich per E-Mail.</p>
      )}
    </div>
  );
}

/** Vollbild-Hinweis direkt nach der ersten Zusage (Onboarding). */
export function InstallGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = usePlatform();
  useEffect(() => {
    if (open && p && !p.standalone) countInstallHintAction();
  }, [open, p]);
  if (!open || !p || p.standalone) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl space-y-5 rounded-t-3xl bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:rounded-3xl">
        <p className="text-sm font-semibold text-yes">Antwort gespeichert ✓</p>
        <InstallSteps onDone={onClose} />
        <button type="button" onClick={onClose} className="btn-ghost w-full">
          Später
        </button>
      </div>
    </div>
  );
}

/** Dezentes Banner auf der Startseite (höchstens bis „Nicht mehr anzeigen“). */
export function InstallBanner({ dismissed }: { dismissed: boolean }) {
  const p = usePlatform();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(dismissed);
  if (hidden || !p || p.standalone) return null;
  return (
    <div className="card space-y-3 border-brand/40 p-4">
      {open ? (
        <InstallSteps onDone={() => setHidden(true)} />
      ) : (
        <div className="space-y-1">
          <p className="font-semibold">spielerminus als App</p>
          <p className="text-sm text-muted">Leg die App auf deinen Home-Bildschirm, dann bekommst du Erinnerungen mit Antwort-Buttons.</p>
        </div>
      )}
      <div className="flex gap-2">
        {!open && (
          <button type="button" className="btn-primary flex-1" onClick={() => setOpen(true)}>
            So geht&apos;s
          </button>
        )}
        <button
          type="button"
          className="btn-ghost flex-1"
          onClick={() => {
            setHidden(true);
            dismissInstallHintAction();
          }}
        >
          Nicht mehr anzeigen
        </button>
      </div>
    </div>
  );
}
