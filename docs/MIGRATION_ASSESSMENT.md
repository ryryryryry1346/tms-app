# Migration Assessment

## 1. Current Python Stack

- Runtime: Python
- Web framework: Flask
- Templates: Jinja2 templates rendered on the server
- Database driver: `psycopg2`
- Current database: PostgreSQL via `DATABASE_URL`
- Deployment hints: `gunicorn` is listed in `requirements.txt`
- File/media hint: `cloudinary` is listed in `requirements.txt`

## 2. Current Architecture

- Entry point: `app.py`
- Route modules:
  - `routes/projects.py`
  - `routes/tests.py`
  - `routes/runs.py`
  - `routes/auth.py` exists but is empty
- Data access:
  - direct SQL through `psycopg2`
  - no repository layer
  - no service layer
- Schema bootstrap:
  - `models.py:init_db()` creates tables on app startup
- Rendering model:
  - server-rendered HTML templates in `templates/`
- Static assets:
  - `static/`
- Upload/media folder:
  - `uploads/`

## 3. Important Domain Entities And Flows

### Entities observed in code

- `projects`
- `sections`
- `tests`
- `test_runs`
- `test_run_items`

### Current user-visible flows

1. Dashboard
   - `GET /`
   - loads all projects
   - if `project` query param is present, loads sections and tests for that project

2. Create project
   - `GET/POST /create_project`
   - inserts a project row with `name`

3. Create test
   - `GET/POST /create_test`
   - loads sections
   - inserts a test row with title, steps, expected, status, section, and project

4. Test details
   - `GET /test/<id>`
   - renders one test case

5. Update test status
   - `POST /set_status`
   - updates the `tests.status` field

6. Create test run
   - `POST /create_run`
   - inserts a `test_runs` row

7. Open test run
   - `GET /run/<id>`
   - loads all tests for the run's project

## 4. Data Model And DB Access

### Current schema bootstrapped in `models.py`

- `projects(id, name)`
- `sections(id, name, project_id)`
- `tests(id, title, steps, expected, status, section_id, project_id)`
- `test_runs(id, project_id, name)`
- `test_run_items(id, run_id, test_id, status)`

### Access pattern

- A new DB connection is opened inside each route
- SQL is handwritten inline in route handlers
- No explicit transaction boundaries beyond per-request `commit()`
- No foreign keys
- No indexes beyond PKs
- No migration history
- No validation beyond form access

## 5. Auth / Integrations / Jobs

### Auth

- `routes/auth.py` is empty
- `login.html` and `register.html` exist
- no user table exists in schema
- no session/login logic exists

Conclusion:
- auth UI exists as a stub, but current auth behavior is not implemented

### Integrations

- `cloudinary` dependency is present
- `create_test.html` posts images to `/upload`
- no `/upload` route exists in the current Python code inspected

Conclusion:
- media upload integration is planned or partially implemented in UI, but not currently present end-to-end in this codebase

### Background jobs

- no background jobs or schedulers found in the inspected code

## 6. Risks And Unknowns

### Risks

- The app is currently using PostgreSQL, but the target stack requires MySQL. Data migration is a real migration, not just a framework swap.
- Some apparent product behavior is incomplete today, so we should not invent "intended" behavior during migration.
- `create_test` currently expects `project_id` on POST, but the inspected form does not send it.
- `run.html` posts to `/run_test`, but no such Python route exists in inspected code.
- `/upload` is referenced by the UI, but no inspected backend route implements it.
- `app.secret_key` is hardcoded and `debug=True` is enabled in the current app.

### Unknowns

- Whether production has additional code not present in this working tree
- Whether Render is pointing at exactly this repo state
- Whether PostgreSQL already contains real business data that must be migrated to MySQL
- Whether auth should exist in the first migrated release, given that it is not implemented in the Python backend
- Whether Cloudinary upload was intentionally removed, never implemented, or exists elsewhere outside the inspected code

## 7. Proposed Target Architecture

### High-level shape

- Keep the current Python app in place during migration
- Add a new application in `web/`
- Stack:
  - TanStack Start
  - React
  - Vite
  - TypeScript in strict mode
  - MySQL
  - Drizzle ORM

### Boundaries

- Client:
  - route components
  - forms
  - optimistic UX only where behavior is already explicit

- Server:
  - TanStack Start server functions or server routes
  - all DB access
  - request validation
  - session/auth once requirements are explicit

### Persistence

- `web/src/db/schema.ts`
  - explicit Drizzle tables
- `web/drizzle/`
  - additive SQL migrations
- `web/src/db/client.ts`
  - MySQL connection
- `web/src/features/*`
  - feature-oriented server and UI modules

### Suggested feature slices

- `projects`
- `tests`
- `runs`
- `auth` only after behavior is clarified or discovered

## 8. Incremental Migration Plan

1. Scaffold the new `web/` app
   - keep Flask untouched
   - enable strict TypeScript
   - establish TanStack Start conventions and server/client boundaries

2. Add MySQL + Drizzle infrastructure
   - explicit schema mirroring the current domain model
   - additive migrations only
   - no data deletion

3. Migrate the first stable vertical slice
   - dashboard project listing
   - create project
   - this is the least ambiguous behavior in the Python app

4. Migrate test browsing and status updates
   - preserve current columns and semantics
   - do not add inferred workflow states

5. Migrate create test flow carefully
   - reconcile the current `project_id` mismatch explicitly
   - document whether hidden field or section lookup is the correct preserved behavior

6. Migrate runs read/create flow
   - keep behavior equivalent to current Python code
   - do not invent missing run execution semantics yet

7. Address auth only after requirements are explicit
   - because current backend auth behavior is absent

8. Plan data migration from PostgreSQL to MySQL
   - schema mapping
   - export/import
   - verification scripts
   - cutover plan after feature parity for the selected slice
