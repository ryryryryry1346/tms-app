CREATE INDEX tests_repository_status_idx ON tests (project_id, status);
CREATE INDEX tests_repository_filter_idx ON tests (project_id, status, priority, case_type, section_id, id);
