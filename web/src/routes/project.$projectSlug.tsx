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
import { MetricCard } from '../components/ui/MetricCard'
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
  const recentCases = [...dashboard.tests].sort((a, b) => b.id - a.id).slice(0, 5)

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            projectSlug={projectSlug}
            activeTab="overview"
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

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Suites', value: dashboard.sections.length, tone: 'primary' as const },
            { label: 'Cases', value: activeTests.length, tone: 'primary' as const },
            { label: 'Ready', value: readyCases, tone: 'success' as const },
            { label: 'Draft', value: draftCases, tone: 'muted' as const },
            { label: 'Runs', value: runs.length, tone: 'danger' as const },
          ].map((item) => (
            <MetricCard
              key={item.label}
              label={item.label}
              value={item.value}
              tone={item.tone}
              density="compact"
            />
          ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-6">
            <Panel className="px-6 py-5">
              <WorkspaceSectionHeader
                title="Repository health"
                description="Snapshot of suite structure and test case readiness."
                actions={
                  <Link
                    to="/project/$projectSlug/repository"
                    params={{ projectSlug }}
                    className="tms-button no-underline"
                  >
                    Open repository
                  </Link>
                }
                className="mb-5"
              />

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
              <WorkspaceSectionHeader
                title="Recent test cases"
                description="Latest created cases across the project repository."
                meta={
                  <Badge variant={archivedCases > 0 ? 'warning' : 'draft'}>
                    {archivedCases} archived
                  </Badge>
                }
                className="mb-5"
              />

              {recentCases.length === 0 ? (
                <EmptyState
                  title="No test cases yet"
                  description="Newly created test cases will appear here."
                />
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
              <WorkspaceSectionHeader
                title="Recent runs"
                description="Latest execution activity for this project."
                className="mb-5"
              />

              <div className="grid gap-3">
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
              <WorkspaceSectionHeader
                title="Quick actions"
                description="Jump straight into the most common project workflows."
                className="mb-5"
              />

              <div className="grid gap-3">
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
      </div>
    </main>
  )
}
