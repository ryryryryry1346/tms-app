import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Badge } from '../components/ui/Badge'
import { MetricCard } from '../components/ui/MetricCard'
import { Panel } from '../components/ui/Panel'
import { getRunsForProject } from '../features/runs/server'
import { getDashboardState } from '../features/tests/server'

export const Route = createFileRoute('/project/$projectSlug/reports')({
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
          to: '/project/$projectSlug/reports',
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
  component: ProjectReportsPage,
})

function ProjectReportsPage() {
  const { project, dashboard, runs } = Route.useLoaderData()
  const activeTests = dashboard.tests.filter((test) => test.status !== 'Archived')
  const readyCases = activeTests.filter((test) => test.status === 'Ready').length
  const draftCases = activeTests.filter((test) => test.status === 'Draft').length
  const archivedCases = dashboard.tests.filter(
    (test) => test.status === 'Archived',
  ).length
  const readiness =
    activeTests.length > 0 ? Math.round((readyCases / activeTests.length) * 100) : 0

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            description="Reporting workspace for quality trends, run outcomes, and project readiness."
          />

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Readiness', value: `${readiness}%`, tone: 'success' as const },
            { label: 'Ready', value: readyCases, tone: 'primary' as const },
            { label: 'Draft', value: draftCases, tone: 'muted' as const },
            { label: 'Archived', value: archivedCases, tone: 'warning' as const },
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

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.8fr)]">
          <Panel className="px-6 py-6">
            <WorkspaceSectionHeader
              title="Reports"
              description="This page is reserved for aggregated quality reporting."
              meta={<Badge variant="draft">Coming soon</Badge>}
              className="mb-6"
            />

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Execution trends',
                  text: 'Passed, failed, blocked, and skipped outcomes over time.',
                },
                {
                  title: 'Readiness history',
                  text: 'How repository readiness changes across suites and releases.',
                },
                {
                  title: 'Release snapshot',
                  text: 'A compact status view for go/no-go decisions.',
                },
              ].map((item) => (
                <Panel
                  key={item.title}
                  className="rounded-2xl border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] p-5 shadow-none"
                >
                  <h3 className="m-0 text-lg font-semibold text-[var(--tms-text)]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--tms-text-muted)]">
                    {item.text}
                  </p>
                </Panel>
              ))}
            </div>
          </Panel>

          <Panel className="px-6 py-6">
            <WorkspaceSectionHeader
              title="Current snapshot"
              description="High-level repository and execution indicators for this project."
              className="mb-5"
            />
            <div className="grid gap-3">
              {[
                ['Suites', dashboard.sections.length],
                ['Active cases', activeTests.length],
                ['Ready cases', readyCases],
                ['Total runs', runs.length],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-4 py-3"
                >
                  <span className="text-sm font-semibold text-[var(--tms-text-muted)]">
                    {label}
                  </span>
                  <span className="text-lg font-semibold text-[var(--tms-text)]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
          </section>
        </div>
      </div>
    </main>
  )
}
