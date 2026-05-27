import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

let and: typeof import('drizzle-orm')['and']
let desc: typeof import('drizzle-orm')['desc']
let eq: typeof import('drizzle-orm')['eq']
let like: typeof import('drizzle-orm')['like']
let or: typeof import('drizzle-orm')['or']
let getDb: typeof import('../../db/client')['getDb']
let isDatabaseConfigured: typeof import('../../db/client')['isDatabaseConfigured']
let automationRuns: typeof import('../../db/schema')['automationRuns']
let automationTestResults: typeof import('../../db/schema')['automationTestResults']
let automationAttachments: typeof import('../../db/schema')['automationAttachments']
let automationTestCaseLinks: typeof import('../../db/schema')['automationTestCaseLinks']
let projectApiTokens: typeof import('../../db/schema')['projectApiTokens']
let projects: typeof import('../../db/schema')['projects']
let sections: typeof import('../../db/schema')['sections']
let tests: typeof import('../../db/schema')['tests']

async function ensureAutomationServerDeps(): Promise<void> {
  if (getDb) {
    return
  }

  const [drizzle, dbClient, schema] = await Promise.all([
    import('drizzle-orm'),
    import('../../db/client'),
    import('../../db/schema'),
  ])

  and = drizzle.and
  desc = drizzle.desc
  eq = drizzle.eq
  like = drizzle.like
  or = drizzle.or
  getDb = dbClient.getDb
  isDatabaseConfigured = dbClient.isDatabaseConfigured
  automationRuns = schema.automationRuns
  automationTestResults = schema.automationTestResults
  automationAttachments = schema.automationAttachments
  automationTestCaseLinks = schema.automationTestCaseLinks
  projectApiTokens = schema.projectApiTokens
  projects = schema.projects
  sections = schema.sections
  tests = schema.tests
}

const automationJunitImportInput = z.object({
  projectId: z.number().int().positive(),
  externalId: z.string().trim().min(1).max(255).optional(),
  name: z.string().trim().min(1).optional(),
  environment: z.string().trim().max(128).optional(),
  branch: z.string().trim().max(255).optional(),
  commitSha: z.string().trim().max(128).optional(),
  ciBuildUrl: z.string().trim().max(2048).optional(),
  triggerSource: z.enum(['manual', 'ci', 'api']).optional(),
  xml: z.string().trim().min(1),
})

const automationJsonImportInput = z.object({
  projectId: z.number().int().positive(),
  externalId: z.string().trim().min(1).max(255).optional(),
  name: z.string().trim().min(1),
  environment: z.string().trim().max(128).optional(),
  branch: z.string().trim().max(255).optional(),
  commitSha: z.string().trim().max(128).optional(),
  ciBuildUrl: z.string().trim().max(2048).optional(),
  triggerSource: z.enum(['manual', 'ci', 'api']).optional(),
  results: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(512),
        suite: z.string().trim().max(255).optional(),
        filePath: z.string().trim().max(2048).optional(),
        status: z.enum(['passed', 'failed', 'skipped', 'blocked', 'unknown']),
        durationMs: z.number().int().min(0).optional(),
        caseId: z.union([z.string(), z.number()]).optional(),
        errorMessage: z.string().optional(),
        stackTrace: z.string().optional(),
        stdout: z.string().optional(),
        stderr: z.string().optional(),
        startedAt: z.string().trim().max(32).optional(),
        attachments: z
          .array(
            z.object({
              name: z.string().trim().max(255).optional(),
              type: z.string().trim().max(64).optional(),
              url: z.string().trim().min(1).max(4096),
              contentType: z.string().trim().max(128).optional(),
              sizeBytes: z.number().int().min(0).optional(),
            }),
          )
          .optional(),
      }),
    )
    .min(1),
})

const projectAutomationInput = z.object({
  projectId: z.number().int().positive(),
})

const createProjectApiTokenInput = projectAutomationInput.extend({
  name: z.string().trim().min(1).max(255).optional(),
})

const revokeProjectApiTokenInput = projectAutomationInput.extend({
  tokenId: z.number().int().positive(),
})

const automationRunDetailInput = projectAutomationInput.extend({
  runId: z.number().int().positive(),
})

const automationResultLinkInput = automationRunDetailInput.extend({
  resultId: z.number().int().positive(),
})

const automationResultManualCaseLinkInput = automationResultLinkInput.extend({
  manualTestId: z.number().int().positive(),
})

const automationManualCaseSearchInput = projectAutomationInput.extend({
  query: z.string().trim().max(255).optional(),
})

export type AutomationResultStatus =
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'blocked'
  | 'unknown'

export type AutomationRunStatus =
  | AutomationResultStatus
  | 'running'
  | 'needs_review'

export type ParsedJunitResult = {
  name: string
  suite: string | null
  filePath: string | null
  status: AutomationResultStatus
  durationMs: number
  caseKey: string | null
  manualTestId: number | null
  errorMessage: string | null
  stackTrace: string | null
  stdout: string | null
  stderr: string | null
  startedAt: string | null
  attachments: AutomationResultAttachment[]
}

export type AutomationImportResult = {
  runId: number
  created: boolean
  replacedExisting: boolean
  totalCount: number
  passedCount: number
  failedCount: number
  skippedCount: number
  blockedCount: number
  unknownCount: number
  durationMs: number
  linkedManualCases: number
}

export type ProjectApiTokenSummary = {
  id: number
  name: string
  tokenPrefix: string
  status: string
  lastUsedAt: string | null
  createdAt: string
}

export type AutomationRunListItem = {
  id: number
  name: string
  status: string
  environment: string | null
  branch: string | null
  commitSha: string | null
  ciBuildUrl: string | null
  triggerSource: string
  startedAt: string | null
  finishedAt: string | null
  durationMs: number
  totalCount: number
  passedCount: number
  failedCount: number
  skippedCount: number
  blockedCount: number
  unknownCount: number
  createdAt: string
}

export type AutomationRunResultSummary = {
  id: number
  runId: number
  name: string
  suite: string | null
  status: string
  durationMs: number
  createdAt: string
}

export type AutomationFlakyTestItem = {
  key: string
  name: string
  suite: string | null
  totalCount: number
  passedCount: number
  failedCount: number
  skippedCount: number
  blockedCount: number
  flakyRate: number
  averageDurationMs: number
  lastStatus: string
  lastRunId: number
  lastRunName: string
  lastRunAt: string
  lastFailureAt: string | null
  lastFailureRunId: number | null
  lastFailureRunName: string | null
  lastFailureMessage: string | null
  linkedManualTestId: number | null
  recommendation: 'review' | 'quarantine' | 'stable'
}

