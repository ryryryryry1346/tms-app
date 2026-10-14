ALTER TABLE `tests`
  ADD COLUMN `archived_from_status` varchar(64);

UPDATE `tests`
SET `archived_from_status` = 'Ready'
WHERE `status` = 'Archived' AND `archived_from_status` IS NULL;
