import { useRouterState } from '@tanstack/react-router'
import { useT } from '../lib/i18n'

export default function Footer() {
  const t = useT()

  const year = new Date().getFullYear()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAuthPage = pathname === '/login' || pathname === '/register'

  if (isAuthPage) {
    return null
  }

  return (
    <footer className="site-footer mt-20 px-4 pb-14 pt-10 text-[var(--tms-text-muted)]">
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">{t('&copy; {year} TMS workspace.', { year })}</p>
        <p className="island-kicker m-0">{t('TypeScript app active')}</p>
      </div>
    </footer>
  )
}
