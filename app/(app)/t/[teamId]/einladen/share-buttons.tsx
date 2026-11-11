"use client";

import { useState } from "react";

export function ShareButtons({ url, text, title }: { url: string; text: string; title: string }) {
  const [copied, setCopied] = useState(false);
  function share() {
    // Natives Teilen (Handy), sonst direkt WhatsApp
    if ("share" in navigator) navigator.share({ title, text, url }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }
  return (
    <div className="space-y-2">
      <button type="button" className="btn-primary w-full" onClick={share}>
        Einladung teilen
      </button>
      <button
        type="button"
        className="btn-secondary w-full"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Kopiert ✓" : "Link kopieren"}
      </button>
    </div>
  );
}
