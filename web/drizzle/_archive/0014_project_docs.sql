CREATE TABLE `project_docs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `project_id` int NOT NULL,
  `title` text NOT NULL,
  `category` varchar(128),
  `content` text,
  `status` varchar(64) NOT NULL DEFAULT 'Published',
  `created_at` varchar(32),
  `updated_at` varchar(32),
  CONSTRAINT `project_docs_id` PRIMARY KEY (`id`)
);

CREATE INDEX `project_docs_project_id_idx` ON `project_docs` (`project_id`);
CREATE INDEX `project_docs_status_idx` ON `project_docs` (`status`);
