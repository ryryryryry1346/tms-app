import { cva, type VariantProps } from 'class-variance-authority'
import type { SelectHTMLAttributes } from 'react'
import { cx } from './utils'

const selectVariants = cva('tms-select', {
  variants: {
    size: {
      sm: 'min-h-0 px-2 py-1 text-sm',
      md: '',
      lg: 'px-4 py-3 text-base',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  VariantProps<typeof selectVariants>

export function Select({ className, size, ...props }: SelectProps) {
  return (
    <select className={cx(selectVariants({ size }), className)} {...props} />
  )
}

export { selectVariants }
