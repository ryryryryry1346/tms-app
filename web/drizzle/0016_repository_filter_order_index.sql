CREATE INDEX tests_repository_filter_order_idx ON tests (
  project_id,
  status,
  priority,
  case_type,
  section_id,
  sort_order,
  id
);
