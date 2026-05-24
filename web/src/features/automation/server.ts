import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

let and: typeof import('drizzle-orm')['and']
let eq: typeof import('drizzle-orm')['eq']
let getDb: typeof import('../../db/client')['getDb']
let isDatabaseConfigured: typeof import('../../db/client')['isDatabaseConfigured']
let automationRuns: typeof import('../../db/schema')['automationRuns']
let automationTestResults: typeof import('../../db/schema')['automationTestResults']
let automationTestCaseLinks: typeof import('../../db/schema')['automationTestCaseLinks']
let projects: typeof import('../../db/schema')['projects']
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
  eq = drizzle.eq
  getDb = dbClient.getDb
  isDatabaseConfigured = dbClient.isDatabaseConfigured
  automationRuns = schema.automationRuns
  automationTestResults = schema.automationTestResults
  automationTestCaseLinks = schema.automationTestCaseLinks
  projects = schema.projects
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

export const importAutomationJunitXml = createServerFn({ method: 'POST' })
  .inputValidator(automationJunitImportInput)
  .handler(async ({ data }): Promise<AutomationImportResult> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureAutomationServerDeps()

    return importJunitAutomationRun(data)
  })

export async function importJunitAutomationRun(
  input: z.infer<typeof automationJunitImportInput>,
): Promise<AutomationImportResult> {
  await ensureAutomationServerDeps()

  if (!isDatabaseConfigured()) {
    throw new Error('Database is not configured.')
  }

  const db = getDb()
  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1)
  const project = projectRows[0]

  if (!project) {
    throw new Error('Project was not found.')
  }

  const parsedResults = parseJunitXml(input.xml)

  if (parsedResults.length === 0) {
    throw new Error('JUnit XML does not contain test cases.')
  }

  const now = new Date().toISOString()
  const counters = calculateCounters(parsedResults)
  const runStatus = calculateRunStatus(counters)
  const runName = input.name ?? buildRunName(project.name, now)
  const startedAt = parsedResults.find((result) => result.startedAt)?.startedAt ?? now
  const finishedAt = now

  const existingRun = input.externalId
    ? (
        await db
          .select({ id: automationRuns.id })
          .from(automationRuns)
          .where(
            and(
              eq(automationRuns.projectId, input.projectId),
              eq(automationRuns.externalId, input.externalId),
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
      .delete(automationTestResults)
      .where(eq(automationTestResults.runId, runId))
    await db
      .update(automationRuns)
      .set({
        name: runName,
        status: runStatus,
        environment: input.environment,
        branch: input.branch,
        commitSha: input.commitSha,
        ciBuildUrl: input.ciBuildUrl,
        triggerSource: input.triggerSource ?? 'api',
        rawFormat: 'junit',
        rawReport: input.xml,
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
      projectId: input.projectId,
      externalId: input.externalId,
      name: runName,
      status: runStatus,
      environment: input.environment,
      branch: input.branch,
      commitSha: input.commitSha,
      ciBuildUrl: input.ciBuildUrl,
      triggerSource: input.triggerSource ?? 'api',
      rawFormat: 'junit',
      rawReport: input.xml,
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
      .where(eq(tests.projectId, input.projectId))

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
      projectId: input.projectId,
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

    if (manualTestId) {
      linkedManualCases += 1
      await db.insert(automationTestCaseLinks).values({
        projectId: input.projectId,
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
