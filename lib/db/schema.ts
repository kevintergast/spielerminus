import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Zeitstempel sind Unix-Sekunden (UTC), Datumsangaben ohne Uhrzeit sind "YYYY-MM-DD".
const now = sql`(unixepoch())`;

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  phoneE164: text("phone_e164").notNull().default(""),
  icalToken: text("ical_token").notNull().unique(),
  installHintCount: integer("install_hint_count").notNull().default(0),
  installHintDismissedAt: integer("install_hint_dismissed_at"),
  createdAt: integer("created_at").notNull().default(now),
});

export const sessions = sqliteTable(
  "sessions",
  {
    // SHA-256 des Cookie-Werts; der Rohwert wird nie gespeichert.
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginCodes = sqliteTable(
  "login_codes",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: integer("expires_at").notNull(),
    consumedAt: integer("consumed_at"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("login_codes_email_idx").on(t.email)],
);

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sport: text("sport").notNull(),
  isYouth: integer("is_youth", { mode: "boolean" }).notNull().default(false),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  inviteCode: text("invite_code").notNull().unique(),
  timezone: text("timezone").notNull().default("Europe/Berlin"),
  createdAt: integer("created_at").notNull().default(now),
});

export const persons = sqliteTable("persons", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull().default(""),
  isMinor: integer("is_minor", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(now),
});

export const ROLES = ["admin", "trainer", "treasurer", "player", "staff", "guest"] as const;
export type Role = (typeof ROLES)[number];

export const memberships = sqliteTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    roles: text("roles", { mode: "json" }).$type<Role[]>().notNull(),
    status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
    position: text("position"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("memberships_team_person_idx").on(t.teamId, t.personId)],
);

export const delegations = sqliteTable(
  "delegations",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["self", "guardian", "substitute"] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.personId] }), index("delegations_person_idx").on(t.personId)],
);

export const EVENT_TYPES = ["training", "match", "tournament", "event", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const eventSeries = sqliteTable("event_series", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  type: text("type", { enum: EVENT_TYPES }).notNull(),
  title: text("title").notNull(),
  // ISO-Wochentage 1 = Montag … 7 = Sonntag
  weekdays: text("weekdays", { mode: "json" }).$type<number[]>().notNull(),
  startTime: text("start_time").notNull(),
  durationMin: integer("duration_min").notNull(),
  location: text("location").notNull().default(""),
  startsOn: text("starts_on").notNull(),
  endsOn: text("ends_on"),
  rsvpMode: text("rsvp_mode", { enum: ["opt_in", "opt_out"] }).notNull().default("opt_in"),
  deadlineMinutesBefore: integer("deadline_minutes_before"),
  generatedUntil: text("generated_until").notNull(),
  createdAt: integer("created_at").notNull().default(now),
});

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    seriesId: text("series_id").references(() => eventSeries.id, { onDelete: "set null" }),
    type: text("type", { enum: EVENT_TYPES }).notNull(),
    title: text("title").notNull(),
    startsAt: integer("starts_at").notNull(),
    endsAt: integer("ends_at").notNull(),
    meetAt: integer("meet_at"),
    location: text("location").notNull().default(""),
    opponent: text("opponent"),
    rsvpMode: text("rsvp_mode", { enum: ["opt_in", "opt_out"] }).notNull().default("opt_in"),
    rsvpDeadline: integer("rsvp_deadline"),
    maxParticipants: integer("max_participants"),
    responsesVisible: integer("responses_visible", { mode: "boolean" }).notNull().default(true),
    status: text("status", { enum: ["scheduled", "cancelled"] }).notNull().default("scheduled"),
    cancelReason: text("cancel_reason"),
    deadlineProcessedAt: integer("deadline_processed_at"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("events_team_start_idx").on(t.teamId, t.startsAt)],
);

export const RSVP = ["pending", "accepted", "declined", "maybe", "no_response"] as const;
export type Rsvp = (typeof RSVP)[number];
export const ATTENDANCE = ["present", "late", "excused", "unexcused"] as const;
export type Attendance = (typeof ATTENDANCE)[number];
export const CHANNELS = ["app", "push", "link", "api", "mcp", "phone", "system"] as const;
export type Channel = (typeof CHANNELS)[number];

export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    rsvp: text("rsvp", { enum: RSVP }).notNull().default("pending"),
    reason: text("reason"),
    attendance: text("attendance", { enum: ATTENDANCE }),
    respondedAt: integer("responded_at"),
  },
  (t) => [
    uniqueIndex("invitations_event_person_idx").on(t.eventId, t.personId),
    index("invitations_person_rsvp_idx").on(t.personId, t.rsvp),
  ],
);

export const rsvpChanges = sqliteTable(
  "rsvp_changes",
  {
    id: text("id").primaryKey(),
    invitationId: text("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    fromRsvp: text("from_rsvp", { enum: RSVP }).notNull(),
    toRsvp: text("to_rsvp", { enum: RSVP }).notNull(),
    reason: text("reason"),
    actorUserId: text("actor_user_id"),
    channel: text("channel", { enum: CHANNELS }).notNull(),
    at: integer("at").notNull().default(now),
  },
  (t) => [index("rsvp_changes_invitation_idx").on(t.invitationId)],
);

export const absences = sqliteTable(
  "absences",
  {
    id: text("id").primaryKey(),
    personId: text("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    fromDate: text("from_date").notNull(),
    toDate: text("to_date").notNull(),
    kind: text("kind", { enum: ["vacation", "sick", "injured", "other"] }).notNull(),
    note: text("note"),
    createdBy: text("created_by"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("absences_person_idx").on(t.personId)],
);

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    platform: text("platform").notNull().default(""),
    installed: integer("installed", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull().default(now),
    lastSeenAt: integer("last_seen_at").notNull().default(now),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);

export const actionTokens = sqliteTable("action_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  personId: text("person_id").notNull(),
  kind: text("kind", { enum: ["rsvp"] }).notNull(),
  targetId: text("target_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
  usedAction: text("used_action"),
});

export const outreach = sqliteTable(
  "outreach",
  {
    id: text("id").primaryKey(),
    invitationId: text("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    stage: text("stage", { enum: ["invite", "reminder1", "reminder2"] }).notNull(),
    channels: text("channels", { mode: "json" }).$type<string[]>().notNull(),
    sentAt: integer("sent_at").notNull().default(now),
  },
  (t) => [uniqueIndex("outreach_invitation_stage_idx").on(t.invitationId, t.stage)],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id"),
    actorUserId: text("actor_user_id"),
    channel: text("channel", { enum: CHANNELS }).notNull(),
    action: text("action").notNull(),
    entityId: text("entity_id"),
    data: text("data", { mode: "json" }),
    at: integer("at").notNull().default(now),
  },
  (t) => [index("audit_team_idx").on(t.teamId, t.at)],
);
