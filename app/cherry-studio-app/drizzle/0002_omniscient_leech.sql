CREATE INDEX `idx_topics_created_at` ON `topics` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_topics_assistant_id_created_at` ON `topics` (`assistant_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `files` DROP COLUMN `mime_type`;--> statement-breakpoint
ALTER TABLE `files` DROP COLUMN `md5`;