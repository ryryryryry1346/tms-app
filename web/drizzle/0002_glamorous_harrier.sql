CREATE TABLE `project_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`role` varchar(32) NOT NULL DEFAULT 'editor',
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `project_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_members_project_user_unique` UNIQUE(`project_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `project_members_user_id_idx` ON `project_members` (`user_id`);