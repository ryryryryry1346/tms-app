ALTER TABLE `tests`
  ADD COLUMN `priority` varchar(64),
  ADD COLUMN `case_type` varchar(64);

UPDATE `tests`
SET `priority` = 'Medium'
WHERE `priority` IS NULL OR TRIM(`priority`) = '';

UPDATE `tests`
SET `case_type` = 'Functional'
WHERE `case_type` IS NULL OR TRIM(`case_type`) = '';
