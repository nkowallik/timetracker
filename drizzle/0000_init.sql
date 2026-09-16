CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `work_windows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`side` text NOT NULL,
	`day` text NOT NULL,
	`start_ts` integer NOT NULL,
	`end_ts` integer,
	`note` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_windows_day` ON `work_windows` (`day`);--> statement-breakpoint
CREATE INDEX `idx_windows_side_day` ON `work_windows` (`side`,`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_one_running` ON `work_windows` (("end_ts" IS NULL)) WHERE "end_ts" IS NULL;