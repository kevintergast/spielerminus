export type Platform =
  | "in-app"
  | "ios-safari"
  | "ios-other"
  | "android-chromium"
  | "android-firefox"
  | "desktop-chromium"
  | "desktop-safari"
  | "other";

/** Grobe Erkennung, welche Installationsanleitung passt. */
export function detectPlatform(ua: string, maxTouchPoints = 0): Platform {
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  if (/FBAN|FBAV|Instagram|WhatsApp|Line\/|Telegram|Snapchat|; wv\)/.test(ua)) return "in-app";
  if (isIOS) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? "ios-other" : "ios-safari";
  if (/Android/.test(ua)) return /Firefox/.test(ua) ? "android-firefox" : "android-chromium";
  if (/Edg\/|Chrome\//.test(ua) && !/OPR\//.test(ua)) return "desktop-chromium";
  if (/Safari\//.test(ua) && /Macintosh/.test(ua)) return "desktop-safari";
  return "other";
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
