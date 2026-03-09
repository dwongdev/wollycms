CREATE TABLE `tracking_scripts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`position` text DEFAULT 'head' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`scope` text DEFAULT 'global' NOT NULL,
	`target_pages` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
