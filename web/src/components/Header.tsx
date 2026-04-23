import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { logoutUser, type SessionUser } from '../features/auth/server'
import ThemeToggle from './ThemeToggle'

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
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
        {!isAuthPage ? (
          <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
            <Link
              to={user ? '/' : '/login'}
              className="inline-flex items-center gap-2.5 no-underline"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-base font-extrabold text-white shadow-[0_14px_28px_rgba(34,145,233,0.2)]">
                S
              </span>
              <span className="text-[1.55rem] font-extrabold tracking-tight text-[var(--brand-strong)]">
                Systeme
              </span>
            </Link>
          </h2>
        ) : null}

        <div className={`${isAuthPage ? 'ml-auto' : 'ml-auto'} flex items-center gap-2`}>
          {!isAuthPage ? <ThemeToggle /> : null}
          {user ? (
            <div className="hidden rounded-full border border-[var(--chip-line)] bg-white px-3 py-1 text-sm text-[var(--sea-ink-soft)] shadow-[0_10px_28px_rgba(20,45,89,0.06)] sm:block">
              {user.username}
            </div>
          ) : null}
        </div>

        <div
          className={`${isAuthPage ? 'order-2 w-auto' : 'order-3 w-full sm:order-2 sm:w-auto'} flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold sm:ml-auto sm:flex-nowrap`}
        >
          {user ? (
            <>
              <Link
                to="/"
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >
                Dashboard
              </Link>
              <Link
                to="/create-test"
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >
                Create Test
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
