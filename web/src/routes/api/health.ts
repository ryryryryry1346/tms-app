import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        let database: 'ok' | 'error' | 'not_configured' = 'not_configured'

        try {
          const { getDb, isDatabaseConfigured } = await import('../../db/client')

          if (isDatabaseConfigured()) {
            const { sql } = await import('drizzle-orm')
            await getDb().execute(sql`select 1`)
            database = 'ok'
          }
        } catch {
          database = 'error'
        }

        const healthy = database !== 'error'

        return new Response(
          JSON.stringify({
            status: healthy ? 'ok' : 'degraded',
            database,
            time: new Date().toISOString(),
          }),
          {
            status: healthy ? 200 : 503,
            headers: { 'content-type': 'application/json' },
          },
        )
      },
    },
  },
})
