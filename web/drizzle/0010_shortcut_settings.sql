CREATE TABLE `project_shortcut_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`api_token` text,
	`workflow_state_id` int,
	`workflow_state_name` varchar(255),
	`group_id` varchar(64),
	`group_name` varchar(255),
	`story_type` varchar(16) NOT NULL DEFAULT 'chore',
	`label_name` varchar(64),
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `project_shortcut_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_shortcut_settings_project_id_unique` UNIQUE(`project_id`)
);
--> statement-breakpoint
ALTER TABLE `project_shortcut_settings` ADD CONSTRAINT `project_shortcut_settings_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;