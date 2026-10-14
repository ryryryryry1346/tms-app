CREATE TABLE `project_integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`jira_base_url` varchar(255),
	`jira_email` varchar(255),
	`jira_api_token` text,
	`jira_project_key` varchar(64),
	`jira_issue_type` varchar(64),
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `project_integrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_integrations_project_id_unique` UNIQUE(`project_id`)
);
--> statement-breakpoint
ALTER TABLE `project_integrations` ADD CONSTRAINT `project_integrations_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;