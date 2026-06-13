CREATE TABLE `account` (
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
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`result_id` int,
	`run_id` int NOT NULL,
	`project_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(64),
	`url` text NOT NULL,
	`content_type` varchar(128),
	`size_bytes` int,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `automation_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`external_id` varchar(255),
	`name` text NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'unknown',
	`environment` varchar(128),
	`branch` varchar(255),
	`commit_sha` varchar(128),
	`ci_build_url` text,
	`trigger_source` varchar(32) NOT NULL DEFAULT 'api',
	`raw_format` varchar(64) NOT NULL DEFAULT 'junit',
	`raw_report` longtext,
	`total_count` int NOT NULL DEFAULT 0,
	`passed_count` int NOT NULL DEFAULT 0,
	`failed_count` int NOT NULL DEFAULT 0,
	`skipped_count` int NOT NULL DEFAULT 0,
	`blocked_count` int NOT NULL DEFAULT 0,
	`unknown_count` int NOT NULL DEFAULT 0,
	`duration_ms` int NOT NULL DEFAULT 0,
	`started_at` varchar(32),
	`finished_at` varchar(32),
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `automation_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `automation_runs_project_external_unique` UNIQUE(`project_id`,`external_id`)
);
--> statement-breakpoint
CREATE TABLE `automation_test_case_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`result_id` int,
	`test_id` int NOT NULL,
	`automation_suite` varchar(255),
	`automation_name` varchar(512) NOT NULL,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `automation_test_case_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `automation_links_result_test_unique` UNIQUE(`result_id`,`test_id`)
);
--> statement-breakpoint
CREATE TABLE `automation_test_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`run_id` int NOT NULL,
	`project_id` int NOT NULL,
	`external_id` varchar(255),
	`name` varchar(512) NOT NULL,
	`suite` varchar(255),
	`file_path` text,
	`status` varchar(32) NOT NULL DEFAULT 'unknown',
	`duration_ms` int NOT NULL DEFAULT 0,
	`manual_test_id` int,
	`case_key` varchar(128),
	`error_message` text,
	`stack_trace` mediumtext,
	`stdout` mediumtext,
	`stderr` mediumtext,
	`retry_count` int NOT NULL DEFAULT 0,
	`started_at` varchar(32),
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `automation_test_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_api_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`token_prefix` varchar(32) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`last_used_at` varchar(32),
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `project_api_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_api_tokens_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `project_docs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`title` text NOT NULL,
	`category` varchar(128),
	`content` text,
	`status` varchar(64) NOT NULL DEFAULT 'Published',
	`created_at` varchar(32),
	`updated_at` varchar(32),
	CONSTRAINT `project_docs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` varchar(255),
	`status` varchar(64),
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `run_item_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`run_id` int NOT NULL,
	`test_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`content_type` varchar(128),
	`size_bytes` int,
	`uploaded_by_name` varchar(255),
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `run_item_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`project_id` int,
	CONSTRAINT `sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(255) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `test_case_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`test_id` int NOT NULL,
	`project_id` int,
	`actor_id` int,
	`actor_name` varchar(255),
	`action` varchar(64) NOT NULL,
	`summary` text NOT NULL,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `test_case_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `test_run_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`run_id` int,
	`test_id` int,
	`test_title` text,
	`status` varchar(64),
	`comment` text,
	`executed_by_id` varchar(255),
	`executed_by_name` varchar(255),
	`executed_at` varchar(32),
	CONSTRAINT `test_run_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `test_run_items_run_test_unique` UNIQUE(`run_id`,`test_id`)
);
--> statement-breakpoint
CREATE TABLE `test_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int,
	`name` text NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'In progress',
	CONSTRAINT `test_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` text NOT NULL,
	`steps` text,
	`expected` text,
	`status` varchar(64),
	`priority` varchar(64),
	`case_type` varchar(64),
	`archived_from_status` varchar(64),
	`section_id` int,
	`project_id` int,
	`sort_order` int,
	`created_at` varchar(32),
	`updated_at` varchar(32),
	CONSTRAINT `tests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(255) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `automation_attachments_result_id_idx` ON `automation_attachments` (`result_id`);--> statement-breakpoint
CREATE INDEX `automation_attachments_run_id_idx` ON `automation_attachments` (`run_id`);--> statement-breakpoint
CREATE INDEX `automation_attachments_project_id_idx` ON `automation_attachments` (`project_id`);--> statement-breakpoint
CREATE INDEX `automation_runs_project_id_idx` ON `automation_runs` (`project_id`);--> statement-breakpoint
CREATE INDEX `automation_runs_status_idx` ON `automation_runs` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `automation_runs_started_at_idx` ON `automation_runs` (`project_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `automation_links_result_id_idx` ON `automation_test_case_links` (`result_id`);--> statement-breakpoint
CREATE INDEX `automation_links_test_id_idx` ON `automation_test_case_links` (`test_id`);--> statement-breakpoint
CREATE INDEX `automation_links_project_suite_idx` ON `automation_test_case_links` (`project_id`,`automation_suite`);--> statement-breakpoint
CREATE INDEX `automation_results_run_id_idx` ON `automation_test_results` (`run_id`);--> statement-breakpoint
CREATE INDEX `automation_results_project_status_idx` ON `automation_test_results` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `automation_results_project_suite_idx` ON `automation_test_results` (`project_id`,`suite`);--> statement-breakpoint
CREATE INDEX `automation_results_project_name_idx` ON `automation_test_results` (`project_id`,`name`);--> statement-breakpoint
CREATE INDEX `automation_results_manual_test_idx` ON `automation_test_results` (`manual_test_id`);--> statement-breakpoint
CREATE INDEX `project_api_tokens_project_id_idx` ON `project_api_tokens` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_api_tokens_prefix_idx` ON `project_api_tokens` (`token_prefix`);--> statement-breakpoint
CREATE INDEX `project_docs_project_id_idx` ON `project_docs` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_docs_status_idx` ON `project_docs` (`status`);--> statement-breakpoint
CREATE INDEX `projects_slug_idx` ON `projects` (`slug`);--> statement-breakpoint
CREATE INDEX `run_item_attachments_run_test_idx` ON `run_item_attachments` (`run_id`,`test_id`);--> statement-breakpoint
CREATE INDEX `sections_project_id_idx` ON `sections` (`project_id`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `test_case_activity_test_id_idx` ON `test_case_activity` (`test_id`);--> statement-breakpoint
CREATE INDEX `test_case_activity_project_id_idx` ON `test_case_activity` (`project_id`);--> statement-breakpoint
CREATE INDEX `test_run_items_run_id_idx` ON `test_run_items` (`run_id`);--> statement-breakpoint
CREATE INDEX `test_run_items_test_id_idx` ON `test_run_items` (`test_id`);--> statement-breakpoint
CREATE INDEX `test_runs_project_id_idx` ON `test_runs` (`project_id`);--> statement-breakpoint
CREATE INDEX `tests_section_id_idx` ON `tests` (`section_id`);--> statement-breakpoint
CREATE INDEX `tests_project_id_idx` ON `tests` (`project_id`);--> statement-breakpoint
CREATE INDEX `tests_repository_order_idx` ON `tests` (`project_id`,`section_id`,`sort_order`,`id`);--> statement-breakpoint
CREATE INDEX `tests_repository_status_idx` ON `tests` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `tests_repository_filter_idx` ON `tests` (`project_id`,`status`,`priority`,`case_type`,`section_id`,`id`);--> statement-breakpoint
CREATE INDEX `tests_repository_filter_order_idx` ON `tests` (`project_id`,`status`,`priority`,`case_type`,`section_id`,`sort_order`,`id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);