import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { nowSeconds } from "@/lib/ids";
import { actingPersonIds } from "@/lib/services/access";
import { listMyTeams } from "@/lib/services/teams";

function icsDate(ts: number) {
  return new Date(ts * 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

const STATUS: Record<string, string> = { accepted: "✓ ", declined: "✕ ", maybe: "? " };

export async function GET(_: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const db = await getDb();
  const user = await db.select().from(schema.users).where(eq(schema.users.icalToken, token.replace(/\.ics$/, ""))).get();
  if (!user) return new Response("Not found", { status: 404 });
  const teams = await listMyTeams(db, user.id);
  const persons = await actingPersonIds(db, user.id);
  const events = teams.length
    ? await db
        .select()
        .from(schema.events)
        .where(and(inArray(schema.events.teamId, teams.map((t) => t.id)), gte(schema.events.startsAt, nowSeconds() - 30 * 86400)))
        .orderBy(asc(schema.events.startsAt))
        .all()
    : [];
  const invs = events.length && persons.length
    ? await db.select().from(schema.invitations).where(inArray(schema.invitations.eventId, events.map((e) => e.id))).all()
    : [];
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//spielerminus//DE", "CALSCALE:GREGORIAN", "X-WR-CALNAME:spielerminus", "REFRESH-INTERVAL;VALUE=DURATION:PT1H"];
  for (const ev of events) {
    const mine = invs.find((i) => i.eventId === ev.id && persons.includes(i.personId));
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@spielerminus.app`,
      `DTSTAMP:${icsDate(nowSeconds())}`,
      `DTSTART:${icsDate(ev.startsAt)}`,
      `DTEND:${icsDate(ev.endsAt)}`,
      `SUMMARY:${esc(`${mine ? (STATUS[mine.rsvp] ?? "") : ""}${ev.title}${ev.opponent ? ` · ${ev.opponent}` : ""} (${teamName.get(ev.teamId)})`)}`,
      ...(ev.location ? [`LOCATION:${esc(ev.location)}`] : []),
      `STATUS:${ev.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n"), {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=300" },
  });
}
