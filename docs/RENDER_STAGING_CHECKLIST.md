# Render Staging Service Checklist

Use this checklist when creating the first Render staging service for the migrated TypeScript app in `C:\myapp\web`.

## 1. Service Creation
- Create a new `Web Service` in Render from the existing repository.
- Point the service at the repository root that contains `C:\myapp\web`.
- Use the Blueprint in [render.yaml](</C:/myapp/render.yaml:1>) or mirror its values manually.
- Confirm the service root directory is `web`.

## 2. Runtime Settings
- Runtime: `Node`
- Node version: `22.12.0` or newer
- Build command: `npm install && npm run build`
- Start command: `./node_modules/.bin/srvx dist/server/server.js`
- Health check path: `/login`
- Auto deploy: keep `off` until the first staging validation passes

## 3. Staging Environment Variables
- `NODE_ENV=production`
- `MYSQL_DATABASE_URL=<staging-mysql-connection-string>`
- `SESSION_SECRET=<new-secret-at-least-32-characters>`
- `CLOUDINARY_URL=<staging-or-approved-cloudinary-connection-string>`

Optional if you do not want to use `CLOUDINARY_URL`:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## 4. Database Preparation
- Provision a separate staging MySQL database.
- Run Drizzle migrations against staging MySQL before the first app boot.
- Import PostgreSQL data only after the schema exists.
- Preserve source IDs during import.

## 5. First Deploy Validation
- Trigger the first staging deploy manually.
- Confirm the service becomes healthy on `/login`.
- Confirm app logs do not show:
  - missing `MYSQL_DATABASE_URL`
  - missing `SESSION_SECRET`
  - missing Cloudinary configuration
  - unsupported Node version

## 6. After Deploy
- Run the checklist in [STAGING_SMOKE_TESTS.md](</C:/myapp/docs/STAGING_SMOKE_TESTS.md:1>).
- Compare row counts between PostgreSQL and staging MySQL.
- Keep the current Flask production service unchanged.

## 7. Do Not Do Yet
- Do not repoint the production custom domain.
- Do not reuse the production PostgreSQL connection string in the TypeScript app.
- Do not delete the Flask service.
- Do not enable auto deploy before a clean staging validation cycle.
