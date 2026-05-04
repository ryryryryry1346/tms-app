import { Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

type CaseActionsMenuProps = {
  testId: number
  isOpen: boolean
  isArchived: boolean
  isPending: boolean
  onToggle: () => void
  onClose: () => void
  onPreview: () => void
  onDuplicate: () => void
  onRestore: () => void
  onDeletePermanently: () => void
  onArchive: () => void
}

function itemClass(tone: 'default' | 'success' | 'danger' | 'warning' = 'default'): string {
  const toneClass =
    tone === 'success'
      ? 'text-[var(--tms-success)] hover:bg-[var(--tms-success-soft)]'
      : tone === 'danger'
        ? 'tms-menu-item-danger'
        : tone === 'warning'
          ? 'text-[var(--tms-warning)] hover:bg-[var(--tms-warning-soft)]'
          : ''

  return `tms-menu-item disabled:cursor-not-allowed disabled:opacity-55 ${toneClass}`
}

export function CaseActionsMenu({
  testId,
  isOpen,
  isArchived,
  isPending,
  onToggle,
  onClose,
  onPreview,
  onDuplicate,
  onRestore,
  onDeletePermanently,
  onArchive,
}: CaseActionsMenuProps) {
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
    <div
      ref={menuRef}
      className="relative flex justify-end"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
        className="tms-button min-h-0 px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-55"
        aria-label="Open test case actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        ...
      </button>
      {isOpen ? (
        <div
          className="tms-popover absolute right-0 top-full mt-2 min-w-[170px] text-left"
          onClick={(event) => event.stopPropagation()}
        >
          <Link
            to="/test/$testId"
            params={{ testId: testId.toString() }}
            className={itemClass()}
          >
            Open
          </Link>
          <button type="button" onClick={onPreview} className={itemClass()}>
            Preview
          </button>
          <Link
            to="/edit-test/$testId"
            params={{ testId: testId.toString() }}
            className={itemClass()}
          >
            Edit
          </Link>
          <button
            type="button"
            disabled={isPending}
            onClick={onDuplicate}
            className={itemClass()}
          >
            Duplicate
          </button>
          {isArchived ? (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={onRestore}
                className={itemClass('success')}
              >
                Restore
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={onDeletePermanently}
                className={itemClass('danger')}
              >
                Delete permanently
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={onArchive}
              className={itemClass('warning')}
            >
              Archive
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
