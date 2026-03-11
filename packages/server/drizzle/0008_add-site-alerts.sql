CREATE TABLE `site_alerts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `message` text NOT NULL,
  `severity` text NOT NULL DEFAULT 'warning',
  `is_active` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
