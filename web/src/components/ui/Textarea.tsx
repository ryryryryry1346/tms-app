import { cva, type VariantProps } from 'class-variance-authority'
import type { TextareaHTMLAttributes } from 'react'
import { cx } from './utils'

const textareaVariants = cva('tms-textarea', {
  variants: {
    size: {
      sm: 'min-h-10 px-3 py-2 text-sm',
      md: '',
      lg: 'px-4 py-3 text-base',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof textareaVariants>

export function Textarea({ className, size, ...props }: TextareaProps) {
  return (
    <textarea
      className={cx(textareaVariants({ size }), className)}
      {...props}
    />
  )
}

export { textareaVariants }
