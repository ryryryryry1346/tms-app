import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './utils'

const emptyStateVariants = cva(
  'rounded-[var(--tms-radius-overlay)] border border-dashed border-[var(--tms-border)] bg-[var(--tms-surface-muted)] p-6 text-sm text-[var(--tms-text-muted)]',
  {
    variants: {
      align: {
        left: 'text-left',
        center: 'text-center',
      },
    },
    defaultVariants: {
      align: 'left',
    },
  },
)

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof emptyStateVariants> & {
    title?: ReactNode
    description?: ReactNode
    action?: ReactNode
  }

export function EmptyState({
  align,
  title,
  description,
  action,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cx(emptyStateVariants({ align }), className)} {...props}>
      {title ? (
        <div className="text-sm font-semibold text-[var(--tms-text)]">
          {title}
        </div>
      ) : null}
      {description ? (
        <div className={title ? 'mt-1' : ''}>
          {description}
        </div>
      ) : null}
      {children}
      {action ? (
        <div className="mt-4">
          {action}
        </div>
      ) : null}
    </div>
  )
}

export { emptyStateVariants }
