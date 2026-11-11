// Zeitzonen-Helfer ohne Bibliothek. Termine werden als UTC-Sekunden gespeichert
// und in der Zeitzone des Teams angezeigt bzw. erzeugt.

export const DEFAULT_TZ = "Europe/Berlin";

function partsAt(instantMs: number, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date(instantMs)).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

function offsetMs(instantMs: number, tz: string): number {
  const p = partsAt(instantMs, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

/** Lokales Datum + Uhrzeit in der Zeitzone → UTC-Sekunden. */
export function zonedToUnix(date: string, time: string, tz = DEFAULT_TZ): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let result = guess - offsetMs(guess, tz);
  // zweiter Durchlauf für Tage mit Zeitumstellung
  result = guess - offsetMs(result, tz);
  return Math.floor(result / 1000);
}

/** UTC-Sekunden → lokales Datum "YYYY-MM-DD" und Uhrzeit "HH:MM". */
export function unixToZoned(ts: number, tz = DEFAULT_TZ): { date: string; time: string } {
  const p = partsAt(ts * 1000, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}

export function todayIn(tz = DEFAULT_TZ): string {
  return unixToZoned(Math.floor(Date.now() / 1000), tz).date;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** ISO-Wochentag (1 = Montag … 7 = Sonntag) eines Datums "YYYY-MM-DD". */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export const WEEKDAY_SHORT = ["", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** z. B. "Di, 11.11. · 19:30" */
export function formatEventTime(ts: number, tz = DEFAULT_TZ): string {
  const { date, time } = unixToZoned(ts, tz);
  const [, m, d] = date.split("-");
  return `${WEEKDAY_SHORT[isoWeekday(date)]}, ${d}.${m}. · ${time}`;
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

/** Relativ und kurz, z. B. "in 2 Std." oder "vor 3 Tagen" */
export function formatRelative(ts: number, nowTs = Math.floor(Date.now() / 1000)): string {
  const diff = ts - nowTs;
  const abs = Math.abs(diff);
  const fmt = (v: number, unit: string) => (diff >= 0 ? `in ${v} ${unit}` : `vor ${v} ${unit}`);
  if (abs < 3600) return fmt(Math.max(1, Math.round(abs / 60)), "Min.");
  if (abs < 86400) return fmt(Math.round(abs / 3600), "Std.");
  const days = Math.round(abs / 86400);
  return fmt(days, days === 1 ? "Tag" : "Tagen");
}
