CREATE TABLE `assistants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`prompt` text NOT NULL,
	`type` text DEFAULT 'built_in' NOT NULL,
	`emoji` text,
	`description` text,
	`model` text,
	`default_model` text,
	`settings` text,
	`enable_web_search` integer,
	`enable_generate_image` integer,
	`knowledge_recognition` text,
	`tags` text,
	`group` text,
	`isStar` integer,
	`websearch_provider_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assistants_id_unique` ON `assistants` (`id`);--> statement-breakpoint
CREATE TABLE `backup_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`config` text
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`origin_name` text NOT NULL,
	`created_at` text NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`size` integer NOT NULL,
	`ext` text NOT NULL,
	`count` integer NOT NULL,
	`type` text NOT NULL,
	`mime_type` text NOT NULL,
	`md5` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `files_id_unique` ON `files` (`id`);--> statement-breakpoint
CREATE TABLE `knowledges` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`model` text NOT NULL,
	`dimensions` integer NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` text NOT NULL,
	`document_count` integer,
	`chunk_size` integer,
	`chunk_overlap` integer,
	`threshold` integer,
	`rerank_model` text,
	`items` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledges_id_unique` ON `knowledges` (`id`);--> statement-breakpoint
CREATE TABLE `message_blocks` (
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
	`citation_references` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_blocks_id_unique` ON `message_blocks` (`id`);--> statement-breakpoint
CREATE INDEX `idx_message_blocks_message_id` ON `message_blocks` (`message_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`assistant_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text,
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
	FOREIGN KEY (`assistant_id`) REFERENCES `assistants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `messages_id_unique` ON `messages` (`id`);--> statement-breakpoint
CREATE INDEX `idx_messages_topic_id` ON `messages` (`topic_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_assistant_id` ON `messages` (`assistant_id`);--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`api_key` text,
	`api_host` text,
	`api_version` text,
	`models` text,
	`enabled` integer,
	`is_system` integer,
	`is_authed` integer,
	`rate_limit` integer,
	`is_not_support_array_content` integer,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`assistant_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`messages` text DEFAULT '[]' NOT NULL,
	`pinned` integer,
	`prompt` text,
	`is_name_manually_edited` integer,
	FOREIGN KEY (`assistant_id`) REFERENCES `assistants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topics_id_unique` ON `topics` (`id`);--> statement-breakpoint
CREATE INDEX `idx_topics_assistant_id` ON `topics` (`assistant_id`);--> statement-breakpoint
CREATE TABLE `websearch_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`api_key` text,
	`api_host` text,
	`engines` text,
	`url` text,
	`basic_auth_username` text,
	`basic_auth_password` text,
	`content_limit` integer,
	`using_browser` integer
);
