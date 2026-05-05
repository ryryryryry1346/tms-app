import {
  Link,
  Outlet,
  createFileRoute,
  notFound,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { Badge } from '../components/ui/Badge'
import { Panel } from '../components/ui/Panel'
import { getRunsForProject } from '../features/runs/server'
import { getDashboardState } from '../features/tests/server'

export const Route = createFileRoute('/project/$projectSlug')({
  loader: async ({ params }) => {
    const projectSlug = params.projectSlug.trim()

    if (!projectSlug) {
      throw notFound()
    }

    const numericProjectId = Number(projectSlug)

    if (Number.isInteger(numericProjectId) && numericProjectId > 0) {
      const legacyDashboard = await getDashboardState({
        data: {
          projectId: numericProjectId,
        },
      })

      const legacyProject =
        legacyDashboard.projects.find((item) => item.id === numericProjectId) ??
        null

      if (!legacyProject?.slug) {
        throw notFound()
      }

      if (legacyProject.slug !== projectSlug) {
        throw redirect({
          to: '/project/$projectSlug',
          params: {
            projectSlug: legacyProject.slug,
          },
          replace: true,
        })
      }
    }

    const dashboard = await getDashboardState({
      data: {
        projectSlug,
      },
    })

    const project =
      dashboard.projects.find((item) => item.slug === projectSlug) ?? null

    const selectedProjectId = dashboard.selectedProjectId ?? project?.id ?? null

    if (!project || !selectedProjectId) {
      throw notFound()
    }

    const runsState = await getRunsForProject({
      data: {
        projectId: selectedProjectId,
      },
    })

    return {
      project,
      dashboard,
      runs: runsState.runs,
    }
  },
  component: ProjectOverviewPage,
})

function ProjectSubnav({
  projectSlug,
  active,
}: {
  projectSlug: string
  active: 'overview' | 'repository' | 'runs' | 'reports'
}) {
  const tabClass = (isActive: boolean): string =>
    `rounded-full px-4 py-2 text-sm font-semibold no-underline ${
      isActive
        ? 'bg-[var(--tms-primary-soft)] text-[var(--tms-primary)]'
        : 'text-[var(--tms-text-muted)] hover:bg-[var(--tms-surface-muted)]'
    }`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to="/project/$projectSlug"
        params={{ projectSlug }}
        className={tabClass(active === 'overview')}
      >
        Overview
      </Link>
      <Link
        to="/project/$projectSlug/repository"
        params={{ projectSlug }}
        className={tabClass(active === 'repository')}
      >
        Repository
      </Link>
      <Link
        to="/project/$projectSlug/runs"
        params={{ projectSlug }}
        className={tabClass(active === 'runs')}
      >
        Runs
      </Link>
      <Link
        to="/project/$projectSlug/reports"
        params={{ projectSlug }}
        className={tabClass(active === 'reports')}
      >
        Reports
      </Link>
    </div>
  )
}

