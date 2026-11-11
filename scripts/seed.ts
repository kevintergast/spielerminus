/**
 * Testdaten „VC Deshalb“ (siehe docs/testdaten-vc-deshalb.md).
 * Erzeugt .wrangler/seed.sql; `pnpm db:seed` spielt sie in die LOKALE D1 ein. Nie in Produktion.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { addDays, isoWeekday, todayIn, zonedToUnix } from "../lib/time";

const TZ = "Europe/Berlin";
const now = Math.floor(Date.now() / 1000);
const today = todayIn(TZ);
const sql: string[] = [];
const q = (v: unknown) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const insert = (table: string, row: Record<string, unknown>) =>
  sql.push(`INSERT INTO ${table} (${Object.keys(row).join(", ")}) VALUES (${Object.values(row).map(q).join(", ")});`);

// Bestehende Seed-Daten entfernen (alles mit Präfix "vcd_")
for (const t of ["rsvp_changes", "outreach", "action_tokens", "invitations", "events", "event_series", "absences", "memberships", "delegations", "push_subscriptions", "sessions", "persons", "teams", "users"]) {
  const col = { rsvp_changes: "invitation_id", outreach: "invitation_id", action_tokens: "id", delegations: "person_id", push_subscriptions: "user_id", sessions: "user_id" }[t] ?? "id";
  sql.push(`DELETE FROM ${t} WHERE ${col} LIKE 'vcd_%';`);
}
sql.push(`DELETE FROM login_codes WHERE email LIKE '%@vc-deshalb.test';`);

type U = { key: string; first: string; last: string; phone?: string; minor?: boolean; account?: boolean };
const phone = (n: number) => `+493023125${String(n).padStart(3, "0")}`;
const people: U[] = [
  { key: "lena", first: "Lena", last: "Becker", phone: phone(1) },
  { key: "tobias", first: "Tobias", last: "Wagner", phone: phone(2) },
  { key: "sabine", first: "Sabine", last: "Krüger", phone: phone(3) },
  { key: "mia", first: "Mia", last: "Schulz", phone: phone(4) },
  { key: "hannah", first: "Hannah", last: "Hoffmann", phone: phone(5) },
  { key: "lea", first: "Lea", last: "Fischer", phone: phone(6) },
  { key: "sophie", first: "Sophie", last: "Weber", phone: phone(7) },
  { key: "emma", first: "Emma", last: "Richter", phone: phone(8) },
  { key: "laura", first: "Laura", last: "Klein", phone: phone(9) },
  { key: "anna", first: "Anna", last: "Wolf", phone: phone(10) },
  { key: "julia", first: "Julia", last: "Schröder", phone: phone(11) },
  { key: "marie", first: "Marie", last: "Neumann", phone: phone(12) },
  { key: "paula", first: "Paula", last: "Braun", phone: phone(13) },
  { key: "jana", first: "Jana", last: "Hartmann", phone: phone(14) },
  { key: "nina", first: "Nina", last: "Zimmermann", phone: phone(15) },
  { key: "clara", first: "Clara", last: "Schwarz", account: false },
  // Eva Lorenz (#17) tritt im Test selbst über den Link bei und wird daher nicht angelegt.
  { key: "lina", first: "Lina", last: "Becker", minor: true, account: false },
  { key: "thomas", first: "Thomas", last: "Becker", phone: phone(19) },
  { key: "petra", first: "Petra", last: "Lange", phone: phone(20) },
  { key: "ella", first: "Ella", last: "Schmitt", minor: true, account: false },
  { key: "michael", first: "Michael", last: "Schmitt", phone: phone(22) },
  { key: "ida", first: "Ida", last: "Krause", minor: true, phone: phone(23) },
  { key: "katrin", first: "Katrin", last: "Krause", phone: phone(24) },
];

const email = (u: U) =>
  `${u.first}.${u.last}`
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss") + "@vc-deshalb.test";

for (const u of people) {
  insert("persons", { id: `vcd_p_${u.key}`, first_name: u.first, last_name: u.last, is_minor: u.minor ? 1 : 0 });
  if (u.account === false) continue;
  insert("users", { id: `vcd_u_${u.key}`, email: email(u), first_name: u.first, last_name: u.last, phone_e164: u.phone, ical_token: `vcd_ical_${u.key}` });
  insert("delegations", { user_id: `vcd_u_${u.key}`, person_id: `vcd_p_${u.key}`, kind: "self" });
}
// Stellvertreter
for (const [user, person] of [["thomas", "lina"], ["petra", "lina"], ["michael", "ella"], ["katrin", "ida"]]) {
  insert("delegations", { user_id: `vcd_u_${user}`, person_id: `vcd_p_${person}`, kind: "guardian" });
}

// Teams
insert("teams", { id: "vcd_t_damen", name: "VC Deshalb 1. Damen", sport: "Volleyball", is_youth: 0, owner_user_id: "vcd_u_lena", invite_code: "vcdamen1" });
insert("teams", { id: "vcd_t_u16", name: "VC Deshalb U16", sport: "Volleyball", is_youth: 1, owner_user_id: "vcd_u_tobias", invite_code: "vcdu16xx" });

const member = (team: string, key: string, roles: string[], position?: string, status = "active") =>
  insert("memberships", { id: `vcd_m_${team}_${key}`, team_id: `vcd_t_${team}`, person_id: `vcd_p_${key}`, roles: JSON.stringify(roles), status, position: position ?? null });

member("damen", "lena", ["admin", "trainer"]);
member("damen", "tobias", ["trainer"]);
member("damen", "sabine", ["treasurer"]);
member("damen", "mia", ["player"], "Zuspiel");
member("damen", "hannah", ["player"], "Außenangriff");
member("damen", "lea", ["player"], "Außenangriff");
member("damen", "sophie", ["player"], "Mittelblock");
member("damen", "emma", ["player"], "Mittelblock");
member("damen", "laura", ["player"], "Diagonal");
member("damen", "anna", ["player"], "Libera");
member("damen", "julia", ["player"], "Außenangriff");
member("damen", "marie", ["player"], "Zuspiel");
member("damen", "paula", ["player"], "Diagonal");
member("damen", "jana", ["player"], "Mittelblock");
member("damen", "nina", ["player"], "Libera", "inactive");
member("damen", "clara", ["guest"]);
member("u16", "tobias", ["admin", "trainer"]);
member("u16", "lina", ["player"]);
member("u16", "ella", ["player"]);
member("u16", "ida", ["player"]);

const damenPlayers = ["mia", "hannah", "lea", "sophie", "emma", "laura", "anna", "julia", "marie", "paula", "jana"];
const u16Players = ["lina", "ella", "ida"];

// Abwesenheit: Anna zwei Wochen Urlaub ab gestern
const annaFrom = addDays(today, -1);
const annaTo = addDays(today, 13);
insert("absences", { id: "vcd_a_anna", person_id: "vcd_p_anna", from_date: annaFrom, to_date: annaTo, kind: "vacation", created_by: "vcd_u_anna" });

let evCounter = 0;
type Answer = Partial<Record<string, { rsvp: string; reason?: string; attendance?: string; late?: boolean }>>;
function event(team: string, e: { title: string; type: string; date: string; start: string; end: string; location: string; opponent?: string; deadlineH?: number; max?: number; series?: string }, players: string[], answers: Answer = {}) {
  const id = `vcd_e_${++evCounter}`;
  const startsAt = zonedToUnix(e.date, e.start, TZ);
  let endsAt = zonedToUnix(e.date, e.end, TZ);
  if (endsAt <= startsAt) endsAt += 86400;
  const deadline = e.deadlineH ? startsAt - e.deadlineH * 3600 : null;
  insert("events", {
    id,
    team_id: `vcd_t_${team}`,
    series_id: e.series ?? null,
    type: e.type,
    title: e.title,
    starts_at: startsAt,
    ends_at: endsAt,
    location: e.location,
    opponent: e.opponent ?? null,
    rsvp_mode: "opt_in",
    rsvp_deadline: deadline,
    max_participants: e.max ?? null,
    deadline_processed_at: deadline && deadline < now ? now : null,
  });
  for (const p of players) {
    const inAbsence = p === "anna" && e.date >= annaFrom && e.date <= annaTo;
    const a = inAbsence ? { rsvp: "declined", reason: "Urlaub" } : answers[p];
    const invId = `vcd_i_${evCounter}_${p}`;
    const past = startsAt < now;
    const rsvp = a?.rsvp ?? (past || (deadline && deadline < now) ? "no_response" : "pending");
    insert("invitations", { id: invId, event_id: id, person_id: `vcd_p_${p}`, rsvp, reason: a?.reason ?? null, attendance: a?.attendance ?? null, responded_at: a ? Math.min(now, startsAt) - 3600 : null });
    if (a && rsvp !== "pending") {
      const at = a.late && deadline ? deadline + 1800 : Math.min(now, deadline ?? startsAt) - 7200;
      insert("rsvp_changes", { id: `vcd_c_${evCounter}_${p}`, invitation_id: invId, from_rsvp: "pending", to_rsvp: rsvp, reason: a.reason ?? null, actor_user_id: `vcd_u_${p}`, channel: "app", at });
    }
  }
  return id;
}

// Trainingsserie Di + Do, 19:30–21:30, die nächsten 4 Wochen
insert("event_series", {
  id: "vcd_s_training",
  team_id: "vcd_t_damen",
  type: "training",
  title: "Training",
  weekdays: JSON.stringify([2, 4]),
  start_time: "19:30",
  duration_min: 120,
  location: "Sporthalle am Deich, Deichstraße 1",
  starts_on: addDays(today, -7),
  rsvp_mode: "opt_in",
  deadline_minutes_before: 360,
  generated_until: addDays(today, 27),
});
let first = true;
for (let d = 1; d <= 27; d++) {
  const date = addDays(today, d);
  if (![2, 4].includes(isoWeekday(date))) continue;
  // Beim ersten Training: einige haben schon geantwortet, Emma/Laura/Paula sind offen
  const answers: Answer = first
    ? { mia: { rsvp: "accepted" }, hannah: { rsvp: "accepted" }, lea: { rsvp: "accepted" }, sophie: { rsvp: "maybe" }, julia: { rsvp: "declined", reason: "Arbeit" }, marie: { rsvp: "accepted" }, jana: { rsvp: "accepted" } }
    : {};
  event("damen", { title: "Training", type: "training", date, start: "19:30", end: "21:30", location: "Sporthalle am Deich, Deichstraße 1", deadlineH: 6, series: "vcd_s_training" }, damenPlayers, answers);
  first = false;
}

// Heimspiel vor 3 Tagen: Anwesenheit, unentschuldigt (Jana), Absage nach Frist (Julia)
event(
  "damen",
  { title: "Ligaspiel", type: "match", date: addDays(today, -3), start: "15:00", end: "17:30", location: "Sporthalle am Deich, Deichstraße 1", opponent: "SV Nirgendwo", deadlineH: 48 },
  damenPlayers,
  {
    mia: { rsvp: "accepted", attendance: "present" },
    hannah: { rsvp: "accepted", attendance: "present" },
    lea: { rsvp: "accepted", attendance: "present" },
    sophie: { rsvp: "accepted", attendance: "late" },
    emma: { rsvp: "accepted", attendance: "present" },
    laura: { rsvp: "accepted", attendance: "present" },
    julia: { rsvp: "declined", reason: "Privat", late: true, attendance: "excused" },
    marie: { rsvp: "accepted", attendance: "present" },
    paula: { rsvp: "accepted", attendance: "present" },
    jana: { rsvp: "accepted", attendance: "unexcused" },
  },
);
// Auswärtsspiel gestern (für das spätere Fahrten-Popup)
event(
  "damen",
  { title: "Ligaspiel", type: "match", date: addDays(today, -1), start: "16:00", end: "18:30", location: "Halle Irgendwo, Hauptstraße 5, 12345 Irgendwo", opponent: "TV Irgendwo", deadlineH: 48 },
  damenPlayers,
  Object.fromEntries(damenPlayers.filter((p) => p !== "anna").map((p) => [p, { rsvp: "accepted", attendance: "present" }])),
);
// Auswärtsspiel in 5 Tagen
event(
  "damen",
  { title: "Ligaspiel", type: "match", date: addDays(today, 5), start: "15:00", end: "17:30", location: "Halle Irgendwo, Hauptstraße 5, 12345 Irgendwo", opponent: "TV Irgendwo II", deadlineH: 48 },
  damenPlayers,
  { mia: { rsvp: "accepted" }, lea: { rsvp: "accepted" }, sophie: { rsvp: "accepted" }, marie: { rsvp: "accepted" } },
);
// Turnier in 10 Tagen mit Limit 10 und Gastspielerin
event(
  "damen",
  { title: "Deichpokal", type: "tournament", date: addDays(today, 10), start: "10:00", end: "17:00", location: "Sporthalle am Deich, Deichstraße 1", deadlineH: 72, max: 10 },
  [...damenPlayers, "clara"],
  { clara: { rsvp: "accepted" }, mia: { rsvp: "accepted" } },
);

// U16: Training mittwochs, Auswärtsspiel vor 2 Tagen
for (let d = 1; d <= 21; d++) {
  const date = addDays(today, d);
  if (isoWeekday(date) !== 3) continue;
  event("u16", { title: "Training", type: "training", date, start: "17:00", end: "18:30", location: "Sporthalle am Deich, Deichstraße 1" }, u16Players, d < 8 ? { ida: { rsvp: "accepted" } } : {});
}
event(
  "u16",
  { title: "Bezirksspiel", type: "match", date: addDays(today, -2), start: "11:00", end: "13:00", location: "Schulturnhalle Beispielstadt", opponent: "TSG Beispielstadt" },
  u16Players,
  { lina: { rsvp: "accepted", attendance: "present" }, ella: { rsvp: "accepted", attendance: "present" }, ida: { rsvp: "accepted", attendance: "present" } },
);

mkdirSync(".wrangler", { recursive: true });
writeFileSync(".wrangler/seed.sql", sql.join("\n") + "\n");
console.log(`seed.sql: ${sql.length} Anweisungen, ${evCounter} Termine`);
