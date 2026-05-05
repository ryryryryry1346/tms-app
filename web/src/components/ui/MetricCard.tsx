import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes, ReactNode } from 'react'
import { Card } from './Card'
import { cx } from './utils'

const metricValueVariants = cva('mt-3 text-4xl font-semibold', {
  variants: {
    tone: {
      default: 'text-[var(--tms-text)]',
      primary: 'text-[var(--tms-primary)]',
      success: 'text-[var(--tms-success)]',
      warning: 'text-[var(--tms-warning)]',
      danger: 'text-[var(--tms-danger)]',
      muted: 'text-[var(--tms-text-muted)]',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
})

export type MetricCardProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof metricValueVariants> & {
    label: ReactNode
    value: ReactNode
    helper?: ReactNode
  }

export function MetricCard({
  label,
  value,
  helper,
  tone,
  className,
  ...props
}: MetricCardProps) {
  return (
    <Card className={cx('px-6 py-5', className)} {...props}>
      <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-soft)]">
        {label}
      </div>
      <div className={metricValueVariants({ tone })}>
        {value}
      </div>
      {helper ? (
        <div className="mt-2 text-sm text-[var(--tms-text-muted)]">
          {helper}
        </div>
      ) : null}
    </Card>
  )
}

export { metricValueVariants }
