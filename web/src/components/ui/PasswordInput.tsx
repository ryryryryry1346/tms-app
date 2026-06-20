import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input, type InputProps } from './Input'

export function PasswordInput({ style, ...props }: Omit<InputProps, 'type'>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        style={{ ...style, paddingRight: '2.75rem', width: '100%' }}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex items-center pr-4 text-[var(--tms-text-muted)] transition-colors hover:text-[var(--tms-text)]"
      >
        {visible ? (
          <EyeOff size={18} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Eye size={18} strokeWidth={2} aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
