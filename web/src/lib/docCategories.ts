/**
 * Doc categories are per-project and user-editable. This module holds the
 * client-safe pieces: the palette, the icon keys, and the seed plan used the
 * first time a project's categories are read.
 */

/** The category every doc falls back to; it cannot be renamed or deleted. */
export const GENERAL_DOC_CATEGORY = 'General'

export const DOC_CATEGORY_COLORS = [
  '#3b6fe0',
  '#d9731a',
  '#b8860b',
  '#1a9d57',
  '#8250df',
  '#0f8fa8',
  '#62626b',
  '#d6336c',
] as const

export const DOC_CATEGORY_ICONS = [
  'code',
  'book',
  'cloud',
  'db',
  'flag',
  'help',
  'doc',
  'shield',
] as const

export type DocCategoryColor = (typeof DOC_CATEGORY_COLORS)[number]
export type DocCategoryIcon = (typeof DOC_CATEGORY_ICONS)[number]

export type DocCategorySeed = {
  name: string
  color: DocCategoryColor
  icon: DocCategoryIcon
}

// The categories the app shipped with before they became editable.
const DEFAULT_CATEGORIES: DocCategorySeed[] = [
  { name: 'Runbook', color: '#d9731a', icon: 'book' },
  { name: 'API', color: '#3b6fe0', icon: 'code' },
  { name: 'Support', color: '#0f8fa8', icon: 'help' },
  { name: 'Test data', color: '#1a9d57', icon: 'db' },
  { name: 'AWS', color: '#b8860b', icon: 'cloud' },
  { name: 'Release', color: '#8250df', icon: 'flag' },
]

/**
 * Categories to create for a project that has none yet: the shipped defaults,
 * then any other category name already used by its docs (so existing docs keep
 * a real category), and finally General, which always exists and sorts last.
 */
export function planCategorySeed(
  usedNames: Array<string | null | undefined>,
): DocCategorySeed[] {
  const plan: DocCategorySeed[] = [...DEFAULT_CATEGORIES]
  const known = new Set(
    [...DEFAULT_CATEGORIES.map((category) => category.name), GENERAL_DOC_CATEGORY].map(
      (name) => name.toLowerCase(),
    ),
  )

  for (const raw of usedNames) {
    const name = raw?.trim()

    if (!name || known.has(name.toLowerCase())) {
      continue
    }

    known.add(name.toLowerCase())
    plan.push({
      name,
      color: DOC_CATEGORY_COLORS[plan.length % DOC_CATEGORY_COLORS.length],
      icon: 'doc',
    })
  }

  plan.push({ name: GENERAL_DOC_CATEGORY, color: '#62626b', icon: 'doc' })

  return plan
}
