import { createDb } from "../db";
import { extendAllSeries } from "../services/events";
import { processDeadlines, runReminders } from "./reminders";

/** Wird vom Cron jede Minute aufgerufen. */
export async function runScheduledJobs(env: CloudflareEnv, now: Date): Promise<void> {
  const db = createDb(env.DB);
  const ts = Math.floor(now.getTime() / 1000);
  await processDeadlines(db, ts);
  await runReminders(db, env, ts);
  // Serien einmal am Tag verlängern (03:07 UTC)
  if (now.getUTCHours() === 3 && now.getUTCMinutes() === 7) await extendAllSeries(db);
}