export type AutomationHistoryResult = {
  id: number
  runId: number
  runName: string
  runStatus: string
  environment: string | null
  branch: string | null
  commitSha: string | null
  runCreatedAt: string
  name: string
  suite: string | null
  status: string
  durationMs: number
  errorMessage: string | null
  startedAt: string | null
}

export type AutomationTestCaseHistory = {
  totalResults: number
  passedCount: number
  failedCount: number
  skippedCount: number
  blockedCount: number
  unknownCount: number
  passRate: number
  latestStatus: string | null
  latestRunId: number | null
  latestRunName: string | null
  latestRunAt: string | null
  results: AutomationHistoryResult[]
}

export type AutomationRunResultItem = {
  id: number
  name: string
  suite: string | null
  filePath: string | null
  status: string
  durationMs: number
  manualTestId: number | null
  caseKey: string | null
  errorMessage: string | null
  stackTrace: string | null
  stdout: string | null
  stderr: string | null
  retryCount: number
  startedAt: string | null
  suggestedManualCase: AutomationManualCaseOption | null
  attachments: AutomationResultAttachment[]
}

export type AutomationRunDetail = AutomationRunListItem & {
  rawFormat: string
  rawReport: string | null
  results: AutomationRunResultItem[]
}

export type AutomationManualCaseOption = {
  id: number
  title: string
  suiteName: string | null
  status: string | null
}

export type AutomationResultAttachment = {
  id?: number
  name: string
  type: string | null
  url: string
  contentType: string | null
  sizeBytes: number | null
}

export const importAutomationJunitXml = createServerFn({ method: 'POST' })
  .inputValidator(automationJunitImportInput)
  .handler(async ({ data }): Promise<AutomationImportResult> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureAutomationServerDeps()

    return importJunitAutomationRun(data)
  })

export const importAutomationJson = createServerFn({ method: 'POST' })
  .inputValidator(automationJsonImportInput)
  .handler(async ({ data }): Promise<AutomationImportResult> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureAutomationServerDeps()

    return importJsonAutomationRun(data)
  })

export const getProjectApiTokens = createServerFn({ method: 'POST' })
  .inputValidator(projectAutomationInput)
  .handler(async ({ data }): Promise<{ tokens: ProjectApiTokenSummary[] }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureAutomationServerDeps()

    if (!isDatabaseConfigured()) {
      return { tokens: [] }
    }

    const db = getDb()
    const tokens = await db
      .select({
        id: projectApiTokens.id,
        name: projectApiTokens.name,
        tokenPrefix: projectApiTokens.tokenPrefix,
        status: projectApiTokens.status,
        lastUsedAt: projectApiTokens.lastUsedAt,
        createdAt: projectApiTokens.createdAt,
      })
      .from(projectApiTokens)
      .where(eq(projectApiTokens.projectId, data.projectId))
      .orderBy(desc(projectApiTokens.id))

    return { tokens }
  })

export const createProjectApiToken = createServerFn({ method: 'POST' })
  .inputValidator(createProjectApiTokenInput)
  .handler(
    async ({
      data,
    }): Promise<{ token: string; tokenRecord: ProjectApiTokenSummary }> => {
      const { requireSessionUser } = await import('../auth/helpers.server')
      await requireSessionUser()
      await ensureAutomationServerDeps()

      if (!isDatabaseConfigured()) {
        throw new Error('Database is not configured.')
      }

      const db = getDb()
      const projectRows = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, data.projectId))
        .limit(1)

      if (!projectRows[0]) {
        throw new Error('Project was not found.')
      }

      const now = new Date().toISOString()
      const token = await createProjectApiTokenValue()
      const tokenHash = await hashProjectApiToken(token)
      const tokenPrefix = token.slice(0, 12)
      const tokenName = data.name ?? 'CI import token'

      const insertResult = await db.insert(projectApiTokens).values({
        projectId: data.projectId,
        name: tokenName,
        tokenHash,
        tokenPrefix,
        status: 'active',
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now,
      })

      const tokenId = insertResult[0].insertId

      return {
        token,
        tokenRecord: {
          id: tokenId,
          name: tokenName,
          tokenPrefix,
          status: 'active',
          lastUsedAt: null,
          createdAt: now,
        },
      }
    },
  )

export const revokeProjectApiToken = createServerFn({ method: 'POST' })
  .inputValidator(revokeProjectApiTokenInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureAutomationServerDeps()

    if (!isDatabaseConfigured()) {
      throw new Error('Database is not configured.')
    }

    await getDb()
      .update(projectApiTokens)
      .set({
        status: 'revoked',
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(projectApiTokens.id, data.tokenId),
          eq(projectApiTokens.projectId, data.projectId),
        ),
      )

    return { ok: true }
  })

export const getAutomationRuns = createServerFn({ method: 'POST' })
  .inputValidator(projectAutomationInput)
  .handler(
    async ({
      data,
    }): Promise<{
      runs: AutomationRunListItem[]
      recentResults: AutomationRunResultSummary[]
    }> => {
      const { requireSessionUser } = await import('../auth/helpers.server')
      await requireSessionUser()
      await ensureAutomationServerDeps()

      if (!isDatabaseConfigured()) {
        return { runs: [], recentResults: [] }
      }

      const db = getDb()
      const rows = await db
        .select({
          id: automationRuns.id,
          name: automationRuns.name,
          status: automationRuns.status,
          environment: automationRuns.environment,
          branch: automationRuns.branch,
          commitSha: automationRuns.commitSha,
          ciBuildUrl: automationRuns.ciBuildUrl,
          triggerSource: automationRuns.triggerSource,
          startedAt: automationRuns.startedAt,
          finishedAt: automationRuns.finishedAt,
          durationMs: automationRuns.durationMs,
          totalCount: automationRuns.totalCount,
          passedCount: automationRuns.passedCount,
          failedCount: automationRuns.failedCount,
          skippedCount: automationRuns.skippedCount,
          blockedCount: automationRuns.blockedCount,
          unknownCount: automationRuns.unknownCount,
          createdAt: automationRuns.createdAt,
        })
        .from(automationRuns)
        .where(eq(automationRuns.projectId, data.projectId))
        .orderBy(desc(automationRuns.id))
        .limit(100)

      const recentResults = await db
        .select({
          id: automationTestResults.id,
          runId: automationTestResults.runId,
          name: automationTestResults.name,
          suite: automationTestResults.suite,
          status: automationTestResults.status,
          durationMs: automationTestResults.durationMs,
          createdAt: automationTestResults.createdAt,
        })
        .from(automationTestResults)
        .where(eq(automationTestResults.projectId, data.projectId))
        .orderBy(desc(automationTestResults.id))
        .limit(500)

      return { runs: rows, recentResults }
    },
  )

