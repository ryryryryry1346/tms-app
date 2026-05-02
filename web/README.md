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

## Server Boundaries

Route files import `createServerFn` exports from `src/features/*/server.ts`, so
those `server.ts` modules must stay browser-safe at top level.

Do not add top-level imports of DB, Node-only, or server SDK modules there:

- `../../db/client`
- `../../db/schema`
- `drizzle-orm`
- `node:*`
- `cloudinary`

Load those dependencies inside the `createServerFn` handler with `await import(...)`,
or move the implementation into a `*.server.ts` helper and import it lazily from the
handler. This prevents MySQL, Drizzle, Cloudinary, or Node built-ins from leaking into
the client bundle and breaking hydration.

The production build runs `npm run check:boundaries` before Vite to catch regressions.

## Deployment

Render staging is configured from the repository root via [`render.yaml`](C:/myapp/render.yaml).

The working Render start command is:

```bash
./node_modules/.bin/srvx --prod --dir . --entry dist/server/server.js --static dist/client
```
