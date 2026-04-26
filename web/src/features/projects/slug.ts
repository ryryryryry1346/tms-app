import { and, asc, eq, ne } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { projects } from '../../db/schema'

function normalizeSlugPart(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function buildProjectSlug(name: string): string {
  const normalized = normalizeSlugPart(name)
  return normalized.length > 0 ? normalized : 'project'
}

export async function ensureUniqueProjectSlug(
  name: string,
  excludeProjectId?: number,
): Promise<string> {
  const db = getDb()
  const baseSlug = buildProjectSlug(name)
  let candidate = baseSlug
  let suffix = 2

  while (true) {
    const rows = await db
      .select({
        id: projects.id,
      })
      .from(projects)
      .where(
        excludeProjectId
          ? and(eq(projects.slug, candidate), ne(projects.id, excludeProjectId))
          : eq(projects.slug, candidate),
      )
      .limit(1)

    if (rows.length === 0) {
      return candidate
    }

    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }
}

export async function ensureProjectSlugs(): Promise<void> {
  const db = getDb()
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
    })
    .from(projects)
    .orderBy(asc(projects.id))

  for (const project of rows) {
    if (project.slug && project.slug.trim().length > 0) {
      continue
    }

    const slug = await ensureUniqueProjectSlug(project.name, project.id)
    await db
      .update(projects)
      .set({
        slug,
      })
      .where(eq(projects.id, project.id))
  }
}
