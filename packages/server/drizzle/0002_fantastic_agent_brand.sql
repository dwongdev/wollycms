CREATE TABLE `page_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`status` text NOT NULL,
	`fields` text,
	`blocks` text,
	`created_at` text NOT NULL,
	`created_by` integer,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_revisions_page` ON `page_revisions` (`page_id`);