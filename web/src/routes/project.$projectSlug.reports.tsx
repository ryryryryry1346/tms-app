import { Link, createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { Badge } from '../components/ui/Badge'
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
        ? 'bg-[#ecf2ff] text-[#2f6fe4]'
        : 'text-[#60718f] hover:bg-[#f5f8ff]'
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

  const projectSlug = project.slug ?? project.id.toString()

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[#f7f9fe]">
      <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
        <section className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-3 text-sm text-[#6d7d9e]">
              <Link to="/" className="no-underline text-[#6d7d9e]">
                Workspace
              </Link>
              <span>/</span>
              <Link
                to="/project/$projectSlug"
                params={{ projectSlug }}
                className="no-underline text-[#6d7d9e]"
              >
                Project
              </Link>
              <span>/</span>
              <span>Reports</span>
            </div>
            <h1 className="m-0 text-4xl font-bold tracking-tight text-[#1b2f5b] md:text-5xl">
              {project.name}
            </h1>
            <p className="mt-3 text-base text-[#63759a] md:text-lg">
              Reporting workspace for quality trends, run outcomes, and project readiness.
            </p>
            <div className="mt-4">
              <ProjectSubnav projectSlug={projectSlug} active="reports" />
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Readiness', value: `${readiness}%`, tone: 'text-[#2ea66b]' },
            { label: 'Ready', value: readyCases, tone: 'text-[#2f6fe4]' },
            { label: 'Draft', value: draftCases, tone: 'text-[#7b879f]' },
            { label: 'Archived', value: archivedCases, tone: 'text-[#9a6b3d]' },
            { label: 'Runs', value: runs.length, tone: 'text-[#d05656]' },
          ].map((item) => (
            <Panel
              key={item.label}
              className="px-6 py-5"
            >
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[#7686a7]">
                {item.label}
              </div>
              <div className={`mt-3 text-4xl font-semibold ${item.tone}`}>
                {item.value}
              </div>
            </Panel>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.8fr)]">
          <Panel className="px-6 py-6">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="m-0 text-2xl font-semibold text-[#1b2f5b]">
                  Reports
                </h2>
                <p className="mt-2 text-sm text-[#63759a]">
                  This page is reserved for aggregated quality reporting.
                </p>
              </div>
              <Badge variant="draft">
                Coming soon
              </Badge>
            </div>

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
                  className="rounded-2xl border-[#e6ecf8] bg-[#fbfcff] p-5 shadow-none"
                >
                  <h3 className="m-0 text-lg font-semibold text-[#1b2f5b]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#63759a]">
                    {item.text}
                  </p>
                </Panel>
              ))}
            </div>
          </Panel>

          <Panel className="px-6 py-6">
            <h2 className="m-0 text-2xl font-semibold text-[#1b2f5b]">
              Current snapshot
            </h2>
            <div className="mt-5 grid gap-3">
              {[
                ['Suites', dashboard.sections.length],
                ['Active cases', activeTests.length],
                ['Ready cases', readyCases],
                ['Total runs', runs.length],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl border border-[#edf1f8] bg-[#fbfcff] px-4 py-3"
                >
                  <span className="text-sm font-semibold text-[#63759a]">
                    {label}
                  </span>
                  <span className="text-lg font-semibold text-[#1b2f5b]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  )
}
