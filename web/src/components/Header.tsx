import {
  Link,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { useState } from 'react'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { logoutUser, type SessionUser } from '../features/auth/server'

type HeaderProps = {
  user: SessionUser | null
}

export default function Header({ user }: HeaderProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAuthPage = pathname === '/login' || pathname === '/register'

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true)

    try {
      await logoutUser()
      await router.invalidate()
      await navigate({
        to: '/login',
        replace: true,
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--tms-border-subtle)] bg-[var(--tms-surface)]/90 px-4 backdrop-blur-lg">
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
              >
                Workspace
              </Link>
              <Button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                size="sm"
                className="nav-link min-h-0 cursor-pointer border-0 bg-transparent p-0 shadow-none disabled:opacity-60"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Button>
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
