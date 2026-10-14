CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`entity_type` varchar(32) NOT NULL,
	`entity_id` int NOT NULL,
	`parent_id` int,
	`author_id` varchar(255),
	`body` text NOT NULL,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32),
	`deleted_at` varchar(32),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_author_id_user_id_fk` FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `comments_entity_idx` ON `comments` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `comments_project_id_idx` ON `comments` (`project_id`);--> statement-breakpoint
CREATE INDEX `comments_parent_id_idx` ON `comments` (`parent_id`);