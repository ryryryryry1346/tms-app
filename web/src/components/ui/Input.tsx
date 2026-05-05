import type { InputHTMLAttributes } from 'react'
import { cx } from './utils'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return <input className={cx('tms-input', className)} {...props} />
}
