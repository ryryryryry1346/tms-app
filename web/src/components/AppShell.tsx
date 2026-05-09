import {
  Link,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import {
  BarChart3,
  FileText,
  FolderKanban,
  LayoutGrid,
  Menu,
  PanelsTopLeft,
  PlayCircle,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { logoutUser, type SessionUser } from '../features/auth/server'
import ThemeToggle from './ThemeToggle'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

type AppShellProps = {
  user: SessionUser | null
  children: ReactNode
}

type NavItem = {
  label: string
  to:
    | '/'
    | '/about'
    | '/project/$projectSlug'
    | '/project/$projectSlug/repository'
    | '/project/$projectSlug/runs'
    | '/project/$projectSlug/reports'
  params?: {
    projectSlug: string
  }
  matchPath?: string
  icon: ReactNode
  exact?: boolean
}

function isAuthPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  )
}

function getProjectSlug(pathname: string): string | null {
  const match = pathname.match(/^\/project\/([^/]+)/)
  return match?.[1] ?? null
}

function isActivePath(pathname: string, to: string, exact = false): boolean {
  if (exact) {
    return pathname === to
  }

  return pathname === to || pathname.startsWith(`${to}/`)
}

function getHeaderCopy(pathname: string): { label: string; title: string } {
  if (pathname === '/') {
    return { label: 'Workspace', title: 'Projects' }
  }

  if (pathname === '/about') {
    return { label: 'Workspace', title: 'About' }
  }

  if (pathname.startsWith('/project/') && pathname.endsWith('/repository')) {
    return { label: 'Project', title: 'Repository' }
  }

  if (pathname.startsWith('/project/') && pathname.endsWith('/runs')) {
    return { label: 'Project', title: 'Runs' }
  }

  if (pathname.startsWith('/project/') && pathname.endsWith('/reports')) {
    return { label: 'Project', title: 'Reports' }
  }

  if (pathname.startsWith('/project/')) {
    return { label: 'Project', title: 'Overview' }
  }

  if (pathname.startsWith('/run/')) {
    return { label: 'Execution', title: 'Run detail' }
  }

  if (pathname.startsWith('/test/')) {
    return { label: 'Repository', title: 'Test case' }
  }

  if (pathname.startsWith('/create-test')) {
    return { label: 'Repository', title: 'Create test case' }
  }

  if (pathname.startsWith('/edit-test/')) {
    return { label: 'Repository', title: 'Edit test case' }
  }

  return { label: 'Workspace', title: 'TMS' }
}

function ShellNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  onNavigate?: () => void
}) {
  const isActive = isActivePath(pathname, item.matchPath ?? item.to, item.exact)

  return (
    <Link
      to={item.to}
      params={item.params}
      onClick={onNavigate}
      className={`app-shell__nav-link ${isActive ? 'is-active' : ''}`}
    >
      <span className="app-shell__nav-icon">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  )
}

export default function AppShell({ user, children }: AppShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const router = useRouter()
  const pathname = location.pathname
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const projectSlug = getProjectSlug(pathname)
  const headerCopy = getHeaderCopy(pathname)

  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [pathname])

  if (isAuthPath(pathname)) {
    return <>{children}</>
  }

  const workspaceItems: NavItem[] = [
    {
      label: 'Projects',
      to: '/',
      icon: <PanelsTopLeft size={16} strokeWidth={2} />,
      exact: true,
    },
    {
      label: 'About',
      to: '/about',
      icon: <FileText size={16} strokeWidth={2} />,
      exact: true,
    },
  ]

  const projectItems: NavItem[] = projectSlug
    ? [
        {
          label: 'Overview',
          to: '/project/$projectSlug',
          params: { projectSlug },
          matchPath: `/project/${projectSlug}`,
          icon: <LayoutGrid size={16} strokeWidth={2} />,
          exact: true,
        },
        {
          label: 'Repository',
          to: '/project/$projectSlug/repository',
          params: { projectSlug },
          matchPath: `/project/${projectSlug}/repository`,
          icon: <FolderKanban size={16} strokeWidth={2} />,
        },
        {
          label: 'Runs',
          to: '/project/$projectSlug/runs',
          params: { projectSlug },
          matchPath: `/project/${projectSlug}/runs`,
          icon: <PlayCircle size={16} strokeWidth={2} />,
        },
        {
          label: 'Reports',
          to: '/project/$projectSlug/reports',
          params: { projectSlug },
          matchPath: `/project/${projectSlug}/reports`,
          icon: <BarChart3 size={16} strokeWidth={2} />,
        },
      ]
    : []

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

  function closeSidebar(): void {
    setIsMobileSidebarOpen(false)
  }

  return (
    <div className="app-shell">
      <div
        className={`app-shell__backdrop ${isMobileSidebarOpen ? 'is-open' : ''}`}
        onClick={closeSidebar}
      />

      <aside
        className={`app-shell__sidebar ${isMobileSidebarOpen ? 'is-open' : ''}`}
      >
        <div className="app-shell__brand">
          <div className="app-shell__brand-mark">T</div>
          <div className="app-shell__brand-copy">
            <span className="app-shell__eyebrow">Workspace</span>
            <strong>TMS</strong>
          </div>
          <Button
            type="button"
            size="sm"
            className="app-shell__close-button md:hidden"
            onClick={closeSidebar}
            aria-label="Close navigation"
          >
            <X size={16} strokeWidth={2} />
          </Button>
        </div>

        <div className="app-shell__scroll">
          <section className="app-shell__group">
            <div className="app-shell__group-title">Workspace</div>
            <div className="app-shell__nav-list">
              {workspaceItems.map((item) => (
                <ShellNavLink
                  key={item.to}
                  item={item}
                  pathname={pathname}
                  onNavigate={closeSidebar}
                />
              ))}
            </div>
          </section>

          {projectItems.length > 0 ? (
            <section className="app-shell__group">
              <div className="app-shell__group-title">Current project</div>
              <div className="app-shell__nav-list">
                {projectItems.map((item) => (
                  <ShellNavLink
                    key={item.to}
                    item={item}
                    pathname={pathname}
                    onNavigate={closeSidebar}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="app-shell__bottom">
          <div className="app-shell__theme-block">
            <div className="app-shell__group-title">Theme</div>
            <ThemeToggle />
          </div>

          <div className="app-shell__user-card">
            <div className="app-shell__user-meta">
              <span className="app-shell__eyebrow">Signed in</span>
              <strong>{user?.displayName ?? 'Guest'}</strong>
            </div>
            {user ? <Badge>{user.email}</Badge> : null}
            <Link to="/about" className="app-shell__utility-link">
              Product status
            </Link>
            {user ? (
              <Button
                type="button"
                size="sm"
                className="w-full justify-center"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Button>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="app-shell__workspace">
        <header className="app-shell__topbar">
          <div className="app-shell__topbar-left">
            <Button
              type="button"
              size="sm"
              className="app-shell__menu-button md:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={16} strokeWidth={2} />
            </Button>
            <div>
              <div className="app-shell__eyebrow">{headerCopy.label}</div>
              <div className="app-shell__topbar-title">{headerCopy.title}</div>
            </div>
          </div>

          {user ? (
            <div className="app-shell__topbar-right">
              <Badge>{user.displayName}</Badge>
            </div>
          ) : null}
        </header>

        <div className="app-shell__content">{children}</div>
      </div>
    </div>
  )
}
