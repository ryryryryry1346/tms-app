import {
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { cx } from './utils'

type PopoverMenuAlign = 'left' | 'right'

type PopoverMenuProps = {
  isOpen: boolean
  onClose: () => void
  trigger: ReactNode
  children: ReactNode
  align?: PopoverMenuAlign
  className?: string
}

type PopoverMenuItemProps = HTMLAttributes<HTMLButtonElement> & {
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

function getItemToneClass(tone: NonNullable<PopoverMenuItemProps['tone']>): string {
  if (tone === 'success') {
    return 'text-[var(--tms-success)] hover:bg-[var(--tms-success-soft)]'
  }

  if (tone === 'warning') {
    return 'text-[var(--tms-warning)] hover:bg-[var(--tms-warning-soft)]'
  }

  if (tone === 'danger') {
    return 'tms-menu-item-danger'
  }

  return ''
}

export function PopoverMenu({
  isOpen,
  onClose,
  trigger,
  children,
  align = 'right',
  className,
}: PopoverMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent): void {
      const target = event.target

      if (target instanceof Node && menuRef.current?.contains(target)) {
        return
      }

      onClose()
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <div ref={menuRef} className="relative" onPointerDown={(event) => event.stopPropagation()}>
      {trigger}
      {isOpen ? (
        <div
          role="menu"
          className={cx(
            'tms-popover absolute top-full mt-2',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function PopoverMenuItem({
  tone = 'default',
  className,
  type = 'button',
  ...props
}: PopoverMenuItemProps) {
  return (
    <button
      type={type}
      role="menuitem"
      className={cx(
        'tms-menu-item disabled:cursor-not-allowed disabled:opacity-55',
        getItemToneClass(tone),
        className,
      )}
      {...props}
    />
  )
}
