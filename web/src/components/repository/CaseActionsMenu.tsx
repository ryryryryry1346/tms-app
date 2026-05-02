import { Link } from '@tanstack/react-router'

type CaseActionsMenuProps = {
  testId: number
  isOpen: boolean
  isArchived: boolean
  isPending: boolean
  onToggle: () => void
  onPreview: () => void
  onDuplicate: () => void
  onRestore: () => void
  onDeletePermanently: () => void
  onArchive: () => void
}

function itemClass(tone: 'default' | 'success' | 'danger' | 'warning' = 'default'): string {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-700 hover:bg-emerald-50'
      : tone === 'danger'
        ? 'text-rose-700 hover:bg-rose-50'
        : tone === 'warning'
          ? 'text-amber-800 hover:bg-amber-50'
          : 'text-[#60718f] hover:bg-[#f5f8ff]'

  return `block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55 ${toneClass}`
}

export function CaseActionsMenu({
  testId,
  isOpen,
  isArchived,
  isPending,
  onToggle,
  onPreview,
  onDuplicate,
  onRestore,
  onDeletePermanently,
  onArchive,
}: CaseActionsMenuProps) {
  return (
    <div className="relative flex justify-end" onPointerDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
        className="rounded-lg border border-[#dbe4f4] bg-white px-2.5 py-1 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
        aria-label="Open test case actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        ...
      </button>
      {isOpen ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 min-w-[170px] rounded-2xl border border-[#dbe4f4] bg-white p-2 text-left shadow-[0_12px_30px_rgba(31,57,102,0.12)]"
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
