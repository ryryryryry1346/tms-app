import {
  Link,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import {
  BarChart3,
  BookOpenText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FilePenLine,
  FolderKanban,
  LayoutGrid,
  LogOut,
  Menu,
  MoonStar,
  PanelsTopLeft,
  PlayCircle,
  SunMedium,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { logoutUser, type SessionUser } from '../features/auth/server'
import { Button } from './ui/Button'
import {
  PopoverMenu,
  PopoverMenuItem,
  PopoverMenuLabel,
  PopoverMenuSeparator,
} from './ui/PopoverMenu'
import { useTheme } from './ThemeProvider'
import { useRouterState } from '@tanstack/react-router'

type AppShellProps = {
  user: SessionUser | null
  children: ReactNode
}

type NavItem = {
  label: string
  to:
    | '/'
    | '/project/$projectSlug'
    | '/project/$projectSlug/repository'
    | '/project/$projectSlug/runs'
    | '/project/$projectSlug/automation'
    | '/project/$projectSlug/automation/runs'
    | '/project/$projectSlug/docs'
    | '/project/$projectSlug/reports'
  params?: {
    projectSlug: string
  }
  matchPath?: string
  additionalMatchPaths?: string[]
  icon: ReactNode
  exact?: boolean
}

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'tms-sidebar-collapsed'

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

function isDeepShellPath(pathname: string): boolean {
  return (
    pathname.startsWith('/create-test') ||
    pathname.startsWith('/edit-test/') ||
    pathname.startsWith('/test/') ||
    pathname.startsWith('/run/')
  )
}

function shouldShowWorkingContext(pathname: string): boolean {
  return pathname.startsWith('/test/') || pathname.startsWith('/run/')
}

function getHeaderCopy(
  pathname: string,
  shellContext: ShellContext | null,
): { label: string; title: string } {
  if (pathname === '/') {
    return { label: 'Workspace', title: 'Projects' }
  }

  const projectLabel = shellContext?.projectName ?? 'Project'

  if (pathname.startsWith('/project/') && pathname.endsWith('/repository')) {
    return { label: projectLabel, title: 'Repository' }
  }

  if (pathname.startsWith('/project/') && pathname.includes('/automation')) {
    return { label: projectLabel, title: 'Automation' }
  }

  if (pathname.startsWith('/project/') && pathname.endsWith('/runs')) {
    return { label: projectLabel, title: 'Runs' }
  }

  if (pathname.startsWith('/project/') && pathname.includes('/docs')) {
    return { label: projectLabel, title: 'Docs' }
  }

  if (pathname.startsWith('/project/') && pathname.endsWith('/reports')) {
    return { label: projectLabel, title: 'Reports' }
  }

  if (pathname.startsWith('/project/')) {
    return { label: projectLabel, title: 'Overview' }
  }

  if (pathname.startsWith('/run/')) {
    return { label: shellContext?.projectName ?? 'Execution', title: 'Run detail' }
  }

  if (pathname.startsWith('/test/')) {
    return { label: shellContext?.projectName ?? 'Repository', title: 'Test case' }
  }

  if (pathname.startsWith('/create-test')) {
    return { label: shellContext?.projectName ?? 'Repository', title: 'Create test case' }
  }

  if (pathname.startsWith('/edit-test/')) {
    return { label: shellContext?.projectName ?? 'Repository', title: 'Edit test case' }
  }

  return { label: 'Workspace', title: 'TMS' }
}

type ShellContext = {
  projectSlug: string | null
  projectName: string | null
  suiteName?: string | null
  caseId?: number | null
  caseTitle?: string | null
  runId?: number | null
  runName?: string | null
  modeLabel?: string | null
}

function deriveShellContext(
  pathname: string,
  matches: Array<Record<string, unknown>>,
): ShellContext | null {
  const projectMatch = matches.find(
    (match) =>
      typeof match.routeId === 'string' &&
      match.routeId.startsWith('/project/$projectSlug'),
  )
  const projectData = projectMatch?.loaderData as
    | { project?: { slug?: string | null; id?: number; name?: string | null } }
    | undefined

  const testMatch = matches.find((match) => match.routeId === '/test/$testId')
  const testData = testMatch?.loaderData as
    | {
        id: number
        title: string
        projectSlug?: string | null
        projectName?: string | null
        sectionName?: string | null
      }
    | undefined

  if (testData) {
    return {
      projectSlug: testData.projectSlug ?? null,
      projectName: testData.projectName ?? null,
      suiteName: testData.sectionName ?? null,
      caseId: testData.id,
      caseTitle: testData.title,
      modeLabel: 'Case detail',
    }
  }

  const editMatch = matches.find((match) => match.routeId === '/edit-test/$testId')
  const editData = editMatch?.loaderData as
    | {
        test: { id: number; title: string; sectionId: number }
        sections: Array<{
          id: number
          name: string
          projectName?: string | null
          projectSlug?: string | null
        }>
      }
    | undefined

  if (editData) {
    const activeSection =
      editData.sections.find((section) => section.id === editData.test.sectionId) ??
      null

    return {
      projectSlug: activeSection?.projectSlug ?? null,
      projectName: activeSection?.projectName ?? null,
      suiteName: activeSection?.name ?? null,
      caseId: editData.test.id,
      caseTitle: editData.test.title,
      modeLabel: 'Edit case',
    }
  }

  const createMatch = matches.find((match) => match.routeId === '/create-test')
  const createData = createMatch?.loaderData as
    | {
        sections: Array<{
          id: number
          name: string
          projectId?: number | null
          projectName?: string | null
          projectSlug?: string | null
        }>
      }
    | undefined

  if (createData) {
    const params = new URLSearchParams(
      typeof window === 'undefined' ? '' : window.location.search,
    )
    const suiteId = Number(params.get('suiteId'))
    const projectId = Number(params.get('projectId'))
    const activeSection =
      createData.sections.find((section) => section.id === suiteId) ??
      createData.sections.find((section) => section.projectId === projectId) ??
      createData.sections[0] ??
      null

    return {
      projectSlug: activeSection?.projectSlug ?? null,
      projectName: activeSection?.projectName ?? null,
      suiteName: activeSection?.name ?? null,
      modeLabel: 'Create case',
    }
  }

  const runMatch = matches.find((match) => match.routeId === '/run/$runId')
  const runData = runMatch?.loaderData as
    | {
        run: {
          id: number
          name: string
          projectSlug?: string | null
          projectName?: string | null
        }
      }
    | undefined

  if (runData?.run) {
    return {
      projectSlug: runData.run.projectSlug ?? null,
      projectName: runData.run.projectName ?? null,
      runId: runData.run.id,
      runName: runData.run.name,
      modeLabel: 'Run detail',
    }
  }

  if (projectData?.project) {
    return {
      projectSlug:
        projectData.project.slug ?? getProjectSlug(pathname) ?? null,
      projectName: projectData.project.name ?? null,
    }
  }

  const regexSlug = getProjectSlug(pathname)

  if (regexSlug) {
    return {
      projectSlug: regexSlug,
      projectName: null,
    }
  }

  return null
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
  const isActive =
    isActivePath(pathname, item.matchPath ?? item.to, item.exact) ||
    item.additionalMatchPaths?.some((matchPath) =>
      pathname === matchPath || pathname.startsWith(matchPath),
    ) === true

  return (
    <Link
      to={item.to}
      params={item.params}
      onClick={onNavigate}
      aria-label={item.label}
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
  const { preference, resolvedTheme, setPreference } = useTheme()
  const matches = useRouterState({
    select: (state) => state.matches as Array<Record<string, unknown>>,
  })
  const pathname = location.pathname
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const shellContext = deriveShellContext(pathname, matches)
  const projectSlug = shellContext?.projectSlug ?? getProjectSlug(pathname)
  const isDeepFlow = isDeepShellPath(pathname)
  const isWorkspaceHome = pathname === '/'
  const showSidebar = !isWorkspaceHome
  const headerCopy = getHeaderCopy(pathname, shellContext)

  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    setIsSidebarCollapsed(
      window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === 'true',
    )
  }, [])

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
          additionalMatchPaths: ['/create-test', '/edit-test/', '/test/'],
          icon: <FolderKanban size={16} strokeWidth={2} />,
        },
        {
          label: 'Runs',
          to: '/project/$projectSlug/runs',
          params: { projectSlug },
          matchPath: `/project/${projectSlug}/runs`,
          additionalMatchPaths: ['/run/'],
          icon: <PlayCircle size={16} strokeWidth={2} />,
        },
        {
          label: 'Automation',
          to: '/project/$projectSlug/automation/runs',
          params: { projectSlug },
          matchPath: `/project/${projectSlug}/automation`,
          icon: <CircleDot size={16} strokeWidth={2} />,
        },
        {
          label: 'Docs',
          to: '/project/$projectSlug/docs',
          params: { projectSlug },
          matchPath: `/project/${projectSlug}/docs`,
          icon: <BookOpenText size={16} strokeWidth={2} />,
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
      setIsAccountMenuOpen(false)
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

  function toggleSidebarCollapsed(): void {
    setIsSidebarCollapsed((current) => {
      const next = !current

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          SIDEBAR_COLLAPSE_STORAGE_KEY,
          String(next),
        )
      }

      return next
    })
  }

  return (
    <div
      className={`app-shell ${
        showSidebar ? 'app-shell--with-sidebar' : 'app-shell--workspace-home'
      } ${showSidebar && isSidebarCollapsed ? 'app-shell--sidebar-collapsed' : ''}`}
    >
      <div
        className={`app-shell__backdrop ${isMobileSidebarOpen ? 'is-open' : ''}`}
        onClick={closeSidebar}
      />

      {showSidebar ? (
        <aside
          className={`app-shell__sidebar ${isMobileSidebarOpen ? 'is-open' : ''}`}
        >
          <div className="app-shell__brand">
            <div className="app-shell__brand-mark">T</div>
            <div className="app-shell__brand-copy">
              <span className="app-shell__eyebrow">Workspace</span>
              <strong>TMS</strong>
            </div>
            {!isSidebarCollapsed ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="app-shell__collapse-button"
                onClick={toggleSidebarCollapsed}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </Button>
            ) : null}
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
            <nav className="app-shell__compact-nav" aria-label="Workspace navigation">
              {!isDeepFlow ? (
                workspaceItems.map((item) => (
                  <ShellNavLink
                    key={item.to}
                    item={item}
                    pathname={pathname}
                    onNavigate={closeSidebar}
                  />
                ))
              ) : (
                <Link
                  to="/"
                  onClick={closeSidebar}
                  className="app-shell__utility-link"
                >
                  Back to projects
                </Link>
              )}

              {projectItems.length > 0 ? (
                <>
                  <div className="app-shell__nav-divider" />
                  <div className="app-shell__project-label">
                    {shellContext?.projectName ?? 'Current project'}
                  </div>
                  {projectItems.map((item) => (
                    <ShellNavLink
                      key={item.to}
                      item={item}
                      pathname={pathname}
                      onNavigate={closeSidebar}
                    />
                  ))}
                </>
              ) : null}
            </nav>

          </div>
        </aside>
      ) : null}

      <div className="app-shell__workspace">
        <header className="app-shell__topbar">
          <div className="app-shell__topbar-left">
            {showSidebar ? (
              <>
                {isSidebarCollapsed ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="app-shell__desktop-expand-button"
                    onClick={toggleSidebarCollapsed}
                    aria-label="Expand sidebar"
                    title="Expand sidebar"
                  >
                    <ChevronRight size={16} strokeWidth={2} />
                  </Button>
                ) : null}
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
              </>
            ) : (
              <Link to="/" className="app-shell__topbar-brand">
                <span className="app-shell__brand-mark app-shell__brand-mark--small">T</span>
                <span className="app-shell__topbar-brand-copy">
                  <span className="app-shell__eyebrow">Workspace</span>
                  <span className="app-shell__topbar-title">TMS</span>
                </span>
              </Link>
            )}
          </div>

          {user ? (
            <div className="app-shell__topbar-right app-shell__topbar-right--user">
              <PopoverMenu
                isOpen={isAccountMenuOpen}
                onClose={() => setIsAccountMenuOpen(false)}
                onOpenChange={setIsAccountMenuOpen}
                align="right"
                sideOffset={10}
                className="app-shell__account-menu"
                trigger={
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="app-shell__account-trigger"
                    aria-label="Open account menu"
                    aria-expanded={isAccountMenuOpen}
                  >
                    <span className="app-shell__account-avatar" aria-hidden="true">
                      {(user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="app-shell__account-trigger-copy">
                      {user.email}
                    </span>
                    <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
                  </Button>
                }
              >
                <div className="app-shell__account-summary">
                  <div className="app-shell__account-avatar app-shell__account-avatar--large">
                    {(user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="app-shell__account-copy">
                    <span className="app-shell__account-name">
                      {user.displayName}
                    </span>
                    <span className="app-shell__account-email">{user.email}</span>
                  </div>
                </div>

                <PopoverMenuSeparator />

                <PopoverMenuLabel>Theme</PopoverMenuLabel>
                <div
                  className="app-shell__account-theme"
                  role="group"
                  aria-label="Theme preference"
                >
                  <button
                    type="button"
                    className={`app-shell__account-theme-button ${
                      preference === 'light' ? 'is-active' : ''
                    }`}
                    aria-pressed={preference === 'light'}
                    onClick={() => setPreference('light')}
                  >
                    <SunMedium size={14} strokeWidth={2} aria-hidden="true" />
                    Light
                  </button>
                  <button
                    type="button"
                    className={`app-shell__account-theme-button ${
                      preference === 'dark' ? 'is-active' : ''
                    }`}
                    aria-pressed={preference === 'dark'}
                    onClick={() => setPreference('dark')}
                  >
                    <MoonStar size={14} strokeWidth={2} aria-hidden="true" />
                    Dark
                  </button>
                </div>
                <div className="app-shell__account-theme-status">
                  Current: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
                </div>

                <PopoverMenuSeparator />

                <PopoverMenuItem
                  tone="danger"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                >
                  <LogOut size={14} strokeWidth={2} aria-hidden="true" />
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </PopoverMenuItem>
              </PopoverMenu>
            </div>
          ) : null}
        </header>

        <div className="app-shell__content">{children}</div>
      </div>
    </div>
  )
}
