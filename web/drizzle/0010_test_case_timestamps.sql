ALTER TABLE `tests`
  ADD COLUMN `created_at` varchar(32),
  ADD COLUMN `updated_at` varchar(32);

UPDATE `tests`
SET
  `created_at` = COALESCE(`created_at`, DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%s.000Z')),
  `updated_at` = COALESCE(`updated_at`, DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%s.000Z'));
