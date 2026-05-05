import type { ButtonHTMLAttributes } from 'react'
import { cx } from './utils'

type ButtonVariant = 'default' | 'primary' | 'danger' | 'success' | 'warning'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

function getVariantClass(variant: ButtonVariant): string {
  if (variant === 'primary') {
    return 'tms-button-primary'
  }

  if (variant === 'danger') {
    return 'tms-button-danger'
  }

  if (variant === 'success') {
    return 'border-[var(--tms-success)] bg-[var(--tms-success-soft)] text-[var(--tms-success)]'
  }

  if (variant === 'warning') {
    return 'border-[var(--tms-warning)] bg-[var(--tms-warning-soft)] text-[var(--tms-warning)]'
  }

  return ''
}

function getSizeClass(size: ButtonSize): string {
  if (size === 'sm') {
    return 'min-h-0 px-2.5 py-1 text-xs'
  }

  if (size === 'lg') {
    return 'px-6 py-3 text-base'
  }

  return ''
}

export function Button({
  variant = 'default',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'tms-button disabled:cursor-not-allowed disabled:opacity-55',
        getVariantClass(variant),
        getSizeClass(size),
        className,
      )}
      {...props}
    />
  )
}
