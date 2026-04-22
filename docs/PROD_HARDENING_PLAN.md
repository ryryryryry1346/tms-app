# Prod Hardening Plan

## Scope
This document prepares the migrated TypeScript application in `C:\myapp\web` for a safe staging rollout and a later production cutover.

It does not replace the old Flask app yet. The Flask/PostgreSQL app remains the source of truth until staging validation and data migration checks pass.

## 1. Current Source and Target

### Source application
- Runtime: Flask + Jinja
- Database: PostgreSQL via `DATABASE_URL`
- Current schema confirmed in `C:\myapp\models.py`:
  - `projects(id, name)`
  - `sections(id, name, project_id)`
  - `tests(id, title, steps, expected, status, section_id, project_id)`
  - `test_runs(id, project_id, name)`
  - `test_run_items(id, run_id, test_id, status)`

### Target application
- Runtime: TanStack Start + React + Vite + TypeScript
- Database: MySQL via `MYSQL_DATABASE_URL`
- ORM/migrations: Drizzle
- Current schema confirmed in `C:\myapp\web\src\db\schema.ts`:
  - `projects`
  - `users`
  - `sections`
  - `tests`
  - `test_runs`
  - `test_run_items`

## 2. PostgreSQL -> MySQL Data Migration Mapping

### Direct table mapping
The current migration is intentionally conservative. For the confirmed domain tables, data mapping is one-to-one:

| PostgreSQL source | MySQL target | Notes |
| --- | --- | --- |
| `projects` | `projects` | Copy `id`, `name` as-is |
| `sections` | `sections` | Copy `id`, `name`, `project_id` as-is |
| `tests` | `tests` | Copy `id`, `title`, `steps`, `expected`, `status`, `section_id`, `project_id` as-is |
| `test_runs` | `test_runs` | Copy `id`, `project_id`, `name` as-is |
| `test_run_items` | `test_run_items` | Copy `id`, `run_id`, `test_id`, `status` as-is |

### Users table
`users` exists in the migrated MySQL schema, but is not present in the current local `C:\myapp\models.py`.

That means one of these is true:
- production PostgreSQL still has a historical `users` table from the older monolith
- the current deployed Flask auth flow is not backed by this local modular code
- staging will need a fresh auth bootstrap instead of user migration

Do not guess here. Before any cutover, run a source-database check:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

If `users` exists in PostgreSQL, migrate:

| PostgreSQL source | MySQL target | Notes |
| --- | --- | --- |
| `users` | `users` | Copy `id`, `username`, `password` exactly; do not rehash during transfer |

If `users` does not exist in PostgreSQL:
- do not invent user migration
- create staging users explicitly in MySQL
- decide production auth bootstrap separately before cutover

## 3. Recommended Migration Order

To preserve IDs and keep joins stable, import in this order:

1. `projects`
2. `users` if confirmed in PostgreSQL
3. `sections`
4. `tests`
5. `test_runs`
6. `test_run_items`

After import, reset MySQL auto-increment values above the current max ID for every table.

## 4. Preflight Checks Before Export

Run these checks on PostgreSQL before exporting:

```sql
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM sections;
SELECT COUNT(*) FROM tests;
SELECT COUNT(*) FROM test_runs;
SELECT COUNT(*) FROM test_run_items;
```

If `users` exists:

```sql
SELECT COUNT(*) FROM users;
```

Check for null or unexpected values that could break stricter TypeScript expectations:

```sql
SELECT COUNT(*) FROM tests WHERE title IS NULL;
SELECT COUNT(*) FROM projects WHERE name IS NULL;
SELECT COUNT(*) FROM test_runs WHERE name IS NULL;
SELECT status, COUNT(*) FROM tests GROUP BY status ORDER BY status;
SELECT status, COUNT(*) FROM test_run_items GROUP BY status ORDER BY status;
```

Check for duplicate per-run execution rows that may become a later hardening problem:

```sql
SELECT run_id, test_id, COUNT(*) AS duplicate_count
FROM test_run_items
GROUP BY run_id, test_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, run_id, test_id;
```

If duplicates exist, do not add a unique MySQL constraint yet. Import the data first, then decide the deduplication rule explicitly.

## 5. Export and Import Strategy

### Export format
Use table-by-table SQL or CSV export. Do not perform in-flight transformation unless a confirmed incompatibility requires it.

### Import principle
- preserve primary keys
- preserve password hashes exactly
- preserve HTML in `tests.steps` and `tests.expected` exactly
- preserve `Passed` and `Failed` status values exactly
- do not normalize or sanitize during import

### Auto-increment reset examples
Run after import in MySQL:

```sql
ALTER TABLE projects AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE sections AUTO_INCREMENT = 1;
ALTER TABLE tests AUTO_INCREMENT = 1;
ALTER TABLE test_runs AUTO_INCREMENT = 1;
ALTER TABLE test_run_items AUTO_INCREMENT = 1;
```

Then bump each table above its max ID:

```sql
SELECT MAX(id) + 1 AS next_id FROM projects;
```

