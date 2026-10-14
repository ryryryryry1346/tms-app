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

CREATE INDEX `test_case_activity_test_id_idx` ON `test_case_activity` (`test_id`);
CREATE INDEX `test_case_activity_project_id_idx` ON `test_case_activity` (`project_id`);
