# TMS — Test Management System

Test management app: test case repository (suites, structured steps, tags,
references), manual runs with per-step execution and releases, automation
results imported from CI (JUnit / JSON), project docs with categories and
comments, reports, and per-project roles (Owner / Editor / Viewer).

Staging: https://tms-app-web-staging.onrender.com

## Stack

TanStack Start, React 19, Vite, TypeScript, MySQL (Drizzle ORM), Better Auth,
Tiptap, Tailwind CSS v4. Node.js 22.12 or newer.

## Repository layout

- `web/` — the application (`web/src` sources, `web/drizzle` migrations)
- `docs/` — operational notes; `docs/archive/` keeps older migration-era docs
- `render.yaml` — Render blueprint

## Local development

```bash
cd web
cp .env.example .env      # fill in the values, see comments inside
npm install
npm run db:migrate        # apply migrations to MYSQL_DATABASE_URL
npm run dev               # http://localhost:3000
```

Other commands: `npm run build`, `npm run typecheck`, `npm test`.

## External services

| Service | Used for | Required |
|---|---|---|
| MySQL 8 | all data | yes |
| Media storage | images and attachments: local disk (`STORAGE_DRIVER=local`) or Cloudinary | one of them |
| Mail | verification and password reset: SMTP, Resend or log-only (`MAIL_DRIVER`) | yes with open sign-up |
| Shortcut | "Create Shortcut story" in Repository | no |

Secrets (`BETTER_AUTH_SECRET`, database URL, mail/storage credentials) never go
into the repository: use `web/.env`, which is gitignored.
