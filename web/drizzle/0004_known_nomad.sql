ALTER TABLE `automation_test_case_links` DROP FOREIGN KEY `automation_test_case_links_result_id_automation_test_results_id_fk`;
--> statement-breakpoint
ALTER TABLE `test_runs` ADD `release_name` varchar(255);--> statement-breakpoint
ALTER TABLE `test_runs` ADD `jira_version_id` varchar(64);--> statement-breakpoint
ALTER TABLE `tests` ADD `preconditions` longtext;--> statement-breakpoint
ALTER TABLE `tests` ADD `tags` longtext;--> statement-breakpoint
ALTER TABLE `tests` ADD `refs` longtext;--> statement-breakpoint
ALTER TABLE `automation_test_case_links` ADD CONSTRAINT `atcl_result_id_fk` FOREIGN KEY (`result_id`) REFERENCES `automation_test_results`(`id`) ON DELETE cascade ON UPDATE no action;