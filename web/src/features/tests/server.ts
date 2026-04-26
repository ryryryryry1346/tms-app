import { and, asc, eq, inArray } from 'drizzle-orm'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDb, isDatabaseConfigured } from '../../db/client'
import { projects, sections, tests, testRunItems } from '../../db/schema'
import { ensureProjectSlugs } from '../projects/slug'

const dashboardInput = z.object({
  projectId: z.number().int().positive().optional(),
  projectSlug: z.string().trim().min(1).optional(),
})

const updateTestStatusInput = z.object({
  id: z.number().int().positive(),
  status: z.enum(['Draft', 'Ready', 'Archived']),
})

const bulkUpdateTestStatusInput = z.object({
  ids: z.array(z.number().int().positive()).min(1),
  status: z.enum(['Draft', 'Ready', 'Archived']),
})

const bulkRestoreTestCasesInput = z.object({
  ids: z.array(z.number().int().positive()).min(1),
})

const bulkDeleteArchivedTestCasesInput = z.object({
  ids: z.array(z.number().int().positive()).min(1),
})

const getTestDetailInput = z.object({
  id: z.number().int().positive(),
})

const createTestInput = z.object({
  title: z.string().trim().min(1),
  sectionId: z.number().int().positive(),
  status: z.enum(['Draft', 'Ready']),
  steps: z.string(),
  expected: z.string(),
})

const updateTestInput = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1),
  sectionId: z.number().int().positive(),
  status: z.enum(['Draft', 'Ready', 'Archived']),
  steps: z.string(),
  expected: z.string(),
})

export type DashboardTest = {
  id: number
  title: string
  steps: string | null
  expected: string | null
  status: string | null
  archivedFromStatus: string | null
  sectionId: number | null
  projectId: number | null
}

export type DashboardSection = {
  id: number
  name: string
  projectId: number | null
  projectName?: string | null
  projectSlug?: string | null
}

export type DashboardProject = {
  id: number
  name: string
  slug: string | null
  status: string | null
}

export type DashboardState = {
  databaseConfigured: boolean
  projects: DashboardProject[]
  selectedProjectId?: number
  sections: DashboardSection[]
  tests: DashboardTest[]
}

export type CreateTestFormState = {
  databaseConfigured: boolean
  sections: DashboardSection[]
}

export type EditTestFormState = {
  databaseConfigured: boolean
  sections: DashboardSection[]
  test: {
    id: number
    title: string
    steps: string
    expected: string
    status: 'Draft' | 'Ready' | 'Archived'
    sectionId: number
    projectId: number | null
  }
}

export type TestDetail = {
  id: number
  title: string
  steps: string | null
  expected: string | null
  status: string | null
  archivedFromStatus: string | null
  sectionId: number | null
  projectId: number | null
  sectionName: string | null
  projectName: string | null
  projectSlug: string | null
}

export const getDashboardState = createServerFn({ method: 'POST' })
  .inputValidator(dashboardInput)
  .handler(async ({ data }): Promise<DashboardState> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    if (!isDatabaseConfigured()) {
      return {
        databaseConfigured: false,
        projects: [],
        selectedProjectId: data.projectId,
        sections: [],
        tests: [],
      }
    }

    const db = getDb()
    await ensureProjectSlugs()
    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        status: projects.status,
      })
      .from(projects)
      .orderBy(asc(projects.id))

    const selectedProjectId =
      data.projectId ??
      projectRows.find((project) => project.slug === data.projectSlug)?.id

    if (!selectedProjectId) {
      return {
        databaseConfigured: true,
        projects: projectRows,
        sections: [],
        tests: [],
      }
    }

    const sectionRows = await db
      .select({
        id: sections.id,
        name: sections.name,
        projectId: sections.projectId,
      })
      .from(sections)
      .where(eq(sections.projectId, selectedProjectId))
      .orderBy(asc(sections.id))

    const testRows = await db
      .select({
        id: tests.id,
        title: tests.title,
        steps: tests.steps,
        expected: tests.expected,
        status: tests.status,
        archivedFromStatus: tests.archivedFromStatus,
        sectionId: tests.sectionId,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(eq(tests.projectId, selectedProjectId))
      .orderBy(asc(tests.id))

    return {
      databaseConfigured: true,
      projects: projectRows,
      selectedProjectId,
      sections: sectionRows,
      tests: testRows,
    }
  })

export const updateTestStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateTestStatusInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    await db
      .update(tests)
      .set({
        status: data.status,
      })
      .where(and(eq(tests.id, data.id)))

    return { ok: true }
  })