export const getAutomationFlakyTests = createServerFn({ method: 'POST' })
  .inputValidator(projectAutomationInput)
  .handler(
    async ({ data }): Promise<{ tests: AutomationFlakyTestItem[] }> => {
      const { requireSessionUser } = await import('../auth/helpers.server')
      await requireSessionUser()
      await ensureAutomationServerDeps()

      if (!isDatabaseConfigured()) {
        return { tests: [] }
      }

      const rows = await getDb()
        .select({
          id: automationTestResults.id,
          runId: automationTestResults.runId,
          runName: automationRuns.name,
          runCreatedAt: automationRuns.createdAt,
          name: automationTestResults.name,
          suite: automationTestResults.suite,
          status: automationTestResults.status,
          durationMs: automationTestResults.durationMs,
          manualTestId: automationTestResults.manualTestId,
          errorMessage: automationTestResults.errorMessage,
          createdAt: automationTestResults.createdAt,
        })
        .from(automationTestResults)
        .innerJoin(automationRuns, eq(automationRuns.id, automationTestResults.runId))
        .where(eq(automationTestResults.projectId, data.projectId))
        .orderBy(desc(automationTestResults.id))
        .limit(2000)

      type FlakyAccumulator = {
        key: string
        name: string
        suite: string | null
        totalCount: number
        passedCount: number
        failedCount: number
        skippedCount: number
        blockedCount: number
        durationTotalMs: number
        lastStatus: string
        lastRunId: number
        lastRunName: string
        lastRunAt: string
        lastFailureAt: string | null
        lastFailureRunId: number | null
        lastFailureRunName: string | null
        lastFailureMessage: string | null
        linkedManualTestId: number | null
      }

      const grouped = new Map<string, FlakyAccumulator>()

      for (const row of rows) {
        const suite = row.suite ?? null
        const key = `${suite ?? 'No suite'}::${row.name}`
        const existing =
          grouped.get(key) ??
          ({
            key,
            name: row.name,
            suite,
            totalCount: 0,
            passedCount: 0,
            failedCount: 0,
            skippedCount: 0,
            blockedCount: 0,
            durationTotalMs: 0,
            lastStatus: row.status,
            lastRunId: row.runId,
            lastRunName: row.runName,
            lastRunAt: row.runCreatedAt,
            lastFailureAt: null,
            lastFailureRunId: null,
            lastFailureRunName: null,
            lastFailureMessage: null,
            linkedManualTestId: row.manualTestId,
          } satisfies FlakyAccumulator)

        existing.totalCount += 1
        existing.durationTotalMs += row.durationMs

        if (row.status === 'passed') {
          existing.passedCount += 1
        } else if (row.status === 'failed') {
          existing.failedCount += 1
        } else if (row.status === 'blocked') {
          existing.blockedCount += 1
        } else if (row.status === 'skipped') {
          existing.skippedCount += 1
        }

        if (!existing.linkedManualTestId && row.manualTestId) {
          existing.linkedManualTestId = row.manualTestId
        }

        if (
          (row.status === 'failed' || row.status === 'blocked') &&
          existing.lastFailureAt === null
        ) {
          existing.lastFailureAt = row.createdAt
          existing.lastFailureRunId = row.runId
          existing.lastFailureRunName = row.runName
          existing.lastFailureMessage = row.errorMessage
        }

        grouped.set(key, existing)
      }

      const tests = Array.from(grouped.values())
        .filter((item) => item.passedCount > 0 && item.failedCount + item.blockedCount > 0)
        .map((item): AutomationFlakyTestItem => {
          const unstableCount = item.failedCount + item.blockedCount
          const flakyRate =
            item.totalCount === 0
              ? 0
              : Math.round((unstableCount / item.totalCount) * 100)
          const averageDurationMs =
            item.totalCount === 0
              ? 0
              : Math.round(item.durationTotalMs / item.totalCount)
          const recommendation =
            flakyRate >= 40 || item.failedCount >= 3
              ? 'quarantine'
              : item.lastStatus === 'passed'
                ? 'stable'
                : 'review'

          return {
            key: item.key,
            name: item.name,
            suite: item.suite,
            totalCount: item.totalCount,
            passedCount: item.passedCount,
            failedCount: item.failedCount,
            skippedCount: item.skippedCount,
            blockedCount: item.blockedCount,
            flakyRate,
            averageDurationMs,
            lastStatus: item.lastStatus,
            lastRunId: item.lastRunId,
            lastRunName: item.lastRunName,
            lastRunAt: item.lastRunAt,
            lastFailureAt: item.lastFailureAt,
            lastFailureRunId: item.lastFailureRunId,
            lastFailureRunName: item.lastFailureRunName,
            lastFailureMessage: item.lastFailureMessage,
            linkedManualTestId: item.linkedManualTestId,
            recommendation,
          }
        })
        .sort((first, second) => {
          if (second.flakyRate !== first.flakyRate) {
            return second.flakyRate - first.flakyRate
          }

          return second.failedCount + second.blockedCount - (first.failedCount + first.blockedCount)
        })
        .slice(0, 100)

      return { tests }
    },
  )

