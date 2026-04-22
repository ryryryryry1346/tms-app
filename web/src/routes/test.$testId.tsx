import {
  Link,
  createFileRoute,
  notFound,
} from '@tanstack/react-router'
import { getTestDetail } from '../features/tests/server'

export const Route = createFileRoute('/test/$testId')({
  loader: async ({ params }) => {
    const testId = Number(params.testId)

    if (!Number.isInteger(testId) || testId <= 0) {
      throw notFound()
    }

    return getTestDetail({
      data: {
        id: testId,
      },
    })
  },
  component: TestDetailPage,
})

function TestDetailPage() {
  const test = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-[2rem] p-6 sm:p-8">
        <p className="island-kicker mb-2">Test Detail</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          {test.title}
        </h1>
        <div className="mb-6 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-sm text-[var(--sea-ink-soft)] inline-block">
          Status: {test.status ?? 'Failed'}
        </div>

        <div className="grid gap-6">
          <section className="rounded-2xl border border-[var(--line)] bg-white/60 p-5">
            <h2 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">
              Steps
            </h2>
            <div
              className="prose prose-sm mt-3 max-w-none text-[var(--sea-ink-soft)]"
              dangerouslySetInnerHTML={{
                __html: test.steps ?? '',
              }}
            />
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white/60 p-5">
            <h2 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">
              Expected
            </h2>
            <div
              className="prose prose-sm mt-3 max-w-none text-[var(--sea-ink-soft)]"
              dangerouslySetInnerHTML={{
                __html: test.expected ?? '',
              }}
            />
          </section>
        </div>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex rounded-xl border border-[var(--line)] bg-white/75 px-4 py-2 text-sm font-semibold no-underline text-[var(--sea-ink)] hover:text-[var(--lagoon-deep)]"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  )
}
