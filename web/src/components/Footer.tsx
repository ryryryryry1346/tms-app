import { useRouterState } from '@tanstack/react-router'

export default function Footer() {
  const year = new Date().getFullYear()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAuthPage = pathname === '/login' || pathname === '/register'

  if (isAuthPage) {
    return null
  }

  return (
    <footer className="site-footer mt-20 px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">
          &copy; {year} TMS workspace.
        </p>
        <p className="island-kicker m-0">TypeScript app active, Flask archived as legacy</p>
      </div>
    </footer>
  )
}
