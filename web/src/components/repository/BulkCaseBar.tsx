import { useEffect, useRef, useState } from 'react'

export type RepositoryBulkStatus = 'Draft' | 'Ready' | 'Archived'
export type RepositoryBulkPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type RepositoryBulkCaseType =
  | 'Functional'
  | 'Regression'
  | 'Smoke'
  | 'E2E'
  | 'UI'
  | 'API'

type RepositorySuiteOption = {
  id: number
  name: string
}

type BulkCaseBarProps = {
  selectedCount: number
  suites: RepositorySuiteOption[]
  priorities: RepositoryBulkPriority[]
  caseTypes: RepositoryBulkCaseType[]
  isApplying: boolean
  isArchivedView: boolean
  selectedArchivableCount: number
  selectedArchivedCount: number
  isArchiveConfirming: boolean
  isDeleteConfirming: boolean
  errorMessage: string | null
  onMoveToSuite: (suiteId: string) => void
  onStatusChange: (status: RepositoryBulkStatus) => void
  onPriorityChange: (priority: RepositoryBulkPriority) => void
  onCaseTypeChange: (caseType: RepositoryBulkCaseType) => void
  onRestoreArchived: () => void
  onRequestArchive: () => void
  onCancelArchive: () => void
  onConfirmArchive: () => void
  onRequestDeleteArchived: () => void
  onCancelDeleteArchived: () => void
  onConfirmDeleteArchived: () => void
  onClearSelection: () => void
}

type OpenMenu = 'move' | 'status' | 'more' | null

function menuButtonClass(isActive: boolean): string {
  return `rounded-xl border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55 ${
    isActive
      ? 'border-[#9dbaf7] bg-[#ecf2ff] text-[#2f6fe4]'
      : 'border-[#dbe4f4] bg-white text-[#1b2f5b]'
  }`
}

