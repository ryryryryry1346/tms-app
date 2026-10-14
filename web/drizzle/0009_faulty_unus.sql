CREATE TABLE `doc_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`color` varchar(16) NOT NULL,
	`icon` varchar(32) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`created_at` varchar(32),
	CONSTRAINT `doc_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `doc_categories_project_name_unique` UNIQUE(`project_id`,`name`)
);
--> statement-breakpoint
ALTER TABLE `project_docs` ADD `pinned_at` varchar(32);--> statement-breakpoint
ALTER TABLE `project_docs` ADD `created_by` varchar(255);--> statement-breakpoint
ALTER TABLE `project_docs` ADD `updated_by` varchar(255);--> statement-breakpoint
ALTER TABLE `doc_categories` ADD CONSTRAINT `doc_categories_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_docs` ADD CONSTRAINT `project_docs_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_docs` ADD CONSTRAINT `project_docs_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;