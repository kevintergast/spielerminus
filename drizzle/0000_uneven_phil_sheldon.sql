CREATE TABLE `absences` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`from_date` text NOT NULL,
	`to_date` text NOT NULL,
	`kind` text NOT NULL,
	`note` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `absences_person_idx` ON `absences` (`person_id`);--> statement-breakpoint
CREATE TABLE `action_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`person_id` text NOT NULL,
	`kind` text NOT NULL,
	`target_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`used_action` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text,
	`actor_user_id` text,
	`channel` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text,
	`data` text,
	`at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_team_idx` ON `audit_log` (`team_id`,`at`);--> statement-breakpoint
CREATE TABLE `delegations` (
	`user_id` text NOT NULL,
	`person_id` text NOT NULL,
	`kind` text NOT NULL,
	PRIMARY KEY(`user_id`, `person_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `delegations_person_idx` ON `delegations` (`person_id`);--> statement-breakpoint
CREATE TABLE `event_series` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`weekdays` text NOT NULL,
	`start_time` text NOT NULL,
	`duration_min` integer NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text,
	`rsvp_mode` text DEFAULT 'opt_in' NOT NULL,
	`deadline_minutes_before` integer,
	`generated_until` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`series_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`meet_at` integer,
	`location` text DEFAULT '' NOT NULL,
	`opponent` text,
	`rsvp_mode` text DEFAULT 'opt_in' NOT NULL,
	`rsvp_deadline` integer,
	`max_participants` integer,
	`responses_visible` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`cancel_reason` text,
	`deadline_processed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`series_id`) REFERENCES `event_series`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `events_team_start_idx` ON `events` (`team_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`person_id` text NOT NULL,
	`rsvp` text DEFAULT 'pending' NOT NULL,
	`reason` text,
	`attendance` text,
	`responded_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_event_person_idx` ON `invitations` (`event_id`,`person_id`);--> statement-breakpoint
CREATE INDEX `invitations_person_rsvp_idx` ON `invitations` (`person_id`,`rsvp`);--> statement-breakpoint
CREATE TABLE `login_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_codes_email_idx` ON `login_codes` (`email`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`person_id` text NOT NULL,
	`roles` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`position` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_team_person_idx` ON `memberships` (`team_id`,`person_id`);--> statement-breakpoint
CREATE TABLE `outreach` (
	`id` text PRIMARY KEY NOT NULL,
	`invitation_id` text NOT NULL,
	`stage` text NOT NULL,
	`channels` text NOT NULL,
	`sent_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`invitation_id`) REFERENCES `invitations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outreach_invitation_stage_idx` ON `outreach` (`invitation_id`,`stage`);--> statement-breakpoint
CREATE TABLE `persons` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text DEFAULT '' NOT NULL,
	`is_minor` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`platform` text DEFAULT '' NOT NULL,
	`installed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `rsvp_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`invitation_id` text NOT NULL,
	`from_rsvp` text NOT NULL,
	`to_rsvp` text NOT NULL,
	`reason` text,
	`actor_user_id` text,
	`channel` text NOT NULL,
	`at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`invitation_id`) REFERENCES `invitations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rsvp_changes_invitation_idx` ON `rsvp_changes` (`invitation_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sport` text NOT NULL,
	`is_youth` integer DEFAULT false NOT NULL,
	`owner_user_id` text NOT NULL,
	`invite_code` text NOT NULL,
	`timezone` text DEFAULT 'Europe/Berlin' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_invite_code_unique` ON `teams` (`invite_code`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_name` text DEFAULT '' NOT NULL,
	`last_name` text DEFAULT '' NOT NULL,
	`phone_e164` text DEFAULT '' NOT NULL,
	`ical_token` text NOT NULL,
	`install_hint_count` integer DEFAULT 0 NOT NULL,
	`install_hint_dismissed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_ical_token_unique` ON `users` (`ical_token`);