export const getAutomationRunDetail = createServerFn({ method: 'POST' })
  .inputValidator(automationRunDetailInput)
  .handler(async ({ data }): Promise<{ run: AutomationRunDetail }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureAutomationServerDeps()

    if (!isDatabaseConfigured()) {
      throw new Error('Database is not configured.')
    }

    const db = getDb()
    const runRows = await db
      .select({
        id: automationRuns.id,
        name: automationRuns.name,
        status: automationRuns.status,
        environment: automationRuns.environment,
        branch: automationRuns.branch,
        commitSha: automationRuns.commitSha,
        ciBuildUrl: automationRuns.ciBuildUrl,
        triggerSource: automationRuns.triggerSource,
        rawFormat: automationRuns.rawFormat,
        rawReport: automationRuns.rawReport,
        startedAt: automationRuns.startedAt,
        finishedAt: automationRuns.finishedAt,
        durationMs: automationRuns.durationMs,
        totalCount: automationRuns.totalCount,
        passedCount: automationRuns.passedCount,
        failedCount: automationRuns.failedCount,
        skippedCount: automationRuns.skippedCount,
        blockedCount: automationRuns.blockedCount,
        unknownCount: automationRuns.unknownCount,
        createdAt: automationRuns.createdAt,
      })
      .from(automationRuns)
      .where(
        and(
          eq(automationRuns.id, data.runId),
          eq(automationRuns.projectId, data.projectId),
        ),
      )
      .limit(1)

    const run = runRows[0]

    if (!run) {
      throw new Error('Automation run was not found.')
    }

    const results = await db
      .select({
        id: automationTestResults.id,
        name: automationTestResults.name,
        suite: automationTestResults.suite,
        filePath: automationTestResults.filePath,
        status: automationTestResults.status,
        durationMs: automationTestResults.durationMs,
        manualTestId: automationTestResults.manualTestId,
        caseKey: automationTestResults.caseKey,
        errorMessage: automationTestResults.errorMessage,
        stackTrace: automationTestResults.stackTrace,
        stdout: automationTestResults.stdout,
        stderr: automationTestResults.stderr,
        retryCount: automationTestResults.retryCount,
        startedAt: automationTestResults.startedAt,
      })
      .from(automationTestResults)
      .where(eq(automationTestResults.runId, data.runId))
      .orderBy(desc(automationTestResults.status), desc(automationTestResults.id))

    const attachments = await db
      .select({
        id: automationAttachments.id,
        resultId: automationAttachments.resultId,
        name: automationAttachments.name,
        type: automationAttachments.type,
        url: automationAttachments.url,
        contentType: automationAttachments.contentType,
        sizeBytes: automationAttachments.sizeBytes,
      })
      .from(automationAttachments)
      .where(eq(automationAttachments.runId, data.runId))

    const attachmentsByResultId = new Map<number, AutomationResultAttachment[]>()

    for (const attachment of attachments) {
      if (!attachment.resultId) {
        continue
      }

      const existing = attachmentsByResultId.get(attachment.resultId) ?? []
      existing.push({
        id: attachment.id,
        name: attachment.name,
        type: attachment.type,
        url: attachment.url,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
      })
      attachmentsByResultId.set(attachment.resultId, existing)
    }

    const manualCandidates = await db
      .select({
        id: tests.id,
        title: tests.title,
        status: tests.status,
        suiteName: sections.name,
      })
      .from(tests)
      .leftJoin(sections, eq(sections.id, tests.sectionId))
      .where(eq(tests.projectId, data.projectId))

    const manualCasesById = new Map<number, AutomationManualCaseOption>()
    const manualCasesByTitle = new Map<string, AutomationManualCaseOption>()

    for (const manualCase of manualCandidates) {
      const option = {
        id: manualCase.id,
        title: manualCase.title,
        suiteName: manualCase.suiteName ?? null,
        status: manualCase.status ?? null,
      }

      manualCasesById.set(option.id, option)
      manualCasesByTitle.set(normalizeLookupText(option.title), option)
    }

    return {
      run: {
        ...run,
        results: results.map((result) => {
          const caseKeyId = result.caseKey
            ? Number(result.caseKey.replace(/\D/g, ''))
            : null
          const suggestedManualCase =
            result.manualTestId !== null
              ? null
              : caseKeyId && manualCasesById.has(caseKeyId)
                ? manualCasesById.get(caseKeyId) ?? null
                : manualCasesByTitle.get(normalizeLookupText(result.name)) ??
                  null

          return {
            ...result,
            suggestedManualCase,
            attachments: attachmentsByResultId.get(result.id) ?? [],
          }
        }),
      },
    }
  })

