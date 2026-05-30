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
  CONSTRAINT `run_item_attachments_id` PRIMARY KEY (`id`)
);

CREATE INDEX `run_item_attachments_run_test_idx` ON `run_item_attachments` (`run_id`,`test_id`);