export const bulkUpdateTestStatus = createServerFn({ method: 'POST' })
  .inputValidator(bulkUpdateTestStatusInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
        archivedFromStatus: tests.archivedFromStatus,
      })
      .from(tests)
      .where(inArray(tests.id, data.ids))

    if (rows.length === 0) {
      throw new Error('No test cases were selected.')
    }

    await db.transaction(async (tx) => {
      for (const test of rows) {
        if (data.status === 'Archived') {
          await tx
            .update(tests)
            .set({
              status: 'Archived',
              archivedFromStatus:
                test.status === 'Ready' || test.status === 'Draft'
                  ? test.status
                  : test.archivedFromStatus ?? 'Draft',
            })
            .where(eq(tests.id, test.id))

          continue
        }

        await tx
          .update(tests)
          .set({
            status: data.status,
            archivedFromStatus: null,
          })
          .where(eq(tests.id, test.id))
      }
    })

    return { ok: true }
  })

export const bulkRestoreTestCases = createServerFn({ method: 'POST' })
  .inputValidator(bulkRestoreTestCasesInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
        archivedFromStatus: tests.archivedFromStatus,
      })
      .from(tests)
      .where(inArray(tests.id, data.ids))

    const archivedRows = rows.filter((test) => test.status === 'Archived')

    if (archivedRows.length === 0) {
      throw new Error('No archived test cases were selected.')
    }

    await db.transaction(async (tx) => {
      for (const test of archivedRows) {
        await tx
          .update(tests)
          .set({
            status:
              test.archivedFromStatus === 'Ready'
                ? 'Ready'
                : test.archivedFromStatus === 'Draft'
                  ? 'Draft'
                  : 'Draft',
            archivedFromStatus: null,
          })
          .where(eq(tests.id, test.id))
      }
    })

    return { ok: true }
  })

export const bulkDeleteArchivedTestCases = createServerFn({ method: 'POST' })
  .inputValidator(bulkDeleteArchivedTestCasesInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
      })
      .from(tests)
      .where(inArray(tests.id, data.ids))

    const archivedRows = rows.filter((test) => test.status === 'Archived')

    if (archivedRows.length === 0) {
      throw new Error('No archived test cases were selected.')
    }

    const archivedIds = archivedRows.map((test) => test.id)
    const usedInRuns = await db
      .select({
        testId: testRunItems.testId,
      })
      .from(testRunItems)
      .where(inArray(testRunItems.testId, archivedIds))

    if (usedInRuns.length > 0) {
      throw new Error(
        'Some selected test cases are used in test runs and cannot be deleted permanently.',
      )
    }

    await db.delete(tests).where(inArray(tests.id, archivedIds))

    return { ok: true }
  })

export const archiveTestCase = createServerFn({ method: 'POST' })
  .inputValidator(getTestDetailInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
        archivedFromStatus: tests.archivedFromStatus,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)

    const test = rows[0]

    if (!test) {
      throw notFound()
    }

    await db
      .update(tests)
      .set({
        status: 'Archived',
        archivedFromStatus:
          test.status === 'Ready' || test.status === 'Draft'
            ? test.status
            : test.archivedFromStatus ?? 'Draft',
      })
      .where(eq(tests.id, data.id))

    return { ok: true }
  })

export const restoreTestCase = createServerFn({ method: 'POST' })
  .inputValidator(getTestDetailInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
        archivedFromStatus: tests.archivedFromStatus,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)

    const test = rows[0]

    if (!test) {
      throw notFound()
    }

    await db
      .update(tests)
      .set({
        status:
          test.archivedFromStatus === 'Ready'
            ? 'Ready'
            : test.archivedFromStatus === 'Draft'
              ? 'Draft'
              : 'Draft',
        archivedFromStatus: null,
      })
      .where(eq(tests.id, data.id))

    return { ok: true }
  })

export const deleteArchivedTestCase = createServerFn({ method: 'POST' })
  .inputValidator(getTestDetailInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)

    const test = rows[0]

    if (!test) {
      throw notFound()
    }

    if (test.status !== 'Archived') {
      throw new Error('Only archived test cases can be deleted permanently.')
    }

    const runItemRows = await db
      .select({
        id: testRunItems.id,
      })
      .from(testRunItems)
      .where(eq(testRunItems.testId, data.id))
      .limit(1)

    if (runItemRows[0]) {
      throw new Error(
        'This test case is used in test runs and cannot be deleted permanently.',
      )
    }

    await db.delete(tests).where(eq(tests.id, data.id))

    return { ok: true }
  })

export const getCreateTestFormState = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CreateTestFormState> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    if (!isDatabaseConfigured()) {
      return {
        databaseConfigured: false,
        sections: [],
      }
    }

    const db = getDb()
    await ensureProjectSlugs()
    const rows = await db
      .select({
        id: sections.id,
        name: sections.name,
        projectId: sections.projectId,
      })
      .from(sections)
      .orderBy(asc(sections.id))

    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
      })
      .from(projects)

    const projectById = new Map(projectRows.map((project) => [project.id, project]))

    return {
      databaseConfigured: true,
      sections: rows.map((section) => ({
        ...section,
        projectName:
          section.projectId !== null
            ? (projectById.get(section.projectId)?.name ?? null)
            : null,
        projectSlug:
          section.projectId !== null
            ? (projectById.get(section.projectId)?.slug ?? null)
            : null,
      })),
    }
  },
)

