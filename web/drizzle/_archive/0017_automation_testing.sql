CREATE TABLE automation_runs (
  id int AUTO_INCREMENT PRIMARY KEY,
  project_id int NOT NULL,
  external_id varchar(255),
  name text NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'unknown',
  environment varchar(128),
  branch varchar(255),
  commit_sha varchar(128),
  ci_build_url text,
  trigger_source varchar(32) NOT NULL DEFAULT 'api',
  raw_format varchar(64) NOT NULL DEFAULT 'junit',
  raw_report text,
  total_count int NOT NULL DEFAULT 0,
  passed_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0,
  blocked_count int NOT NULL DEFAULT 0,
  unknown_count int NOT NULL DEFAULT 0,
  duration_ms int NOT NULL DEFAULT 0,
  started_at varchar(32),
  finished_at varchar(32),
  created_at varchar(32) NOT NULL,
  updated_at varchar(32) NOT NULL
);

CREATE INDEX automation_runs_project_id_idx ON automation_runs (project_id);
CREATE INDEX automation_runs_status_idx ON automation_runs (project_id, status);
CREATE INDEX automation_runs_started_at_idx ON automation_runs (project_id, started_at);
CREATE UNIQUE INDEX automation_runs_project_external_unique ON automation_runs (project_id, external_id);

CREATE TABLE automation_test_results (
  id int AUTO_INCREMENT PRIMARY KEY,
  run_id int NOT NULL,
  project_id int NOT NULL,
  external_id varchar(255),
  name varchar(512) NOT NULL,
  suite varchar(255),
  file_path text,
  status varchar(32) NOT NULL DEFAULT 'unknown',
  duration_ms int NOT NULL DEFAULT 0,
  manual_test_id int,
  case_key varchar(128),
  error_message text,
  stack_trace text,
  stdout text,
  stderr text,
  retry_count int NOT NULL DEFAULT 0,
  started_at varchar(32),
  created_at varchar(32) NOT NULL
);

CREATE INDEX automation_results_run_id_idx ON automation_test_results (run_id);
CREATE INDEX automation_results_project_status_idx ON automation_test_results (project_id, status);
CREATE INDEX automation_results_project_suite_idx ON automation_test_results (project_id, suite);
CREATE INDEX automation_results_project_name_idx ON automation_test_results (project_id, name);
CREATE INDEX automation_results_manual_test_idx ON automation_test_results (manual_test_id);

CREATE TABLE automation_attachments (
  id int AUTO_INCREMENT PRIMARY KEY,
  result_id int,
  run_id int NOT NULL,
  project_id int NOT NULL,
  name varchar(255) NOT NULL,
  type varchar(64),
  url text NOT NULL,
  content_type varchar(128),
  size_bytes int,
  created_at varchar(32) NOT NULL
);

CREATE INDEX automation_attachments_result_id_idx ON automation_attachments (result_id);
CREATE INDEX automation_attachments_run_id_idx ON automation_attachments (run_id);
CREATE INDEX automation_attachments_project_id_idx ON automation_attachments (project_id);

CREATE TABLE automation_test_case_links (
  id int AUTO_INCREMENT PRIMARY KEY,
  project_id int NOT NULL,
  result_id int,
  test_id int NOT NULL,
  automation_suite varchar(255),
  automation_name varchar(512) NOT NULL,
  created_at varchar(32) NOT NULL,
  updated_at varchar(32) NOT NULL
);

CREATE INDEX automation_links_result_id_idx ON automation_test_case_links (result_id);
CREATE INDEX automation_links_test_id_idx ON automation_test_case_links (test_id);
CREATE INDEX automation_links_project_suite_idx ON automation_test_case_links (project_id, automation_suite);
CREATE UNIQUE INDEX automation_links_result_test_unique ON automation_test_case_links (result_id, test_id);

CREATE TABLE project_api_tokens (
  id int AUTO_INCREMENT PRIMARY KEY,
  project_id int NOT NULL,
  name varchar(255) NOT NULL,
  token_hash varchar(255) NOT NULL,
  token_prefix varchar(32) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'active',
  last_used_at varchar(32),
  created_at varchar(32) NOT NULL,
  updated_at varchar(32) NOT NULL
);

CREATE INDEX project_api_tokens_project_id_idx ON project_api_tokens (project_id);
CREATE UNIQUE INDEX project_api_tokens_hash_unique ON project_api_tokens (token_hash);
CREATE INDEX project_api_tokens_prefix_idx ON project_api_tokens (token_prefix);
