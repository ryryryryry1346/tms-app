import {
  BookOpen,
  Cloud,
  CircleHelp,
  Code,
  Database,
  FileText,
  Flag,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  code: Code,
  book: BookOpen,
  cloud: Cloud,
  db: Database,
  flag: Flag,
  help: CircleHelp,
  doc: FileText,
  shield: ShieldCheck,
}

const FALLBACK_COLOR = '#62626b'

export function getCategoryIcon(icon: string | null | undefined): LucideIcon {
  return (icon && CATEGORY_ICONS[icon]) || FileText
}

type CategoryChipProps = {
  name: string
  color?: string | null
  icon?: string | null
}

/** Small coloured label for a doc category (colour comes from the project's category). */
export function CategoryChip({ name, color, icon }: CategoryChipProps) {
  const Icon = getCategoryIcon(icon)

  return (
    <span
      className="doc-cat-chip"
      style={{ '--cat-color': color || FALLBACK_COLOR } as CSSProperties}
    >
      <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
      {name}
    </span>
  )
}
