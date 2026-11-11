import { describe, expect, it } from "vitest";
import { normalizePhone } from "../lib/auth/login";
import { dueStage, isQuietHour } from "../lib/jobs/reminders";
import { detectPlatform } from "../lib/platform";
import { addDays, isoWeekday, unixToZoned, zonedToUnix } from "../lib/time";

describe("Zeitzonen", () => {
  it("rechnet Berliner Ortszeit in UTC um, auch über die Zeitumstellung", () => {
    expect(new Date(zonedToUnix("2026-07-01", "19:30") * 1000).toISOString()).toBe("2026-07-01T17:30:00.000Z");
    expect(new Date(zonedToUnix("2026-11-12", "19:30") * 1000).toISOString()).toBe("2026-11-12T18:30:00.000Z");
    expect(unixToZoned(zonedToUnix("2026-03-29", "12:00"))).toEqual({ date: "2026-03-29", time: "12:00" });
  });
  it("kennt Wochentage und Tagesarithmetik", () => {
    expect(isoWeekday("2026-11-10")).toBe(2);
    expect(isoWeekday("2026-11-15")).toBe(7);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("Telefonnummern", () => {
  it("normalisiert deutsche Nummern nach E.164", () => {
    expect(normalizePhone("0151 2345 6789")).toBe("+4915123456789");
    expect(normalizePhone("+49 30 23125017")).toBe("+493023125017");
    expect(normalizePhone("0049 (30) 23125-017")).toBe("+493023125017");
    expect(normalizePhone("123")).toBeNull();
  });
});

describe("Erinnerungsstufen", () => {
  const start = 1_000_000;
  it("lädt 7 Tage vorher ein und erinnert 48 h bzw. 24 h vor der Frist", () => {
    const ev = { startsAt: start, rsvpDeadline: start - 6 * 3600 };
    expect(dueStage(ev, start - 8 * 86400)).toBeNull();
    expect(dueStage(ev, start - 7 * 86400)).toBe("invite");
    expect(dueStage(ev, ev.rsvpDeadline - 47 * 3600)).toBe("reminder1");
    expect(dueStage(ev, ev.rsvpDeadline - 23 * 3600)).toBe("reminder2");
    expect(dueStage(ev, ev.rsvpDeadline + 1)).toBeNull();
  });
  it("hält Ruhezeiten von 21 bis 8 Uhr ein", () => {
    expect(isQuietHour(zonedToUnix("2026-11-10", "22:00"))).toBe(true);
    expect(isQuietHour(zonedToUnix("2026-11-10", "07:59"))).toBe(true);
    expect(isQuietHour(zonedToUnix("2026-11-10", "08:00"))).toBe(false);
  });
});

describe("Plattformerkennung für die Homescreen-Anleitung", () => {
  it("unterscheidet In-App-Browser, iOS und Android", () => {
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toBe("ios-safari");
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/130.0 Mobile Safari/604.1")).toBe("ios-other");
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Instagram 300.0")).toBe("in-app");
    expect(detectPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130.0 Mobile Safari/537.36")).toBe("android-chromium");
    expect(detectPlatform("Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36")).toBe("in-app");
    expect(detectPlatform("Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0")).toBe("android-firefox");
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15", 5)).toBe("ios-safari");
  });
});
