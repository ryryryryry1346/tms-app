CREATE TABLE `project_notification_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`type` varchar(32) NOT NULL,
	`webhook_url` text,
	`enabled` boolean NOT NULL DEFAULT false,
	`notify_on_automation_failure` boolean NOT NULL DEFAULT true,
	`notify_on_jira_bug_created` boolean NOT NULL DEFAULT true,
	`notify_on_run_completed` boolean NOT NULL DEFAULT false,
	`notify_on_release_linked` boolean NOT NULL DEFAULT false,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `project_notification_channels_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_notification_channels_project_type_unique` UNIQUE(`project_id`,`type`)
);
--> statement-breakpoint
ALTER TABLE `project_notification_channels` ADD CONSTRAINT `project_notification_channels_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;