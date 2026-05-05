# tms-app

This repository now uses the TypeScript application in [`web/`](C:/myapp/web) as the primary codebase.

## Current app

- Stack: TanStack Start, React, Vite, TypeScript, MySQL, Drizzle ORM
- Main source: [`web/src`](C:/myapp/web/src)
- Staging deploy config: [`render.yaml`](C:/myapp/render.yaml)
- Migration notes and rollout docs: [`docs/`](C:/myapp/docs)

## Repository layout

- [`web/`](C:/myapp/web): active TypeScript application
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

- The old Flask/Jinja implementation has been removed from the repository to keep ongoing product work focused on the TypeScript app.
