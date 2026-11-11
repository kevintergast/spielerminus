import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "spielerminus",
    short_name: "spielerminus",
    description: "Termine, Zusagen und Fahrgemeinschaften für dein Team",
    start_url: "/start?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6f5",
    theme_color: "#0b7a5f",
    lang: "de",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