Apply the resulting value with:

```sql
ALTER TABLE projects AUTO_INCREMENT = <next_id>;
```

Repeat for all imported tables.

## 6. Post-Import Validation

Run these checks on MySQL and compare them to PostgreSQL:

```sql
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM sections;
SELECT COUNT(*) FROM tests;
SELECT COUNT(*) FROM test_runs;
SELECT COUNT(*) FROM test_run_items;
SELECT COUNT(*) FROM users;
```

Also validate a few relational samples manually:

```sql
SELECT t.id, t.title, s.name, p.name
FROM tests t
LEFT JOIN sections s ON s.id = t.section_id
LEFT JOIN projects p ON p.id = t.project_id
ORDER BY t.id
LIMIT 20;
```

```sql
SELECT tri.run_id, tri.test_id, tri.status, tr.name, t.title
FROM test_run_items tri
LEFT JOIN test_runs tr ON tr.id = tri.run_id
LEFT JOIN tests t ON t.id = tri.test_id
ORDER BY tri.id
LIMIT 20;
```

## 7. Environment and Secrets Checklist

### Old Flask production env
- `DATABASE_URL`
- Cloudinary credentials if old `/upload` flow is still active

### New TypeScript staging/prod env
- `MYSQL_DATABASE_URL`
- `SESSION_SECRET`
- `NODE_ENV=production`
- `CLOUDINARY_URL` or:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

### Secret rules
- `SESSION_SECRET` must be at least 32 characters
- use a new session secret for the TypeScript app; Flask cookies are not portable
- do not share MySQL and PostgreSQL credentials across environments
- keep staging and production databases separate
- keep staging and production Cloudinary credentials separate if possible

### Runtime compatibility checklist
- Node version must satisfy `>=22.12.0`
- MySQL user must have rights to:
  - create schema objects during migration
  - read/write application tables at runtime
- Render service must point at `C:\myapp\web` build/start workflow, not the Flask root

## 8. Staging Rollout Plan

### Stage A: Infrastructure
1. Provision a separate staging MySQL database.
2. Provision a separate staging service for the TypeScript app.
3. Set staging env vars only.
4. Run Drizzle migrations against staging MySQL.

### Stage B: Data copy
1. Export PostgreSQL data from current production source.
2. Import into staging MySQL using the mapping above.
3. Reset MySQL auto-increment values.
4. Run row-count and sample-data validation.

### Stage C: Smoke tests
Run these flows in staging:
1. Register or log in with a staging user.
2. Open dashboard and select a project.
3. Browse sections and tests.
4. Open test detail.
5. Change test status.
6. Create a test.
7. Paste or drop an image into create-test and confirm Cloudinary URL insertion.
8. Create a run.
9. Open a run.
10. Mark tests `Passed` and `Failed` and confirm persisted run results after reload.

### Stage D: Operational checks
1. Verify session cookies are secure in production mode.
2. Verify MySQL connection stability after multiple requests.
3. Verify Cloudinary upload failures surface a user-visible error.
4. Verify direct route access redirects unauthenticated users to `/login`.
5. Capture app logs for auth, DB, and media errors.

## 9. Production Cutover Plan

Do not do an in-place swap first. Use a short freeze window.

### Recommended cutover sequence
1. Announce a short content-freeze window.
2. Stop creating new data in the Flask app.
3. Take a final PostgreSQL export.
4. Import the final snapshot into production MySQL.
5. Run validation counts and spot checks.
6. Deploy the TypeScript app with production env vars.
7. Run smoke tests against the production URL.
8. Keep the Flask deployment available for rollback until the new app is stable.

### Cutover success criteria
- login works
- project dashboard loads
- tests render under the correct project/section
- create test works
- image upload works
- run creation works
- run execution status persists across refresh

## 10. Rollback Plan

Rollback should be service-level, not data-destructive:

1. Switch traffic back to the Flask service.
2. Preserve the MySQL database for inspection.
3. Do not delete imported MySQL data during the incident.
4. Compare:
   - failing route
   - source data row
   - migrated MySQL row
   - application error logs

## 11. Known Risks and Unknowns

- `users` presence in real production PostgreSQL is still unconfirmed from the current local modular codebase.
- Existing password-hash compatibility is implemented, but must be validated against real migrated user rows before production cutover.
- `test_run_items` currently has no unique constraint on `(run_id, test_id)`. That is safer for import compatibility, but it should be revisited after production data is understood.
- HTML in `tests.steps` and `tests.expected` is preserved as-is to match current behavior. This keeps compatibility, but does not reduce XSS risk.
- There is no documented Render config for the new TypeScript service in the repository yet.

## 12. Recommended Next Hardening Step

After staging data migration succeeds, the next safe additive step is:

1. add a production deployment manifest or documented Render service config for `C:\myapp\web`
2. add a post-import validation checklist runbook
3. only after duplicate analysis, consider an additive MySQL migration for `test_run_items(run_id, test_id)` uniqueness
