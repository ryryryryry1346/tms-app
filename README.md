# tms-app

This repository now uses the TypeScript application in [`web/`](C:/myapp/web) as the primary codebase.

## Current app

- Stack: TanStack Start, React, Vite, TypeScript, MySQL, Drizzle ORM
- Main source: [`web/src`](C:/myapp/web/src)
- Staging deploy config: [`render.yaml`](C:/myapp/render.yaml)
- Migration notes and rollout docs: [`docs/`](C:/myapp/docs)

## Legacy app

The previous Flask/Jinja implementation is preserved in [`legacy/flask/`](C:/myapp/legacy/flask) for reference, rollback support, and data-flow comparison during migration.

It is no longer the active application entrypoint for ongoing product work.

## Repository layout

- [`web/`](C:/myapp/web): active TypeScript application
- [`legacy/flask/`](C:/myapp/legacy/flask): archived Flask source
- [`docs/`](C:/myapp/docs): migration, staging, and production hardening notes
- [`render.yaml`](C:/myapp/render.yaml): Render blueprint for the TypeScript app

## Local development

Run the active app from [`web/`](C:/myapp/web):

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Notes

- The Python code was intentionally moved instead of deleted.
- GitHub should now reflect the migration more clearly: TypeScript is primary, Flask is legacy.
