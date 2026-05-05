import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './utils'

const alertVariants = cva(
  'rounded-[var(--tms-radius-overlay)] border text-sm',
  {
    variants: {
      variant: {
        default:
          'border-[var(--tms-border)] bg-[var(--tms-surface-muted)] text-[var(--tms-text-muted)]',
        info:
          'border-[var(--tms-primary-border)] bg-[var(--tms-primary-soft)] text-[var(--tms-primary)]',
        success:
          'border-[var(--tms-success-border)] bg-[var(--tms-success-soft)] text-[var(--tms-success)]',
        warning:
          'border-[var(--tms-warning-border)] bg-[var(--tms-warning-soft)] text-[var(--tms-warning)]',
        danger:
          'border-[var(--tms-danger-border)] bg-[var(--tms-danger-soft)] text-[var(--tms-danger)]',
      },
      density: {
        regular: 'px-4 py-3',
        compact: 'px-3 py-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      density: 'regular',
    },
  },
)

export type AlertProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    title?: ReactNode
    action?: ReactNode
    children: ReactNode
  }

export function Alert({
  variant,
  density,
  title,
  action,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div className={cx(alertVariants({ variant, density }), className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {title ? (
            <div className="font-semibold">
              {title}
            </div>
          ) : null}
          <div className={title ? 'mt-1' : ''}>
            {children}
          </div>
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export { alertVariants }
