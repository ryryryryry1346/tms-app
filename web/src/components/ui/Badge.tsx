import type { HTMLAttributes } from 'react'
import { cx } from './utils'

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'draft'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

function getVariantClass(variant: BadgeVariant): string {
  if (variant === 'primary') {
    return 'tms-chip-primary'
  }

  if (variant === 'success') {
    return 'tms-chip-success'
  }

  if (variant === 'warning') {
    return 'tms-chip-warning'
  }

  if (variant === 'danger') {
    return 'tms-chip-danger'
  }

  if (variant === 'draft') {
    return 'tms-chip-draft'
  }

  return ''
}

export function Badge({
  variant = 'default',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cx('tms-chip', getVariantClass(variant), className)}
      {...props}
    />
  )
}
