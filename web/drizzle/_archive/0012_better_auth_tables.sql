CREATE TABLE IF NOT EXISTS `user` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified` boolean NOT NULL DEFAULT false,
  `image` text,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  CONSTRAINT `user_id` PRIMARY KEY (`id`),
  CONSTRAINT `user_email_unique` UNIQUE (`email`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `session` (
  `id` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `user_id` varchar(255) NOT NULL,
  CONSTRAINT `session_id` PRIMARY KEY (`id`),
  CONSTRAINT `session_token_unique` UNIQUE (`token`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `account` (
  `id` varchar(255) NOT NULL,
  `account_id` varchar(255) NOT NULL,
  `provider_id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `access_token` text,
  `refresh_token` text,
  `id_token` text,
  `access_token_expires_at` timestamp,
  `refresh_token_expires_at` timestamp,
  `scope` text,
  `password` text,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  CONSTRAINT `account_id` PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `verification` (
  `id` varchar(255) NOT NULL,
  `identifier` varchar(255) NOT NULL,
  `value` text NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  CONSTRAINT `verification_id` PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);
