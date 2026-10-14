import {
  Link,
  useRouterState,
} from '@tanstack/react-router'
import { useState } from 'react'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { logoutUser, type SessionUser } from '../features/auth/server'
import { useT } from '../lib/i18n'

type HeaderProps = {
  user: SessionUser | null
}

export default function Header({ user }: HeaderProps) {
  const t = useT()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAuthPage = pathname === '/login' || pathname === '/register'

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true)

    try {
      await logoutUser()
      // Full page load: invalidate() + navigate() raced with the auth redirect
      // from the dashboard loader and left a blank page. A hard navigation
      // resets all client state and renders /login from a fresh SSR response.
      window.location.replace('/login')
    } catch (error) {
      setIsLoggingOut(false)
      throw error
    }
  }

  return (
    <header className="site-header sticky top-0 z-50 px-4">
      <nav className="page-wrap flex flex-wrap items-center justify-end gap-x-5 gap-y-2 py-2.5">
        <div
          className={`${isAuthPage ? 'w-auto' : 'w-full justify-between sm:w-auto sm:justify-end'} flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold`}
        >
          {user ? (
            <>
              <Badge className="hidden sm:block">
                {user.displayName}
              </Badge>
              <Link
                to="/"
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >{t('Workspace')}</Link>
              <Button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                size="sm"
                className="nav-link min-h-0 cursor-pointer border-0 bg-transparent p-0 shadow-none disabled:opacity-60"
              >
                {isLoggingOut ? t('Logging out...') : t('Logout')}
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >{t('Login')}</Link>
              <Link
                to="/register"
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >{t('Register')}</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
