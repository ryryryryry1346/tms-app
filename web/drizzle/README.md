# Drizzle migrations

The official migration history is whatever `meta/_journal.json` lists; only
those files are applied/tracked by `npm run db:migrate`:

- `0000_jazzy_sandman.sql` … `0003_far_lady_deathstrike.sql` — baseline schema
- `0004_known_nomad.sql` — run release columns, case preconditions/tags/refs
- `0005_lame_crystal.sql`, `0006_add_auto_create_bug_on_failure.sql` —
  `project_integrations` table
- `0007_brown_plazm.sql` — `project_notification_channels` table
- `0008_heavy_marvex.sql` — threaded `comments`
- `0009_faulty_unus.sql` — doc categories, pinning and doc authors

`project_integrations`, `project_notification_channels` and
`test_runs.jira_version_id` come from the shared history with the company
edition of this app. This edition does not use them, but the migrations stay
in the journal so the chain is identical on every database and future
migrations apply cleanly.

New schema changes: edit `src/db/schema.ts`, run `npm run db:generate`, and
commit the generated `.sql` together with `meta/*` in the same commit.

## Adopting the journal on an existing database

- Database already tracked (`__drizzle_migrations` exists): just run
  `npm run db:migrate`; it applies whatever is missing.
- Database built with `drizzle-kit push` / by hand and NOT tracked: make sure
  its schema matches `src/db/schema.ts` first (e.g. `npm run db:migrate` on a
  copy, or compare with `scripts/dump-schema.mjs`), then run
  `node scripts/baseline-drizzle.mjs`, which marks every journal entry as
  applied without running its SQL.

## `_archive/`

Contains ~20 hand-numbered `.sql` files (`0000_initial.sql` ...
`0020_run_item_attachments.sql`) from before this repo adopted versioned
Drizzle migrations. None of them are referenced by `meta/_journal.json`, so
`drizzle-kit` ignores them entirely - they're kept only as a historical
record. Do not add new migrations here.
