import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { logoutUser, type SessionUser } from '../features/auth/server'
import ThemeToggle from './ThemeToggle'

type HeaderProps = {
  user: SessionUser | null
}

export default function Header({ user }: HeaderProps) {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
          >
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
            TMS Migration
          </Link>
        </h2>

        <div className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:gap-2">
          {user ? (
            <div className="hidden rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-sm text-[var(--sea-ink-soft)] sm:block">
              {user.username}
            </div>
          ) : null}
          <ThemeToggle />
        </div>

        <div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-nowrap sm:pb-0">
          {user ? (
            <Link
              to="/"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              Dashboard
            </Link>
          ) : null}
          <Link
            to="/about"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Migration Notes
          </Link>
          {user ? (
            <Link
              to="/create-test"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              Create Test
            </Link>
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
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="nav-link cursor-pointer border-0 bg-transparent p-0 disabled:opacity-60"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          ) : null}
          <a
            href="https://github.com/ryryryryry1346/tms-app"
            className="nav-link"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </nav>
    </header>
  )
}
