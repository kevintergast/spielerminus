import type { Metadata, Viewport } from "next";
import { PwaSetup } from "@/components/pwa-setup";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "spielerminus", template: "%s · spielerminus" },
  description: "Teamorganisation ohne Abo-Schranken: Termine, Zusagen, Fahrgemeinschaften und Teamkasse.",
  applicationName: "spielerminus",
  appleWebApp: { capable: true, title: "spielerminus", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1412" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <PwaSetup />
      </body>
    </html>
  );
}
