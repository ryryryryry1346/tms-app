CREATE INDEX projects_slug_idx ON projects (slug);
CREATE INDEX tests_repository_order_idx ON tests (project_id, section_id, sort_order, id);
