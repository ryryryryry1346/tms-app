ALTER TABLE `projects`
  ADD COLUMN `status` varchar(64);

UPDATE `projects`
SET `status` = 'Active'
WHERE `status` IS NULL OR TRIM(`status`) = '';
