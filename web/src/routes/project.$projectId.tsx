import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { getDashboardState } from '../features/tests/server'

export const Route = createFileRoute('/project/$projectId')({
  loader: async ({ params }) => {
    const projectId = Number(params.projectId)

    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw notFound()
    }

    const dashboard = await getDashboardState({
      data: {
        projectId,
      },
    })

    const project = dashboard.projects.find((item) => item.id === projectId)

    if (!project?.slug) {
      throw notFound()
    }

    throw redirect({
      to: '/project/$projectSlug',
      params: {
        projectSlug: project.slug,
      },
      replace: true,
    })
  },
})
