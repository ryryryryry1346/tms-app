# TMS Web App

This is the active TanStack Start application for TMS.

## Stack

- TanStack Start
- React
- Vite
- TypeScript
- MySQL
- Drizzle ORM

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Database

Schema and SQL migrations live in:

- [`drizzle.config.ts`](C:/myapp/web/drizzle.config.ts)
- [`drizzle/0000_initial.sql`](C:/myapp/web/drizzle/0000_initial.sql)
- [`drizzle/0001_users_auth.sql`](C:/myapp/web/drizzle/0001_users_auth.sql)

## Important directories

- [`src/routes`](C:/myapp/web/src/routes): route files
- [`src/features`](C:/myapp/web/src/features): domain server/client logic
- [`src/db`](C:/myapp/web/src/db): Drizzle schema and MySQL client

## Deployment

Render staging is configured from the repository root via [`render.yaml`](C:/myapp/render.yaml).

The working Render start command is:

```bash
./node_modules/.bin/srvx --prod --dir . --entry dist/server/server.js --static dist/client
```
