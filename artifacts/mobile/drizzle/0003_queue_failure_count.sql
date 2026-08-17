ALTER TABLE `quiz_results` ADD `failure_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `hierarchy_lectures` ADD `order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DROP TABLE IF EXISTS `bookmarks`;