import { cva, type VariantProps } from 'class-variance-authority'
import type { InputHTMLAttributes } from 'react'
import { cx } from './utils'

const inputVariants = cva('tms-input', {
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

export type InputProps = InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof inputVariants>

export function Input({ className, size, ...props }: InputProps) {
  return <input className={cx(inputVariants({ size }), className)} {...props} />
}

export { inputVariants }
