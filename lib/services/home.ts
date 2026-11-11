import { and, asc, gte, inArray, lte } from "drizzle-orm";
import type { Db } from "../db";
import { schema } from "../db";
import { nowSeconds } from "../ids";
import { decorateEvents } from "./events";
import { listMyTeams } from "./teams";

/** Startseite: Teams und ihre Termine der nächsten zwei Wochen. */
export async function getHome(db: Db, userId: string) {
  const teams = await listMyTeams(db, userId);
  if (!teams.length) return { teams, events: [], openCount: 0 };
  // Alle Termine der eigenen Teams; eingeladene Personen bekommen darin ihre Antwort-Buttons.
  const upcoming = await db
    .select()
    .from(schema.events)
    .where(
      and(
        inArray(schema.events.teamId, teams.map((t) => t.id)),
        gte(schema.events.endsAt, nowSeconds() - 3600),
        lte(schema.events.startsAt, nowSeconds() + 14 * 86400),
      ),
    )
    .orderBy(asc(schema.events.startsAt))
    .limit(20)
    .all();
  const events = await decorateEvents(db, userId, upcoming);
  const openCount = events
    .filter((e) => e.status === "scheduled" && e.startsAt > nowSeconds())
    .reduce((n, e) => n + e.mine.filter((m) => m.rsvp === "pending").length, 0);
  return { teams, events, openCount };
}
