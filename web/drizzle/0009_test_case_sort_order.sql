ALTER TABLE `tests`
  ADD COLUMN `sort_order` int;

UPDATE `tests`
SET `sort_order` = `id`
WHERE `sort_order` IS NULL;
