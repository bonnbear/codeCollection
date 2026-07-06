CREATE TABLE `mcp` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`enabled` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mcp_id_unique` ON `mcp` (`id`);