function ProjectOverviewPage() {
  const { project, dashboard, runs } = Route.useLoaderData()
  const location = useLocation()

  if (
    location.pathname.endsWith('/runs') ||
    location.pathname.endsWith('/repository') ||
    location.pathname.endsWith('/reports')
  ) {
    return <Outlet />
  }

  const activeTests = dashboard.tests.filter((test) => test.status !== 'Archived')
  const readyCases = activeTests.filter((test) => test.status === 'Ready').length
  const draftCases = activeTests.filter((test) => test.status === 'Draft').length
  const archivedCases = dashboard.tests.filter(
    (test) => test.status === 'Archived',
  ).length
  const recentRuns = [...runs].sort((a, b) => b.id - a.id).slice(0, 3)
  const recentCases = [...dashboard.tests].sort((a, b) => b.id - a.id).slice(0, 5)

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[var(--tms-bg)]">
      <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-10">
        <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-3 text-sm text-[var(--tms-text-muted)]">
              <Link to="/" className="no-underline text-[var(--tms-text-muted)]">
                Workspace
              </Link>
              <span>/</span>
              <span>Project</span>
            </div>
            <h1 className="m-0 text-4xl font-bold tracking-tight text-[var(--tms-text)] md:text-5xl">
              {project.name}
            </h1>
            <p className="mt-2 text-base text-[var(--tms-text-muted)] md:text-lg">
              Project dashboard with repository health, recent activity, and execution summary.
            </p>
            <div className="mt-4">
              <ProjectSubnav
                projectSlug={project.slug ?? project.id.toString()}
                active="overview"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/project/$projectSlug/repository"
              params={{ projectSlug: project.slug ?? project.id.toString() }}
              className="tms-button no-underline"
            >
              Open repository
            </Link>
            <Link
              to="/project/$projectSlug/runs"
              params={{ projectSlug: project.slug ?? project.id.toString() }}
              className="tms-button tms-button-primary no-underline"
            >
              Open runs
            </Link>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Suites', value: dashboard.sections.length, tone: 'text-[var(--tms-primary)]' },
            { label: 'Cases', value: activeTests.length, tone: 'text-[var(--tms-primary)]' },
            { label: 'Ready', value: readyCases, tone: 'text-[var(--tms-success)]' },
            { label: 'Draft', value: draftCases, tone: 'text-[var(--tms-text-soft)]' },
            { label: 'Runs', value: runs.length, tone: 'text-[var(--tms-danger)]' },
          ].map((item) => (
            <Panel
              key={item.label}
              className="px-6 py-5"
            >
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-soft)]">
                {item.label}
              </div>
              <div className={`mt-3 text-4xl font-semibold ${item.tone}`}>
                {item.value}
              </div>
            </Panel>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-6">
            <Panel className="px-6 py-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 text-2xl font-semibold text-[var(--tms-text)]">
                    Repository health
                  </h2>
                  <p className="mt-2 text-sm text-[var(--tms-text-muted)]">
                    Snapshot of suite structure and test case readiness.
                  </p>
                </div>
                <Link
                  to="/project/$projectSlug/repository"
                  params={{ projectSlug: project.slug ?? project.id.toString() }}
                  className="tms-button no-underline"
                >
                  Open repository
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {dashboard.sections.map((section) => {
                  const suiteTests = activeTests.filter(
                    (test) => test.sectionId === section.id,
                  )
                  const suiteReady = suiteTests.filter(
                    (test) => test.status === 'Ready',
                  ).length

                  return (
                    <Panel
                      key={section.id}
                      className="rounded-2xl border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-5 py-4 shadow-none"
                    >
                      <div className="text-lg font-semibold text-[var(--tms-text)]">
                        {section.name}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--tms-text-muted)]">
                        <span>{suiteTests.length} cases</span>
                        <span>Ready {suiteReady}</span>
                        <span>Draft {suiteTests.length - suiteReady}</span>
                      </div>
                    </Panel>
                  )
                })}
              </div>
            </Panel>

            <Panel className="px-6 py-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 text-2xl font-semibold text-[var(--tms-text)]">
                    Recent test cases
                  </h2>
                  <p className="mt-2 text-sm text-[var(--tms-text-muted)]">
                    Latest created cases across the project repository.
                  </p>
                </div>
                <Badge variant={archivedCases > 0 ? 'warning' : 'draft'}>
                  {archivedCases} archived
                </Badge>
              </div>

              {recentCases.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--tms-border)] bg-[var(--tms-surface-soft)] p-5 text-sm text-[var(--tms-text-muted)]">
                  No test cases yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {recentCases.map((test) => {
                    const suite =
                      dashboard.sections.find((section) => section.id === test.sectionId) ??
                      null

                    return (
                      <Link
                        key={test.id}
                        to="/test/$testId"
                        params={{ testId: test.id.toString() }}
                        className="rounded-2xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-5 py-4 no-underline transition hover:border-[var(--tms-primary-border)]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-lg font-semibold text-[var(--tms-text)]">
                              #{test.id} {test.title}
                            </div>
                            <div className="mt-1 text-sm text-[var(--tms-text-muted)]">
                              {suite?.name ?? 'No suite'} / {test.status ?? 'Draft'}
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-[var(--tms-primary)]">
                            Open
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </Panel>
          </div>

          <div className="grid gap-6">
            <Panel className="px-6 py-5">
              <h2 className="m-0 text-2xl font-semibold text-[var(--tms-text)]">
                Recent runs
              </h2>
              <p className="mt-2 text-sm text-[var(--tms-text-muted)]">
                Latest execution activity for this project.
              </p>

              <div className="mt-5 grid gap-3">
                {recentRuns.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--tms-border)] bg-[var(--tms-surface-soft)] p-5 text-sm text-[var(--tms-text-muted)]">
                    No runs yet.
                  </div>
                ) : (
                  recentRuns.map((run) => (
                    <Link
                      key={run.id}
                      to="/run/$runId"
                      params={{ runId: run.id.toString() }}
                      className="rounded-2xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-5 py-4 no-underline transition hover:border-[var(--tms-primary-border)]"
                    >
                      <div className="text-lg font-semibold text-[var(--tms-text)]">
                        {run.name}
                      </div>
                      <div className="mt-1 text-sm text-[var(--tms-text-muted)]">Run ID: {run.id}</div>
                    </Link>
                  ))
                )}
              </div>
            </Panel>

            <Panel className="px-6 py-5">
              <h2 className="m-0 text-2xl font-semibold text-[var(--tms-text)]">
                Quick actions
              </h2>
              <p className="mt-2 text-sm text-[var(--tms-text-muted)]">
                Jump straight into the most common project workflows.
              </p>

              <div className="mt-5 grid gap-3">
                <Link
                  to="/project/$projectSlug/repository"
                  params={{ projectSlug: project.slug ?? project.id.toString() }}
                  className="tms-button no-underline"
                >
                  Manage suites and cases
                </Link>
                <Link
                  to="/create-test"
                  search={{ projectId: project.id }}
                  className="tms-button no-underline"
                >
                  Create test case
                </Link>
                <Link
                  to="/project/$projectSlug/runs"
                  params={{ projectSlug: project.slug ?? project.id.toString() }}
                  className="tms-button tms-button-primary no-underline"
                >
                  Start or continue runs
                </Link>
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  )
}
