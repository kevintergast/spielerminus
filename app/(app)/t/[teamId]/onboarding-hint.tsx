"use client";

import { useState } from "react";
import { InstallGuideModal } from "@/components/install-guide";

/**
 * Nach dem Beitritt: Hinweis zur ersten Zusage. Sobald die erste Antwort gespeichert ist
 * (die Seite wird neu geladen und es gibt mehr beantwortete Termine), erscheint die Homescreen-Anleitung.
 */
export function OnboardingHint({ teamName, answered }: { teamName: string; answered: number }) {
  const [initial] = useState(answered);
  const [closed, setClosed] = useState(false);
  const showGuide = answered > initial && !closed;
  return (
    <>
      {answered === initial && (
        <div className="card border-brand/40 bg-brand/5 p-4">
          <p className="font-semibold">Willkommen bei {teamName}!</p>
          <p className="text-sm text-muted">Sag gleich für den nächsten Termin zu oder ab.</p>
        </div>
      )}
      <InstallGuideModal
        open={showGuide}
        onClose={() => setClosed(true)}
      />
    </>
  );
}
