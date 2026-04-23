ALTER TABLE `test_run_items`
  ADD COLUMN `test_title` text;

CREATE UNIQUE INDEX `test_run_items_run_test_unique`
  ON `test_run_items` (`run_id`, `test_id`);
