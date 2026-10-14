# Staging Smoke Tests

Use this checklist after the PostgreSQL -> MySQL staging import and after every staging deployment of the TypeScript app.

## Auth
- Open `/login`
- Log in with a staging user
- Confirm unauthenticated access to `/` redirects to `/login`
- Confirm logout clears the session and redirects back to `/login`

## Dashboard
- Open `/`
- Confirm projects list is visible
- Select a project
- Confirm only that project's sections are shown
- Confirm tests appear under the expected sections

## Tests
- Open a test detail page
- Confirm title, steps, expected result, and status render
- Change a test status from the dashboard
- Refresh and confirm the new status persists
- Create a new test in a populated section
- Refresh and confirm the new test appears under the correct project and section

## Media Upload
- Open create-test
- Paste an image into the steps editor
- Confirm the editor inserts an image URL-backed element
- Save the test and confirm the image remains in rendered test content
- Repeat with drag-and-drop

## Runs
- Create a run inside a selected project
- Open the run detail page
- Mark one test `Passed`
- Mark another test `Failed`
- Refresh the run page
- Confirm per-run statuses persist

## Data Integrity
- Spot-check at least 3 historical tests from PostgreSQL against MySQL
- Spot-check at least 3 historical runs and their `test_run_items`
- Confirm imported IDs are preserved

## Failure Logging
- Capture any auth, DB, or Cloudinary error from staging logs
- Record the route, user action, and exact failing row if the issue is data-specific
