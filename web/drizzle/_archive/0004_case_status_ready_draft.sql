UPDATE `tests`
SET `status` = CASE
  WHEN `status` IN ('Passed', 'Failed') THEN 'Ready'
  WHEN `status` IS NULL OR TRIM(`status`) = '' THEN 'Draft'
  ELSE `status`
END;