export const createTestCase = createServerFn({ method: 'POST' })
  .inputValidator(createTestInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const matchingSection = await db
      .select({
        id: sections.id,
        projectId: sections.projectId,
      })
      .from(sections)
      .where(eq(sections.id, data.sectionId))
      .limit(1)

    const section = matchingSection[0]

    if (!section || !section.projectId) {
      throw new Error(
        'The selected section is missing or is not attached to a project.',
      )
    }

    const result = await db.insert(tests).values({
      title: data.title,
      steps: data.steps,
      expected: data.expected,
      status: data.status,
      sectionId: data.sectionId,
      projectId: section.projectId,
    })

    return {
      id: result[0].insertId,
    }
  })

export const getEditTestFormState = createServerFn({ method: 'POST' })
  .inputValidator(getTestDetailInput)
  .handler(async ({ data }): Promise<EditTestFormState> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    if (!isDatabaseConfigured()) {
      throw new Error('Database is not configured.')
    }

    const db = getDb()
    await ensureProjectSlugs()
    const testRows = await db
      .select({
        id: tests.id,
        title: tests.title,
        steps: tests.steps,
        expected: tests.expected,
        status: tests.status,
        archivedFromStatus: tests.archivedFromStatus,
        sectionId: tests.sectionId,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)

    const test = testRows[0]

    if (!test || test.sectionId === null) {
      throw notFound()
    }

    const sectionsRows = await db
      .select({
        id: sections.id,
        name: sections.name,
        projectId: sections.projectId,
      })
      .from(sections)
      .orderBy(asc(sections.id))

    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
      })
      .from(projects)

    const projectById = new Map(projectRows.map((project) => [project.id, project]))

    return {
      databaseConfigured: true,
      sections: sectionsRows.map((section) => ({
        ...section,
        projectName:
          section.projectId !== null
            ? (projectById.get(section.projectId)?.name ?? null)
            : null,
        projectSlug:
          section.projectId !== null
            ? (projectById.get(section.projectId)?.slug ?? null)
            : null,
      })),
      test: {
        id: test.id,
        title: test.title,
        steps: test.steps ?? '',
        expected: test.expected ?? '',
        status:
          test.status === 'Ready'
            ? 'Ready'
            : test.status === 'Archived'
              ? 'Archived'
              : 'Draft',
        sectionId: test.sectionId,
        projectId: test.projectId,
      },
    }
  })

export const updateTestCase = createServerFn({ method: 'POST' })
  .inputValidator(updateTestInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const matchingSection = await db
      .select({
        id: sections.id,
        projectId: sections.projectId,
      })
      .from(sections)
      .where(eq(sections.id, data.sectionId))
      .limit(1)

    const section = matchingSection[0]

    if (!section || !section.projectId) {
      throw new Error(
        'The selected section is missing or is not attached to a project.',
      )
    }

    await db
      .update(tests)
      .set({
        title: data.title,
        steps: data.steps,
        expected: data.expected,
        status: data.status,
        sectionId: data.sectionId,
        projectId: section.projectId,
      })
      .where(eq(tests.id, data.id))

    return {
      id: data.id,
    }
  })

export const getTestDetail = createServerFn({ method: 'POST' })
  .inputValidator(getTestDetailInput)
  .handler(async ({ data }): Promise<TestDetail> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    await ensureProjectSlugs()
    const rows = await db
      .select({
        id: tests.id,
        title: tests.title,
        steps: tests.steps,
        expected: tests.expected,
        status: tests.status,
        archivedFromStatus: tests.archivedFromStatus,
        sectionId: tests.sectionId,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)

    const test = rows[0]

    if (!test) {
      throw notFound()
    }

    const sectionRows =
      test.sectionId === null
        ? []
        : await db
            .select({
              id: sections.id,
              name: sections.name,
              projectId: sections.projectId,
            })
            .from(sections)
            .where(eq(sections.id, test.sectionId))
            .limit(1)

    const section = sectionRows[0] ?? null

    const projectRows =
      test.projectId === null
        ? []
        : await db
            .select({
              id: projects.id,
              name: projects.name,
              slug: projects.slug,
            })
            .from(projects)
            .where(eq(projects.id, test.projectId))
            .limit(1)

    const project = projectRows[0] ?? null

    return {
      ...test,
      sectionName: section?.name ?? null,
      projectName: project?.name ?? null,
      projectSlug: project?.slug ?? null,
    }
  })
