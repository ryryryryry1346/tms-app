import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: RoutePendingState,
    defaultPendingMs: 0,
    defaultPendingMinMs: 250,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

function RoutePendingState() {
  return (
    <main className="min-h-[calc(100vh-65px)] bg-[#f7f9fe]">
      <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-10">
        <section className="mb-6">
          <div className="mb-3 h-4 w-44 rounded-full bg-[#e5ebf6]" />
          <div className="h-12 w-full max-w-[28rem] rounded-2xl bg-[#e5ebf6]" />
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="h-9 w-24 rounded-full bg-[#eaf0fb]" />
            <div className="h-9 w-28 rounded-full bg-[#eaf0fb]" />
            <div className="h-9 w-20 rounded-full bg-[#eaf0fb]" />
          </div>
        </section>

        <section className="rounded-3xl border border-[#dbe4f4] bg-white shadow-[0_18px_55px_rgba(31,57,102,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4ebf6] px-5 py-4">
            <div>
              <div className="h-6 w-56 rounded-full bg-[#e5ebf6]" />
              <div className="mt-2 h-3 w-28 rounded-full bg-[#edf2f9]" />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="h-10 w-56 rounded-xl bg-[#f0f4fb]" />
              <div className="h-10 w-40 rounded-xl bg-[#f0f4fb]" />
              <div className="h-10 w-28 rounded-xl bg-[#f0f4fb]" />
            </div>
          </div>
          <div className="grid gap-4 p-5">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-3xl border border-[#dfe6f4]"
              >
                <div className="flex items-center justify-between gap-4 border-b border-[#e9eef8] bg-[#fbfcff] px-5 py-4">
                  <div className="h-8 w-52 rounded-full bg-[#e5ebf6]" />
                  <div className="flex gap-2">
                    <div className="h-8 w-20 rounded-full bg-[#edf2f9]" />
                    <div className="h-8 w-24 rounded-full bg-[#edf2f9]" />
                  </div>
                </div>
                {[0, 1, 2].map((row) => (
                  <div
                    key={row}
                    className="grid grid-cols-[64px_82px_minmax(220px,1fr)_110px_110px_110px] items-center border-t border-[#eef2f8] px-5 py-3"
                  >
                    <div className="h-4 w-4 rounded bg-[#e5ebf6]" />
                    <div className="h-4 w-10 rounded-full bg-[#e5ebf6]" />
                    <div className="h-4 w-4/5 rounded-full bg-[#e5ebf6]" />
                    <div className="h-6 w-20 rounded-full bg-[#edf2f9]" />
                    <div className="h-6 w-24 rounded-full bg-[#edf2f9]" />
                    <div className="h-6 w-16 rounded-full bg-[#edf2f9]" />
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
