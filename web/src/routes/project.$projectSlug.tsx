import {
  Link,
  Outlet,
  createFileRoute,
  notFound,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { LinkButton } from '../components/ui/LinkButton'
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

function ProjectOverviewPage() {
  const { project, dashboard, runs } = Route.useLoaderData()
  const location = useLocation()

  if (
    location.pathname.endsWith('/runs') ||
    location.pathname.endsWith('/repository') ||
    location.pathname.endsWith('/docs') ||
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
  const projectSlug = project.slug ?? project.id.toString()
  const recentRuns = [...runs].sort((a, b) => b.id - a.id).slice(0, 3)
  const recentCases = [...dashboard.tests].sort((a, b) => b.id - a.id).slice(0, 3)

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            description="Project dashboard with repository health, recent activity, and execution summary."
            actions={
              <>
                <LinkButton
                  to="/project/$projectSlug/repository"
                  params={{ projectSlug }}
                  variant="secondary"
                >
                  Open repository
                </LinkButton>
                <LinkButton
                  to="/project/$projectSlug/runs"
                  params={{ projectSlug }}
                  variant="primary"
                >
                  Open runs
                </LinkButton>
              </>
            }
          />

          <section className="repository-summary-strip overview-summary-strip">
            {[
              { label: 'Suites', value: dashboard.sections.length },
              { label: 'Cases', value: activeTests.length },
              { label: 'Ready', value: readyCases },
              { label: 'Draft', value: draftCases },
              { label: 'Runs', value: runs.length },
            ].map((item) => (
              <Badge
                key={item.label}
                className="repository-summary-strip__chip"
                variant={
                  item.label === 'Ready'
                    ? 'runPassed'
                    : item.label === 'Runs'
                      ? 'primary'
                      : 'default'
                }
              >
                {item.value} {item.label}
              </Badge>
            ))}
          </section>

          <section className="overview-grid">
          <div className="overview-main-column">
            <Panel className="overview-panel px-4 py-3">
              <WorkspaceSectionHeader
                dense
                title="Repository health"
                description="Snapshot of suite structure and test case readiness."
                actions={
                  <Link
                    to="/project/$projectSlug/repository"
                    params={{ projectSlug }}
                    className="tms-button min-h-0 px-2.5 py-1 text-xs no-underline"
                  >
                    Open repository
                  </Link>
                }
                className="mb-3"
              />

              <div className="overview-suite-grid">
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
                      className="overview-suite-card rounded-[var(--tms-radius-overlay)] border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-3 py-2 shadow-none"
                    >
                      <div className="truncate text-sm font-semibold text-[var(--tms-text)]">
                        {section.name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--tms-text-muted)]">
                        <span>{suiteTests.length} cases</span>
                        <span>Ready {suiteReady}</span>
                        <span>Draft {suiteTests.length - suiteReady}</span>
                      </div>
                    </Panel>
                  )
                })}
              </div>
            </Panel>

            <Panel className="overview-panel px-4 py-3">
              <WorkspaceSectionHeader
                dense
                title="Recent test cases"
                description="Latest created cases across the project repository."
                meta={
                  <Badge variant={archivedCases > 0 ? 'warning' : 'draft'}>
                    {archivedCases} archived
                  </Badge>
                }
                className="mb-3"
              />

              {recentCases.length === 0 ? (
                <EmptyState
                  title="No test cases yet"
                  description="Newly created test cases will appear here."
                />
              ) : (
                <div className="grid gap-2">
                  {recentCases.map((test) => {
                    const suite =
                      dashboard.sections.find((section) => section.id === test.sectionId) ??
                      null

                    return (
                      <Link
                        key={test.id}
                        to="/test/$testId"
                        params={{ testId: test.id.toString() }}
                        className="overview-list-row no-underline transition hover:border-[var(--tms-primary-border)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[var(--tms-text)]">
                              #{test.id} {test.title}
                            </div>
                            <div className="mt-0.5 text-xs text-[var(--tms-text-muted)]">
                              {suite?.name ?? 'No suite'} / {test.status ?? 'Draft'}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-[var(--tms-primary)]">
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

          <div className="overview-side-column">
            <Panel className="overview-panel px-4 py-3">
              <WorkspaceSectionHeader
                dense
                title="Recent runs"
                description="Latest execution activity for this project."
                className="mb-3"
              />

              <div className="grid gap-2">
                {recentRuns.length === 0 ? (
                  <EmptyState
                    title="No runs yet"
                    description="Execution runs will appear here once created."
                  />
                ) : (
                  recentRuns.map((run) => (
                    <Link
                      key={run.id}
                      to="/run/$runId"
                      params={{ runId: run.id.toString() }}
                      className="overview-list-row no-underline transition hover:border-[var(--tms-primary-border)]"
                    >
                      <div className="truncate text-sm font-semibold text-[var(--tms-text)]">
                        {run.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--tms-text-muted)]">Run ID: {run.id}</div>
                    </Link>
                  ))
                )}
              </div>
            </Panel>
          </div>
          </section>
        </div>
      </div>
    </main>
  )
}