function menuItemClass(tone: 'default' | 'success' | 'danger' | 'warning' = 'default'): string {
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

export function BulkCaseBar({
  selectedCount,
  suites,
  priorities,
  caseTypes,
  isApplying,
  isArchivedView,
  selectedArchivableCount,
  selectedArchivedCount,
  isArchiveConfirming,
  isDeleteConfirming,
  errorMessage,
  onMoveToSuite,
  onStatusChange,
  onPriorityChange,
  onCaseTypeChange,
  onRestoreArchived,
  onRequestArchive,
  onCancelArchive,
  onConfirmArchive,
  onRequestDeleteArchived,
  onCancelDeleteArchived,
  onConfirmDeleteArchived,
  onClearSelection,
}: BulkCaseBarProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)

  function closeMenu(): void {
    setOpenMenu(null)
  }

  useEffect(() => {
    if (!openMenu) {
      return
    }

    function handlePointerDown(event: PointerEvent): void {
      const target = event.target

      if (target instanceof Node && menuRef.current?.contains(target)) {
        return
      }

      closeMenu()
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenu])

  return (
    <div
      ref={menuRef}
      className="mx-5 mt-4 rounded-2xl border border-[#dbe4f4] bg-[#f8fbff] px-4 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[#1b2f5b]">
          {selectedCount} selected
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              disabled={isApplying || suites.length === 0}
              onClick={() =>
                setOpenMenu((current) => (current === 'move' ? null : 'move'))
              }
              className={menuButtonClass(openMenu === 'move')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'move'}
            >
              Move to...
            </button>
            {openMenu === 'move' ? (
              <div className="absolute left-0 top-full z-50 mt-2 max-h-[280px] min-w-[220px] overflow-y-auto rounded-2xl border border-[#dbe4f4] bg-white p-2 shadow-[0_12px_30px_rgba(31,57,102,0.12)]">
                {suites.map((suite) => (
                  <button
                    key={suite.id}
                    type="button"
                    disabled={isApplying}
                    onClick={() => {
                      closeMenu()
                      onMoveToSuite(suite.id.toString())
                    }}
                    className={menuItemClass()}
                  >
                    {suite.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              disabled={isApplying}
              onClick={() =>
                setOpenMenu((current) => (current === 'status' ? null : 'status'))
              }
              className={menuButtonClass(openMenu === 'status')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'status'}
            >
              Status...
            </button>
            {openMenu === 'status' ? (
              <div className="absolute left-0 top-full z-50 mt-2 min-w-[180px] rounded-2xl border border-[#dbe4f4] bg-white p-2 shadow-[0_12px_30px_rgba(31,57,102,0.12)]">
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={() => {
                    closeMenu()
                    onStatusChange('Ready')
                  }}
                  className={menuItemClass('success')}
                >
                  Mark Ready
                </button>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={() => {
                    closeMenu()
                    onStatusChange('Draft')
                  }}
                  className={menuItemClass()}
                >
                  Mark Draft
                </button>
                <button
                  type="button"
                  disabled={isApplying || selectedArchivableCount === 0}
                  onClick={() => {
                    closeMenu()
                    onRequestArchive()
                  }}
                  className={menuItemClass('warning')}
                >
                  Archive
                </button>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              disabled={isApplying}
              onClick={() =>
                setOpenMenu((current) => (current === 'more' ? null : 'more'))
              }
              className={menuButtonClass(openMenu === 'more')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'more'}
            >
              More...
            </button>
            {openMenu === 'more' ? (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[230px] rounded-2xl border border-[#dbe4f4] bg-white p-2 shadow-[0_12px_30px_rgba(31,57,102,0.12)]">
                <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#7f8da9]">
                  Priority
                </div>
                {priorities.map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    disabled={isApplying}
                    onClick={() => {
                      closeMenu()
                      onPriorityChange(priority)
                    }}
                    className={menuItemClass()}
                  >
                    {priority}
                  </button>
                ))}
                <div className="mt-2 border-t border-[#e9eef8] px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#7f8da9]">
                  Type
                </div>
                {caseTypes.map((caseType) => (
                  <button
                    key={caseType}
                    type="button"
                    disabled={isApplying}
                    onClick={() => {
                      closeMenu()
                      onCaseTypeChange(caseType)
                    }}
                    className={menuItemClass()}
                  >
                    {caseType}
                  </button>
                ))}
                {isArchivedView ? (
                  <>
                    <div className="mt-2 border-t border-[#e9eef8] px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#7f8da9]">
                      Archived
                    </div>
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={() => {
                        closeMenu()
                        onRestoreArchived()
                      }}
                      className={menuItemClass('success')}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      disabled={isApplying || selectedArchivedCount === 0}
                      onClick={() => {
                        closeMenu()
                        onRequestDeleteArchived()
                      }}
                      className={menuItemClass('danger')}
                    >
                      Delete permanently
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              closeMenu()
              onClearSelection()
            }}
            disabled={isApplying}
            className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
          >
            Clear selection
          </button>
        </div>
      </div>

      {isArchiveConfirming ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div>
            <p className="m-0 text-sm font-semibold text-amber-950">
              Archive {selectedArchivableCount} selected case
              {selectedArchivableCount === 1 ? '' : 's'}?
            </p>
            <p className="m-0 mt-1 text-sm text-amber-900">
              Archived cases leave the active repository and can be restored from
              the Archived filter.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCancelArchive}
              disabled={isApplying}
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmArchive}
              disabled={isApplying}
              className="rounded-xl border border-amber-300 bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isApplying ? 'Archiving...' : 'Confirm archive'}
            </button>
          </div>
        </div>
      ) : null}

      {isDeleteConfirming ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <div>
            <p className="m-0 text-sm font-semibold text-rose-950">
              Permanently delete {selectedArchivedCount} archived case
              {selectedArchivedCount === 1 ? '' : 's'}?
            </p>
            <p className="m-0 mt-1 text-sm text-rose-900">
              This action cannot be undone. Deleted test cases will be removed
              from the repository.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCancelDeleteArchived}
              disabled={isApplying}
              className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-900 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmDeleteArchived}
              disabled={isApplying}
              className="rounded-xl border border-rose-300 bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isApplying ? 'Deleting...' : 'Confirm delete'}
            </button>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-3 rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {errorMessage}
        </div>
      ) : null}
    </div>
  )
}
