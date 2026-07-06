PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_files` (
	`id` text PRIMARY KEY NOT NULL,
	`origin_name` text NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`size` integer NOT NULL,
	`ext` text NOT NULL,
	`count` integer NOT NULL,
	`type` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_files`("id", "origin_name", "name", "path", "size", "ext", "count", "type", "created_at", "updated_at") SELECT "id", "origin_name", "name", "path", "size", "ext", "count", "type", "created_at", "updated_at" FROM `files`;--> statement-breakpoint
DROP TABLE `files`;--> statement-breakpoint
ALTER TABLE `__new_files` RENAME TO `files`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `files_id_unique` ON `files` (`id`);--> statement-breakpoint
CREATE TABLE `__new_knowledges` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`model` text NOT NULL,
	`dimensions` integer NOT NULL,
	`description` text,
	`version` text NOT NULL,
	`document_count` integer,
	`chunk_size` integer,
	`chunk_overlap` integer,
	`threshold` integer,
	`rerank_model` text,
	`items` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_knowledges`("id", "name", "model", "dimensions", "description", "version", "document_count", "chunk_size", "chunk_overlap", "threshold", "rerank_model", "items", "created_at", "updated_at") SELECT "id", "name", "model", "dimensions", "description", "version", "document_count", "chunk_size", "chunk_overlap", "threshold", "rerank_model", "items", "created_at", "updated_at" FROM `knowledges`;--> statement-breakpoint
DROP TABLE `knowledges`;--> statement-breakpoint
ALTER TABLE `__new_knowledges` RENAME TO `knowledges`;--> statement-breakpoint
CREATE UNIQUE INDEX `knowledges_id_unique` ON `knowledges` (`id`);--> statement-breakpoint
CREATE TABLE `__new_message_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`type` text NOT NULL,
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
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_message_blocks`("id", "message_id", "type", "status", "model", "metadata", "error", "content", "language", "url", "file", "tool_id", "tool_name", "arguments", "source_block_id", "source_language", "target_language", "response", "knowledge", "thinking_millsec", "knowledge_base_ids", "citation_references", "created_at", "updated_at") SELECT "id", "message_id", "type", "status", "model", "metadata", "error", "content", "language", "url", "file", "tool_id", "tool_name", "arguments", "source_block_id", "source_language", "target_language", "response", "knowledge", "thinking_millsec", "knowledge_base_ids", "citation_references", "created_at", "updated_at" FROM `message_blocks`;--> statement-breakpoint
DROP TABLE `message_blocks`;--> statement-breakpoint
ALTER TABLE `__new_message_blocks` RENAME TO `message_blocks`;--> statement-breakpoint
CREATE UNIQUE INDEX `message_blocks_id_unique` ON `message_blocks` (`id`);--> statement-breakpoint
CREATE INDEX `idx_message_blocks_message_id` ON `message_blocks` (`message_id`);--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`assistant_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`status` text NOT NULL,
	`model_id` text,
	`model` text,
	`type` text,
	`useful` integer,
	`ask_id` text,
	`mentions` text,
	`usage` text,
	`metrics` text,
	`multi_model_message_style` text,
	`fold_selected` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`assistant_id`) REFERENCES `assistants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "role", "assistant_id", "topic_id", "status", "model_id", "model", "type", "useful", "ask_id", "mentions", "usage", "metrics", "multi_model_message_style", "fold_selected", "created_at", "updated_at") SELECT "id", "role", "assistant_id", "topic_id", "status", "model_id", "model", "type", "useful", "ask_id", "mentions", "usage", "metrics", "multi_model_message_style", "fold_selected", "created_at", "updated_at" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
CREATE UNIQUE INDEX `messages_id_unique` ON `messages` (`id`);--> statement-breakpoint
CREATE INDEX `idx_messages_topic_id` ON `messages` (`topic_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_assistant_id` ON `messages` (`assistant_id`);--> statement-breakpoint
CREATE TABLE `__new_topics` (
	`id` text PRIMARY KEY NOT NULL,
	`assistant_id` text NOT NULL,
	`name` text NOT NULL,
	`messages` text DEFAULT '[]' NOT NULL,
	`pinned` integer,
	`prompt` text,
	`is_name_manually_edited` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`assistant_id`) REFERENCES `assistants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_topics`("id", "assistant_id", "name", "messages", "pinned", "prompt", "is_name_manually_edited", "created_at", "updated_at") SELECT "id", "assistant_id", "name", "messages", "pinned", "prompt", "is_name_manually_edited", "created_at", "updated_at" FROM `topics`;--> statement-breakpoint
DROP TABLE `topics`;--> statement-breakpoint
ALTER TABLE `__new_topics` RENAME TO `topics`;--> statement-breakpoint
CREATE UNIQUE INDEX `topics_id_unique` ON `topics` (`id`);--> statement-breakpoint
CREATE INDEX `idx_topics_assistant_id` ON `topics` (`assistant_id`);--> statement-breakpoint
CREATE INDEX `idx_topics_created_at` ON `topics` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_topics_assistant_id_created_at` ON `topics` (`assistant_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `assistants` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `assistants` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `backup_providers` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `backup_providers` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `providers` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `providers` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `websearch_providers` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `websearch_providers` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `mcp` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `mcp` ADD `updated_at` integer;