export const getAutomationHistoryForTestCase = createServerFn({ method: 'POST' })
  .inputValidator(
    projectAutomationInput.extend({
      testId: z.number().int().positive(),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{ history: AutomationTestCaseHistory }> => {
      const { requireSessionUser } = await import('../auth/helpers.server')
      await requireSessionUser()
      await ensureAutomationServerDeps()

      const emptyHistory: AutomationTestCaseHistory = {
        totalResults: 0,
        passedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        blockedCount: 0,
        unknownCount: 0,
        passRate: 0,
        latestStatus: null,
        latestRunId: null,
        latestRunName: null,
        latestRunAt: null,
        results: [],
      }

      if (!isDatabaseConfigured()) {
        return { history: emptyHistory }
      }

      const db = getDb()
      const [manualCase] = await db
        .select({ id: tests.id })
        .from(tests)
        .where(and(eq(tests.id, data.testId), eq(tests.projectId, data.projectId)))
        .limit(1)

      if (!manualCase) {
        return { history: emptyHistory }
      }

      const rows = await db
        .select({
          id: automationTestResults.id,
          runId: automationTestResults.runId,
          runName: automationRuns.name,
          runStatus: automationRuns.status,
          environment: automationRuns.environment,
          branch: automationRuns.branch,
          commitSha: automationRuns.commitSha,
          runCreatedAt: automationRuns.createdAt,
          name: automationTestResults.name,
          suite: automationTestResults.suite,
          status: automationTestResults.status,
          durationMs: automationTestResults.durationMs,
          errorMessage: automationTestResults.errorMessage,
          startedAt: automationTestResults.startedAt,
        })
        .from(automationTestResults)
        .leftJoin(
          automationTestCaseLinks,
          eq(automationTestCaseLinks.resultId, automationTestResults.id),
        )
        .innerJoin(automationRuns, eq(automationRuns.id, automationTestResults.runId))
        .where(
          and(
            eq(automationTestResults.projectId, data.projectId),
            or(
              eq(automationTestResults.manualTestId, data.testId),
              eq(automationTestCaseLinks.testId, data.testId),
            ),
          ),
        )
        .orderBy(desc(automationRuns.id), desc(automationTestResults.id))
        .limit(50)

      const counters = rows.reduce(
        (accumulator, row) => {
          accumulator.totalResults += 1

          if (row.status === 'passed') {
            accumulator.passedCount += 1
          } else if (row.status === 'failed') {
            accumulator.failedCount += 1
          } else if (row.status === 'skipped') {
            accumulator.skippedCount += 1
          } else if (row.status === 'blocked') {
            accumulator.blockedCount += 1
          } else {
            accumulator.unknownCount += 1
          }

          return accumulator
        },
        {
          totalResults: 0,
          passedCount: 0,
          failedCount: 0,
          skippedCount: 0,
          blockedCount: 0,
          unknownCount: 0,
        },
      )

      const latest = rows[0] ?? null
      const passRate =
        counters.totalResults === 0
          ? 0
          : Math.round((counters.passedCount / counters.totalResults) * 100)

      return {
        history: {
          ...counters,
          passRate,
          latestStatus: latest?.status ?? null,
          latestRunId: latest?.runId ?? null,
          latestRunName: latest?.runName ?? null,
          latestRunAt: latest?.startedAt ?? latest?.runCreatedAt ?? null,
          results: rows.slice(0, 10),
        },
      }
    },
  )

export const searchManualTestCasesForAutomation = createServerFn({ method: 'POST' })
  .inputValidator(automationManualCaseSearchInput)
  .handler(
    async ({
      data,
    }): Promise<{ cases: AutomationManualCaseOption[] }> => {
      const { requireSessionUser } = await import('../auth/helpers.server')
      await requireSessionUser()
      await ensureAutomationServerDeps()

      if (!isDatabaseConfigured()) {
        return { cases: [] }
      }

      const search = data.query?.trim() ?? ''
      const numericId = Number(search.replace(/^#|^TMS-/i, ''))
      const searchPattern = `%${search}%`
      const searchCondition = search
        ? Number.isInteger(numericId) && numericId > 0
          ? or(like(tests.title, searchPattern), eq(tests.id, numericId))
          : like(tests.title, searchPattern)
        : undefined

      const whereConditions = [
        eq(tests.projectId, data.projectId),
        searchCondition,
      ].filter(
        (
          condition,
        ): condition is Exclude<typeof condition, undefined> =>
          condition !== undefined,
      )

      const rows = await getDb()
        .select({
          id: tests.id,
          title: tests.title,
          status: tests.status,
          suiteName: sections.name,
        })
        .from(tests)
        .leftJoin(sections, eq(sections.id, tests.sectionId))
        .where(and(...whereConditions))
        .orderBy(desc(tests.updatedAt), desc(tests.id))
        .limit(10)

      return {
        cases: rows.map((row) => ({
          id: row.id,
          title: row.title,
          suiteName: row.suiteName ?? null,
          status: row.status ?? null,
        })),
      }
    },
  )

export const linkAutomationResultToManualCase = createServerFn({ method: 'POST' })
  .inputValidator(automationResultManualCaseLinkInput)
  .handler(
    async ({
      data,
    }): Promise<{ manualCase: AutomationManualCaseOption }> => {
      const { requireSessionUser } = await import('../auth/helpers.server')
      await requireSessionUser()
      await ensureAutomationServerDeps()

      if (!isDatabaseConfigured()) {
        throw new Error('Database is not configured.')
      }

      const db = getDb()
      const [result] = await db
        .select({
          id: automationTestResults.id,
          name: automationTestResults.name,
          suite: automationTestResults.suite,
        })
        .from(automationTestResults)
        .where(
          and(
            eq(automationTestResults.id, data.resultId),
            eq(automationTestResults.runId, data.runId),
            eq(automationTestResults.projectId, data.projectId),
          ),
        )
        .limit(1)

      if (!result) {
        throw new Error('Automation result was not found.')
      }

      const [manualCase] = await db
        .select({
          id: tests.id,
          title: tests.title,
          status: tests.status,
          suiteName: sections.name,
        })
        .from(tests)
        .leftJoin(sections, eq(sections.id, tests.sectionId))
        .where(and(eq(tests.id, data.manualTestId), eq(tests.projectId, data.projectId)))
        .limit(1)

      if (!manualCase) {
        throw new Error('Manual test case was not found in this project.')
      }

      const now = new Date().toISOString()

      await db
        .update(automationTestResults)
        .set({
          manualTestId: manualCase.id,
        })
        .where(eq(automationTestResults.id, result.id))

      await db
        .delete(automationTestCaseLinks)
        .where(eq(automationTestCaseLinks.resultId, result.id))

      await db.insert(automationTestCaseLinks).values({
        projectId: data.projectId,
        resultId: result.id,
        testId: manualCase.id,
        automationSuite: result.suite,
        automationName: result.name,
        createdAt: now,
        updatedAt: now,
      })

      return {
        manualCase: {
          id: manualCase.id,
          title: manualCase.title,
          suiteName: manualCase.suiteName ?? null,
          status: manualCase.status ?? null,
        },
      }
    },
  )

export const unlinkAutomationResultFromManualCase = createServerFn({ method: 'POST' })
  .inputValidator(automationResultLinkInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureAutomationServerDeps()

    if (!isDatabaseConfigured()) {
      throw new Error('Database is not configured.')
    }

    const db = getDb()
    const [result] = await db
      .select({ id: automationTestResults.id })
      .from(automationTestResults)
      .where(
        and(
          eq(automationTestResults.id, data.resultId),
          eq(automationTestResults.runId, data.runId),
          eq(automationTestResults.projectId, data.projectId),
        ),
      )
      .limit(1)

    if (!result) {
      throw new Error('Automation result was not found.')
    }

    await db
      .update(automationTestResults)
      .set({
        manualTestId: null,
      })
      .where(eq(automationTestResults.id, result.id))

    await db
      .delete(automationTestCaseLinks)
      .where(eq(automationTestCaseLinks.resultId, result.id))

    return { ok: true }
  })

export async function importJunitAutomationRun(
  input: z.input<typeof automationJunitImportInput>,
): Promise<AutomationImportResult> {
  const data = automationJunitImportInput.parse(input)

  await ensureAutomationServerDeps()

  if (!isDatabaseConfigured()) {
    throw new Error('Database is not configured.')
  }

  const parsedResults = parseJunitXml(data.xml)

  if (parsedResults.length === 0) {
    throw new Error('JUnit XML does not contain test cases.')
  }

  return createAutomationRunFromResults({
    projectId: data.projectId,
    externalId: data.externalId,
    name: data.name,
    environment: data.environment,
    branch: data.branch,
    commitSha: data.commitSha,
    ciBuildUrl: data.ciBuildUrl,
    triggerSource: data.triggerSource ?? 'api',
    rawFormat: 'junit',
    rawReport: data.xml,
    parsedResults,
  })
}

export async function importJsonAutomationRun(
  input: z.input<typeof automationJsonImportInput>,
): Promise<AutomationImportResult> {
  const data = automationJsonImportInput.parse(input)

  await ensureAutomationServerDeps()

  if (!isDatabaseConfigured()) {
    throw new Error('Database is not configured.')
  }

  const parsedResults = data.results.map((result): ParsedJunitResult => {
    const caseKey = normalizeCaseKey(result.caseId)

    return {
      name: truncate(result.name, 512),
      suite: result.suite ? truncate(result.suite, 255) : null,
      filePath: result.filePath ?? null,
      status: result.status,
      durationMs: result.durationMs ?? 0,
      caseKey,
      manualTestId: caseKey ? Number(caseKey.replace(/\D/g, '')) : null,
      errorMessage: result.errorMessage ? truncate(result.errorMessage, 2000) : null,
      stackTrace: result.stackTrace ?? null,
      stdout: result.stdout ?? null,
      stderr: result.stderr ?? null,
      startedAt: result.startedAt ?? null,
      attachments: normalizeAutomationAttachments(result.attachments),
    }
  })

  return createAutomationRunFromResults({
    projectId: data.projectId,
    externalId: data.externalId,
    name: data.name,
    environment: data.environment,
    branch: data.branch,
    commitSha: data.commitSha,
    ciBuildUrl: data.ciBuildUrl,
    triggerSource: data.triggerSource ?? 'api',
    rawFormat: 'json',
    rawReport: JSON.stringify(data),
    parsedResults,
  })
}

export async function assertProjectApiToken(
  projectId: number,
  authorizationHeader: string | null,
): Promise<void> {
  await ensureAutomationServerDeps()

  if (!isDatabaseConfigured()) {
    throw new Error('Database is not configured.')
  }

  const token = readBearerToken(authorizationHeader)

  if (!token) {
    throw new Response(
      JSON.stringify({ error: 'Missing Authorization: Bearer token.' }),
      {
        status: 401,
        headers: { 'content-type': 'application/json' },
      },
    )
  }

  const tokenHash = await hashProjectApiToken(token)
  const db = getDb()
  const rows = await db
    .select({ id: projectApiTokens.id })
    .from(projectApiTokens)
    .where(
      and(
        eq(projectApiTokens.projectId, projectId),
        eq(projectApiTokens.tokenHash, tokenHash),
        eq(projectApiTokens.status, 'active'),
      ),
    )
    .limit(1)

  if (!rows[0]) {
    throw new Response(JSON.stringify({ error: 'Invalid project API token.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }

  await db
    .update(projectApiTokens)
    .set({
      lastUsedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projectApiTokens.id, rows[0].id))
}

export async function hashProjectApiToken(token: string): Promise<string> {
  const crypto = await import('node:crypto')

  return crypto.createHash('sha256').update(token).digest('hex')
}

async function createProjectApiTokenValue(): Promise<string> {
  const crypto = await import('node:crypto')

  return `tms_${crypto.randomBytes(24).toString('base64url')}`
}

async function createAutomationRunFromResults({
  projectId,
  externalId,
  name,
  environment,
  branch,
  commitSha,
  ciBuildUrl,
  triggerSource,
  rawFormat,
  rawReport,
  parsedResults,
}: {
  projectId: number
  externalId?: string
  name?: string
  environment?: string
  branch?: string
  commitSha?: string
  ciBuildUrl?: string
  triggerSource: 'manual' | 'ci' | 'api'
  rawFormat: 'junit' | 'json'
  rawReport: string
  parsedResults: ParsedJunitResult[]
}): Promise<AutomationImportResult> {
  const db = getDb()
  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  const project = projectRows[0]

  if (!project) {
    throw new Error('Project was not found.')
  }

  const now = new Date().toISOString()
  const counters = calculateCounters(parsedResults)
  const runStatus = calculateRunStatus(counters)
  const runName = name ?? buildRunName(project.name, now)
  const startedAt = parsedResults.find((result) => result.startedAt)?.startedAt ?? now
  const finishedAt = now

  const existingRun = externalId
    ? (
        await db
          .select({ id: automationRuns.id })
          .from(automationRuns)
          .where(
            and(
              eq(automationRuns.projectId, projectId),
              eq(automationRuns.externalId, externalId),
            ),
          )
          .limit(1)
      )[0]
    : null

  let runId: number
  let created = false
  let replacedExisting = false

  if (existingRun) {
    runId = existingRun.id
    replacedExisting = true

    await db
      .delete(automationAttachments)
      .where(eq(automationAttachments.runId, runId))
    await db
      .delete(automationTestResults)
      .where(eq(automationTestResults.runId, runId))
    await db
      .update(automationRuns)
      .set({
        name: runName,
        status: runStatus,
        environment,
        branch,
        commitSha,
        ciBuildUrl,
        triggerSource,
        rawFormat,
        rawReport,
        totalCount: counters.totalCount,
        passedCount: counters.passedCount,
        failedCount: counters.failedCount,
        skippedCount: counters.skippedCount,
        blockedCount: counters.blockedCount,
        unknownCount: counters.unknownCount,
        durationMs: counters.durationMs,
        startedAt,
        finishedAt,
        updatedAt: now,
      })
      .where(eq(automationRuns.id, runId))
  } else {
    const insertResult = await db.insert(automationRuns).values({
      projectId,
      externalId,
      name: runName,
      status: runStatus,
      environment,
      branch,
      commitSha,
      ciBuildUrl,
      triggerSource,
      rawFormat,
      rawReport,
      totalCount: counters.totalCount,
      passedCount: counters.passedCount,
      failedCount: counters.failedCount,
      skippedCount: counters.skippedCount,
      blockedCount: counters.blockedCount,
      unknownCount: counters.unknownCount,
      durationMs: counters.durationMs,
      startedAt,
      finishedAt,
      createdAt: now,
      updatedAt: now,
    })
    runId = insertResult[0].insertId
    created = true
  }

  const linkableManualIds = parsedResults
    .map((result) => result.manualTestId)
    .filter((id): id is number => typeof id === 'number')
  const existingManualIds = new Set<number>()

  if (linkableManualIds.length > 0) {
    const manualRows = await db
      .select({ id: tests.id })
      .from(tests)
      .where(eq(tests.projectId, projectId))

    for (const row of manualRows) {
      if (linkableManualIds.includes(row.id)) {
        existingManualIds.add(row.id)
      }
    }
  }

  let linkedManualCases = 0

  for (const result of parsedResults) {
    const manualTestId =
      result.manualTestId && existingManualIds.has(result.manualTestId)
        ? result.manualTestId
        : null
    const insertResult = await db.insert(automationTestResults).values({
      runId,
      projectId,
      externalId: buildResultExternalId(result),
      name: truncate(result.name, 512),
      suite: result.suite ? truncate(result.suite, 255) : null,
      filePath: result.filePath,
      status: result.status,
      durationMs: result.durationMs,
      manualTestId,
      caseKey: result.caseKey,
      errorMessage: result.errorMessage,
      stackTrace: result.stackTrace,
      stdout: result.stdout,
      stderr: result.stderr,
      retryCount: 0,
      startedAt: result.startedAt,
      createdAt: now,
    })
    const resultId = insertResult[0].insertId

    if (result.attachments.length > 0) {
      await db.insert(automationAttachments).values(
        result.attachments.map((attachment) => ({
          projectId,
          runId,
          resultId,
          name: truncate(attachment.name, 255),
          type: attachment.type ? truncate(attachment.type, 64) : null,
          url: attachment.url,
          contentType: attachment.contentType
            ? truncate(attachment.contentType, 128)
            : null,
          sizeBytes: attachment.sizeBytes,
          createdAt: now,
        })),
      )
    }

    if (manualTestId) {
      linkedManualCases += 1
      await db.insert(automationTestCaseLinks).values({
        projectId,
        resultId,
        testId: manualTestId,
        automationSuite: result.suite ? truncate(result.suite, 255) : null,
        automationName: truncate(result.name, 512),
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  return {
    runId,
    created,
    replacedExisting,
    ...counters,
    linkedManualCases,
  }
}

export function parseJunitXml(xml: string): ParsedJunitResult[] {
  const suiteBlocks = getXmlBlocks(xml, 'testsuite')
  const containers =
    suiteBlocks.length > 0
      ? suiteBlocks
      : [{ attributes: '', content: xml }]
  const results: ParsedJunitResult[] = []

  for (const suiteBlock of containers) {
    const suiteName = getXmlAttribute(suiteBlock.attributes, 'name')
    const suiteTimestamp = getXmlAttribute(suiteBlock.attributes, 'timestamp')
    const testcaseBlocks = [
      ...getXmlBlocks(suiteBlock.content, 'testcase'),
      ...getSelfClosingXmlBlocks(suiteBlock.content, 'testcase'),
    ]

    for (const testcase of testcaseBlocks) {
      const name = decodeXml(getXmlAttribute(testcase.attributes, 'name') ?? '')
      const classname = decodeXml(
        getXmlAttribute(testcase.attributes, 'classname') ?? '',
      )
      const filePath = decodeXml(getXmlAttribute(testcase.attributes, 'file') ?? '')
      const durationSeconds = Number(
        getXmlAttribute(testcase.attributes, 'time') ?? '0',
      )
      const status = getTestcaseStatus(testcase.content)
      const failure = getFirstXmlChild(testcase.content, ['failure', 'error'])
      const errorText = failure ? normalizeText(stripXml(failure.content)) : null
      const errorMessage = failure
        ? decodeXml(getXmlAttribute(failure.attributes, 'message') ?? '') ||
          errorText?.split('\n')[0] ||
          null
        : null
      const stdout = getChildText(testcase.content, 'system-out')
      const stderr = getChildText(testcase.content, 'system-err')
      const caseKey = detectCaseKey(`${classname} ${name} ${testcase.content}`)
      const attachments = extractJunitAttachments(testcase.content, stdout, stderr)

      results.push({
        name: truncate(name || 'Unnamed automated test', 512),
        suite: truncate(classname || suiteName || filePath || 'Unknown suite', 255),
        filePath: filePath || null,
        status,
        durationMs: Number.isFinite(durationSeconds)
          ? Math.round(durationSeconds * 1000)
          : 0,
        caseKey,
        manualTestId: caseKey ? Number(caseKey.replace(/\D/g, '')) : null,
        errorMessage: errorMessage ? truncate(errorMessage, 2000) : null,
        stackTrace: errorText,
        stdout,
        stderr,
        startedAt: suiteTimestamp || null,
        attachments,
      })
    }
  }

  return results
}

function calculateCounters(results: ParsedJunitResult[]) {
  const counters = {
    totalCount: results.length,
    passedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    blockedCount: 0,
    unknownCount: 0,
    durationMs: 0,
  }

  for (const result of results) {
    counters.durationMs += result.durationMs

    if (result.status === 'passed') {
      counters.passedCount += 1
    } else if (result.status === 'failed') {
      counters.failedCount += 1
    } else if (result.status === 'skipped') {
      counters.skippedCount += 1
    } else if (result.status === 'blocked') {
      counters.blockedCount += 1
    } else {
      counters.unknownCount += 1
    }
  }

  return counters
}

function calculateRunStatus(
  counters: ReturnType<typeof calculateCounters>,
): AutomationRunStatus {
  if (counters.failedCount > 0) {
    return 'failed'
  }

  if (counters.blockedCount > 0) {
    return 'blocked'
  }

  if (counters.passedCount > 0) {
    return 'passed'
  }

  if (counters.skippedCount > 0) {
    return 'skipped'
  }

  return 'unknown'
}

function getTestcaseStatus(content: string): AutomationResultStatus {
  if (/<skipped\b/i.test(content)) {
    return 'skipped'
  }

  if (/<failure\b/i.test(content) || /<error\b/i.test(content)) {
    return 'failed'
  }

  return 'passed'
}

function getXmlBlocks(
  xml: string,
  tagName: string,
): Array<{ attributes: string; content: string }> {
  const blocks: Array<{ attributes: string; content: string }> = []
  const pattern = new RegExp(
    `<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`,
    'gi',
  )
  let match: RegExpExecArray | null

  while ((match = pattern.exec(xml)) !== null) {
    blocks.push({
      attributes: match[1] ?? '',
      content: match[2] ?? '',
    })
  }

  return blocks
}

function getSelfClosingXmlBlocks(
  xml: string,
  tagName: string,
): Array<{ attributes: string; content: string }> {
  const blocks: Array<{ attributes: string; content: string }> = []
  const pattern = new RegExp(`<${tagName}\\b([^>]*)\\/>`, 'gi')
  let match: RegExpExecArray | null

  while ((match = pattern.exec(xml)) !== null) {
    blocks.push({
      attributes: match[1] ?? '',
      content: '',
    })
  }

  return blocks
}

function getFirstXmlChild(
  xml: string,
  tagNames: string[],
): { attributes: string; content: string } | null {
  for (const tagName of tagNames) {
    const child = getXmlBlocks(xml, tagName)[0]

    if (child) {
      return child
    }
  }

  return null
}

function getChildText(xml: string, tagName: string): string | null {
  const child = getXmlBlocks(xml, tagName)[0]

  if (!child) {
    return null
  }

  return normalizeText(stripXml(child.content))
}

function extractJunitAttachments(
  testcaseContent: string,
  stdout: string | null,
  stderr: string | null,
): AutomationResultAttachment[] {
  const attachments = [
    ...extractJunitPropertyAttachments(testcaseContent),
    ...extractJunitAttachmentMarkers(stdout),
    ...extractJunitAttachmentMarkers(stderr),
  ]
  const seen = new Set<string>()

  return attachments.filter((attachment) => {
    const key = `${attachment.type ?? ''}:${attachment.url}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function extractJunitPropertyAttachments(
  testcaseContent: string,
): AutomationResultAttachment[] {
  const propertyBlocks = [
    ...getXmlBlocks(testcaseContent, 'property'),
    ...getSelfClosingXmlBlocks(testcaseContent, 'property'),
  ]
  const attachments: AutomationResultAttachment[] = []

  for (const property of propertyBlocks) {
    const propertyName = decodeXml(getXmlAttribute(property.attributes, 'name') ?? '')
    const value = decodeXml(getXmlAttribute(property.attributes, 'value') ?? '').trim()

    if (!value || !isAttachmentPropertyName(propertyName)) {
      continue
    }

    attachments.push(normalizeAutomationAttachment({
      name: buildAttachmentName(propertyName, value),
      type: inferAttachmentType(propertyName, value),
      url: value,
    }))
  }

  return attachments
}

function extractJunitAttachmentMarkers(
  value: string | null,
): AutomationResultAttachment[] {
  if (!value) {
    return []
  }

  const attachments: AutomationResultAttachment[] = []
  const markerPattern = /\[\[ATTACHMENT\|([^\]]+)\]\]/gi
  let match: RegExpExecArray | null

  while ((match = markerPattern.exec(value)) !== null) {
    const url = match[1]?.trim()

    if (!url) {
      continue
    }

    attachments.push(normalizeAutomationAttachment({
      name: buildAttachmentName('attachment', url),
      type: inferAttachmentType('attachment', url),
      url,
    }))
  }

  return attachments
}

function normalizeAutomationAttachments(
  attachments: Array<{
    name?: string
    type?: string
    url: string
    contentType?: string
    sizeBytes?: number
  }> | undefined,
): AutomationResultAttachment[] {
  if (!attachments) {
    return []
  }

  const normalized: AutomationResultAttachment[] = []
  const seen = new Set<string>()

  for (const attachment of attachments) {
    const next = normalizeAutomationAttachment(attachment)

    if (!next.url || seen.has(next.url)) {
      continue
    }

    seen.add(next.url)
    normalized.push(next)
  }

  return normalized.slice(0, 50)
}

function normalizeAutomationAttachment(attachment: {
  name?: string
  type?: string | null
  url: string
  contentType?: string | null
  sizeBytes?: number | null
}): AutomationResultAttachment {
  const url = attachment.url.trim()
  const type = attachment.type
    ? truncate(attachment.type.trim().toLowerCase(), 64)
    : inferAttachmentType('', url)

  return {
    name: truncate(attachment.name?.trim() || buildAttachmentName(type, url), 255),
    type,
    url,
    contentType: attachment.contentType?.trim() || null,
    sizeBytes:
      typeof attachment.sizeBytes === 'number' && Number.isFinite(attachment.sizeBytes)
        ? attachment.sizeBytes
        : null,
  }
}

function isAttachmentPropertyName(name: string): boolean {
  return /attachment|artifact|screenshot|screen|video|trace|log|report|file/i.test(
    name,
  )
}

function inferAttachmentType(name: string, url: string): string {
  const text = `${name} ${url}`.toLowerCase()

  if (/screenshot|\.png|\.jpg|\.jpeg|\.webp|\.gif/.test(text)) {
    return 'screenshot'
  }

  if (/video|\.mp4|\.webm|\.mov/.test(text)) {
    return 'video'
  }

  if (/trace|\.zip/.test(text)) {
    return 'trace'
  }

  if (/log|stdout|stderr|\.log|\.txt/.test(text)) {
    return 'log'
  }

  if (/report|\.html|\.xml|\.json/.test(text)) {
    return 'report'
  }

  return 'artifact'
}

function buildAttachmentName(name: string | null | undefined, url: string): string {
  const cleanName = name?.trim()

  if (cleanName && cleanName !== 'attachment') {
    return cleanName
  }

  const normalizedUrl = url.replace(/\\/g, '/')
  const filename = normalizedUrl.split('/').filter(Boolean).at(-1)

  return filename || 'Attachment'
}

function getXmlAttribute(attributes: string, name: string): string | null {
  const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i')
  const match = attributes.match(pattern)

  return match?.[1] ?? match?.[2] ?? null
}

function detectCaseKey(text: string): string | null {
  const match = text.match(/\bTMS-(\d+)\b/i)

  if (!match) {
    return null
  }

  return `TMS-${match[1]}`
}

function normalizeCaseKey(caseId: string | number | undefined): string | null {
  if (typeof caseId === 'number' && Number.isInteger(caseId) && caseId > 0) {
    return `TMS-${caseId}`
  }

  if (typeof caseId !== 'string') {
    return null
  }

  const tmsMatch = caseId.match(/\bTMS-(\d+)\b/i)

  if (tmsMatch) {
    return `TMS-${tmsMatch[1]}`
  }

  const numericMatch = caseId.match(/\b(\d+)\b/)

  return numericMatch ? `TMS-${numericMatch[1]}` : null
}

function normalizeLookupText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function readBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()

  return token || null
}

function stripXml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ')
}

function normalizeText(value: string): string {
  return decodeXml(value)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function buildRunName(projectName: string, now: string): string {
  return `${projectName} automation ${now.slice(0, 16).replace('T', ' ')}`
}

function buildResultExternalId(result: ParsedJunitResult): string {
  return truncate(`${result.suite ?? 'suite'}::${result.name}`, 255)
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value
}
