import {
  Link,
  createFileRoute,
  notFound,
} from '@tanstack/react-router'
import { useState } from 'react'
import { archiveTestCase } from '../features/tests/server'
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
  const [isArchiving, setIsArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const statusTone =
    test.status === 'Ready'
      ? 'bg-emerald-100 text-emerald-900'
      : test.status === 'Archived'
        ? 'bg-amber-100 text-amber-900'
        : 'bg-slate-100 text-slate-700'

  async function handleArchive(): Promise<void> {
    setArchiveError(null)
    setIsArchiving(true)

    try {
      await archiveTestCase({
        data: {
          id: test.id,
        },
      })

      window.location.reload()
    } catch (error) {
      setArchiveError(
        error instanceof Error ? error.message : 'Failed to archive test case.',
      )
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-[2rem] p-6 sm:p-8">
        <p className="island-kicker mb-2">Workspace / Project / Suite / Case</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          {test.title}
        </h1>
        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          {test.projectName ? (
            <span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-[var(--sea-ink-soft)]">
              Project: {test.projectName}
            </span>
          ) : null}
          {test.sectionName ? (
            <span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-[var(--sea-ink-soft)]">
              Suite: {test.sectionName}
            </span>
          ) : null}
          <span
            className={`rounded-full px-3 py-1 font-semibold uppercase tracking-[0.16em] ${statusTone}`}
          >
            {test.status ?? 'Draft'}
          </span>
        </div>

        <div className="grid gap-6">
          <section className="rounded-2xl border border-[var(--line)] bg-white/60 p-5">
            <h2 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">
              Steps
            </h2>
            <div
              className="rich-output prose prose-sm mt-3 max-w-none text-[var(--sea-ink-soft)]"
              onClick={(event) => {
                const target = event.target

                if (!(target instanceof HTMLElement)) {
                  return
                }

                const mediaElement = target.closest<HTMLElement>('[data-media-url]')
                const url = mediaElement?.dataset.mediaUrl

                if (!url) {
                  return
                }

                event.preventDefault()
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
              dangerouslySetInnerHTML={{
                __html: test.steps ?? '',
              }}
            />
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white/60 p-5">
            <h2 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">
              Expected result
            </h2>
            <div
              className="rich-output prose prose-sm mt-3 max-w-none text-[var(--sea-ink-soft)]"
              onClick={(event) => {
                const target = event.target

                if (!(target instanceof HTMLElement)) {
                  return
                }

                const mediaElement = target.closest<HTMLElement>('[data-media-url]')
                const url = mediaElement?.dataset.mediaUrl

                if (!url) {
                  return
                }

                event.preventDefault()
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
              dangerouslySetInnerHTML={{
                __html: test.expected ?? '',
              }}
            />
          </section>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/edit-test/$testId"
            params={{ testId: test.id.toString() }}
            className="inline-flex rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.18)] px-4 py-2 text-sm font-semibold no-underline text-[var(--lagoon-deep)]"
          >
            Edit test case
          </Link>
          {test.status !== 'Archived' ? (
            <button
              type="button"
              onClick={() => {
                void handleArchive()
              }}
              disabled={isArchiving}
              className="inline-flex rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isArchiving ? 'Archiving...' : 'Archive'}
            </button>
          ) : null}
          {test.projectId ? (
            <Link
              to="/project/$projectId"
              params={{ projectId: test.projectId.toString() }}
              className="inline-flex rounded-xl border border-[var(--line)] bg-white/75 px-4 py-2 text-sm font-semibold no-underline text-[var(--sea-ink)] hover:text-[var(--lagoon-deep)]"
            >
              Back to project
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex rounded-xl border border-[var(--line)] bg-white/75 px-4 py-2 text-sm font-semibold no-underline text-[var(--sea-ink)] hover:text-[var(--lagoon-deep)]"
            >
              Back to workspace
            </Link>
          )}
        </div>

        {archiveError ? (
          <div className="mt-4 rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {archiveError}
          </div>
        ) : null}
      </section>
    </main>
  )
}
