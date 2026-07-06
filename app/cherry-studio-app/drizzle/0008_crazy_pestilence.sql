PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_message_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text,
	`status` text NOT NULL,
	`model` text,
	`metadata` text,
	`error` text,
	`content` text,
	`language` text,
	`url` text,
	`file` text,
	`tool_id` text,
	`tool_name` text,
	`arguments` text,
	`source_block_id` text,
	`source_language` text,
	`target_language` text,
	`response` text,
	`knowledge` text,
	`thinking_millsec` integer,
	`knowledge_base_ids` text,
	`citation_references` text,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_message_blocks`("id", "message_id", "type", "created_at", "updated_at", "status", "model", "metadata", "error", "content", "language", "url", "file", "tool_id", "tool_name", "arguments", "source_block_id", "source_language", "target_language", "response", "knowledge", "thinking_millsec", "knowledge_base_ids", "citation_references") SELECT "id", "message_id", "type", "created_at", "updated_at", "status", "model", "metadata", "error", "content", "language", "url", "file", "tool_id", "tool_name", "arguments", "source_block_id", "source_language", "target_language", "response", "knowledge", "thinking_millsec", "knowledge_base_ids", "citation_references" FROM `message_blocks`;--> statement-breakpoint
DROP TABLE `message_blocks`;--> statement-breakpoint
ALTER TABLE `__new_message_blocks` RENAME TO `message_blocks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `message_blocks_id_unique` ON `message_blocks` (`id`);--> statement-breakpoint
CREATE INDEX `idx_message_blocks_message_id` ON `message_blocks` (`message_id`);