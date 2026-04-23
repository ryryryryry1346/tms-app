import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { logoutUser, type SessionUser } from '../features/auth/server'

type HeaderProps = {
  user: SessionUser | null
}

export default function Header({ user }: HeaderProps) {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAuthPage = pathname === '/login' || pathname === '/register'

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true)

    try {
      await logoutUser()
      await navigate({
        to: '/login',
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center justify-end gap-x-5 gap-y-2 py-2.5">
        <div
          className={`${isAuthPage ? 'w-auto' : 'w-full justify-between sm:w-auto sm:justify-end'} flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold`}
        >
          {user ? (
            <>
              <div className="hidden rounded-full border border-[var(--chip-line)] bg-white/86 px-3 py-1 text-xs text-[var(--sea-ink-soft)] sm:block">
                {user.username}
              </div>
              <Link
                to="/"
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >
                Workspace
              </Link>
              <Link
                to="/create-test"
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >
                Create Test Case
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="nav-link cursor-pointer border-0 bg-transparent p-0 disabled:opacity-60"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
