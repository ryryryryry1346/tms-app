import { Link, createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { Button, buttonVariants } from './components/ui/Button'
import { cx } from './components/ui/utils'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: RoutePendingState,
    defaultPendingMs: 0,
    defaultPendingMinMs: 250,
    defaultErrorComponent: RouteErrorState,
    defaultNotFoundComponent: RouteNotFoundState,
  })

  return router
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-[var(--tms-bg)] px-6">
      <div className="w-full max-w-md rounded-3xl border border-[var(--tms-border)] bg-[var(--tms-surface)] p-8 text-center shadow-[var(--tms-shadow-panel)]">
        {children}
      </div>
    </main>
  )
}

function RouteErrorState({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <CenteredCard>
      <h1 className="m-0 text-xl font-semibold text-[var(--tms-text)]">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--tms-text-muted)]">
        An unexpected error occurred while loading this page. Try again, or head
        back to your projects.
      </p>
      {import.meta.env.DEV ? (
        <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-[var(--tms-surface-soft)] p-3 text-left text-xs text-[var(--tms-text-muted)]">
          {error.message}
        </pre>
      ) : null}
      <div className="mt-6 flex items-center justify-center gap-2">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link
          to="/"
          className={cx(buttonVariants({ variant: 'default' }), 'no-underline')}
        >
          Back to projects
        </Link>
      </div>
    </CenteredCard>
  )
}

function RouteNotFoundState() {
  return (
    <CenteredCard>
      <h1 className="m-0 text-xl font-semibold text-[var(--tms-text)]">
        Not found
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--tms-text-muted)]">
        This page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <div className="mt-6 flex items-center justify-center">
        <Link
          to="/"
          className={cx(buttonVariants({ variant: 'primary' }), 'no-underline')}
        >
          Back to projects
        </Link>
      </div>
    </CenteredCard>
  )
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

function RoutePendingState() {
  return (
    <main className="min-h-[calc(100vh-65px)] bg-[var(--tms-bg)]">
      <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-10">
        <section className="mb-6">
          <div className="mb-3 h-4 w-44 rounded-full bg-[var(--tms-skeleton)]" />
          <div className="h-12 w-full max-w-[28rem] rounded-2xl bg-[var(--tms-skeleton)]" />
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="h-9 w-24 rounded-full bg-[var(--tms-skeleton-soft)]" />
            <div className="h-9 w-28 rounded-full bg-[var(--tms-skeleton-soft)]" />
            <div className="h-9 w-20 rounded-full bg-[var(--tms-skeleton-soft)]" />
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--tms-border)] bg-[var(--tms-surface)] shadow-[var(--tms-shadow-panel)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--tms-border-subtle)] px-5 py-4">
            <div>
              <div className="h-6 w-56 rounded-full bg-[var(--tms-skeleton)]" />
              <div className="mt-2 h-3 w-28 rounded-full bg-[var(--tms-skeleton-soft)]" />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="h-10 w-56 rounded-xl bg-[var(--tms-skeleton-soft)]" />
              <div className="h-10 w-40 rounded-xl bg-[var(--tms-skeleton-soft)]" />
              <div className="h-10 w-28 rounded-xl bg-[var(--tms-skeleton-soft)]" />
            </div>
          </div>
          <div className="grid gap-4 p-5">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-3xl border border-[var(--tms-border-subtle)]"
              >
                <div className="flex items-center justify-between gap-4 border-b border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-5 py-4">
                  <div className="h-8 w-52 rounded-full bg-[var(--tms-skeleton)]" />
                  <div className="flex gap-2">
                    <div className="h-8 w-20 rounded-full bg-[var(--tms-skeleton-soft)]" />
                    <div className="h-8 w-24 rounded-full bg-[var(--tms-skeleton-soft)]" />
                  </div>
                </div>
                {[0, 1, 2].map((row) => (
                  <div
                    key={row}
                    className="grid grid-cols-[64px_82px_minmax(220px,1fr)_110px_110px_110px] items-center border-t border-[var(--tms-border-subtle)] px-5 py-3"
                  >
                    <div className="h-4 w-4 rounded bg-[var(--tms-skeleton)]" />
                    <div className="h-4 w-10 rounded-full bg-[var(--tms-skeleton)]" />
                    <div className="h-4 w-4/5 rounded-full bg-[var(--tms-skeleton)]" />
                    <div className="h-6 w-20 rounded-full bg-[var(--tms-skeleton-soft)]" />
                    <div className="h-6 w-24 rounded-full bg-[var(--tms-skeleton-soft)]" />
                    <div className="h-6 w-16 rounded-full bg-[var(--tms-skeleton-soft)]" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
