"use client";

import { useEffect, useState } from "react";
import { detectPlatform, isStandalone } from "@/lib/platform";

function urlB64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
      if (platform.startsWith("ios") && !isStandalone()) return setState("needs-install");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(vapidPublicKey) });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          platform: detectPlatform(navigator.userAgent, navigator.maxTouchPoints),
          installed: isStandalone(),
        }),
      });
      setState("on");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
    setBusy(false);
  }

  const text: Record<State, string> = {
    loading: "Prüfe …",
    unsupported: "Dieser Browser unterstützt keine Benachrichtigungen. Wir erinnern dich per E-Mail.",
    "needs-install": "Auf dem iPhone gehen Benachrichtigungen nur, wenn spielerminus auf dem Home-Bildschirm liegt. Bis dahin erinnern wir dich per E-Mail.",
    denied: "Benachrichtigungen sind in den Browser-Einstellungen blockiert. Wir erinnern dich per E-Mail.",
    off: "Aus. Du bekommst Erinnerungen per E-Mail.",
    on: "An. Erinnerungen kommen mit Antwort-Buttons aufs Gerät.",
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{text[state]}</p>
      {state === "off" && (
        <button type="button" onClick={enable} disabled={busy} className="btn-primary w-full">
          Benachrichtigungen aktivieren
        </button>
      )}
      {state === "on" && (
        <button type="button" onClick={disable} disabled={busy} className="btn-secondary w-full">
          Auf diesem Gerät abschalten
        </button>
      )}
    </div>
  );
}
