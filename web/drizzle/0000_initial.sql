CREATE TABLE `projects` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` text NOT NULL,
  CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);

CREATE TABLE `sections` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` text NOT NULL,
  `project_id` int,
  CONSTRAINT `sections_id` PRIMARY KEY(`id`)
);

CREATE TABLE `tests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `title` text NOT NULL,
  `steps` text,
  `expected` text,
  `status` varchar(64),
  `section_id` int,
  `project_id` int,
  CONSTRAINT `tests_id` PRIMARY KEY(`id`)
);

CREATE TABLE `test_runs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `project_id` int,
  `name` text NOT NULL,
  CONSTRAINT `test_runs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `test_run_items` (
  `id` int AUTO_INCREMENT NOT NULL,
  `run_id` int,
  `test_id` int,
  `status` varchar(64),
  CONSTRAINT `test_run_items_id` PRIMARY KEY(`id`)
);

CREATE INDEX `sections_project_id_idx` ON `sections` (`project_id`);
CREATE INDEX `tests_section_id_idx` ON `tests` (`section_id`);
CREATE INDEX `tests_project_id_idx` ON `tests` (`project_id`);
CREATE INDEX `test_runs_project_id_idx` ON `test_runs` (`project_id`);
CREATE INDEX `test_run_items_run_id_idx` ON `test_run_items` (`run_id`);
CREATE INDEX `test_run_items_test_id_idx` ON `test_run_items` (`test_id`);
