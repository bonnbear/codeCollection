PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_mcp` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`enabled` integer,
	`disabled_tools` text
);
--> statement-breakpoint
INSERT INTO `__new_mcp`("id", "name", "type", "description", "enabled", "disabled_tools") SELECT "id", "name", "type", "description", "enabled", "disabled_tools" FROM `mcp`;--> statement-breakpoint
DROP TABLE `mcp`;--> statement-breakpoint
ALTER TABLE `__new_mcp` RENAME TO `mcp`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `mcp_id_unique` ON `mcp` (`id`);