CREATE TABLE `access_map` (
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`item_type` text NOT NULL,
	`has_access` integer NOT NULL,
	`is_free` integer NOT NULL,
	`price_cents` integer NOT NULL,
	PRIMARY KEY(`user_id`, `item_id`),
	CONSTRAINT "access_map_item_type_check" CHECK("access_map"."item_type" IN ('module','subject'))
);
--> statement-breakpoint
CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `best_scores` (
	`user_id` text NOT NULL,
	`lecture_id` text NOT NULL,
	`score` integer NOT NULL,
	PRIMARY KEY(`user_id`, `lecture_id`)
);
--> statement-breakpoint
CREATE TABLE `hierarchy_lectures` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`external_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`question_count` integer,
	`is_free` integer,
	FOREIGN KEY (`subject_id`) REFERENCES `hierarchy_subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `hierarchy_lectures_subject_id_idx` ON `hierarchy_lectures` (`subject_id`);--> statement-breakpoint
CREATE TABLE `hierarchy_modules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`year_id` text NOT NULL,
	`order` integer NOT NULL,
	`external_price_id` text,
	FOREIGN KEY (`year_id`) REFERENCES `hierarchy_years`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `hierarchy_modules_year_id_idx` ON `hierarchy_modules` (`year_id`);--> statement-breakpoint
CREATE TABLE `hierarchy_subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`module_id` text NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `hierarchy_modules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `hierarchy_subjects_module_id_idx` ON `hierarchy_subjects` (`module_id`);--> statement-breakpoint
CREATE TABLE `hierarchy_years` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `migration_quarantine` (
	`id` text PRIMARY KEY NOT NULL,
	`source_key` text NOT NULL,
	`raw` text NOT NULL,
	`error` text NOT NULL,
	`quarantined_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress` (
	`user_id` text NOT NULL,
	`lecture_id` text NOT NULL,
	`completed_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `lecture_id`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`module_id` text,
	`amount_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `purchases_user_id_idx` ON `purchases` (`user_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`lecture_id` text NOT NULL,
	`text` text NOT NULL,
	`options` text NOT NULL,
	`answer` integer NOT NULL,
	`explanation` text DEFAULT '' NOT NULL,
	`image_url` text,
	`downloaded_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `questions_lecture_id_idx` ON `questions` (`lecture_id`);--> statement-breakpoint
CREATE TABLE `quiz_results` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`lecture_id` text NOT NULL,
	`lecture_name` text NOT NULL,
	`score` integer NOT NULL,
	`total_questions` integer NOT NULL,
	`correct_answers` integer NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`synced_at` text,
	CONSTRAINT "quiz_results_status_check" CHECK("quiz_results"."status" IN ('pending','synced'))
);
--> statement-breakpoint
CREATE INDEX `quiz_results_status_created_at_idx` ON `quiz_results` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `quiz_results_user_id_idx` ON `quiz_results` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_stats` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL
);
