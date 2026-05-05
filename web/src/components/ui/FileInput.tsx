import { forwardRef, type InputHTMLAttributes } from 'react'
import { cx } from './utils'

export type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  function FileInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="file"
        className={cx('tms-file-input', className)}
        {...props}
      />
    )
  },
)
