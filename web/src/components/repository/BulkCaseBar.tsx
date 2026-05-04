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
  return `tms-button disabled:cursor-not-allowed disabled:opacity-55 ${
    isActive ? 'tms-chip-primary' : ''
  }`
}

function menuItemClass(tone: 'default' | 'success' | 'danger' | 'warning' = 'default'): string {
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
      className="mx-5 mt-4 rounded-[var(--tms-radius-overlay)] border border-[var(--tms-border)] bg-[var(--tms-surface-muted)] px-4 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[var(--tms-text)]">
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
              <div className="tms-popover absolute left-0 top-full mt-2 max-h-[280px] min-w-[220px] overflow-y-auto">
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
              <div className="tms-popover absolute left-0 top-full mt-2 min-w-[180px]">
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
              <div className="tms-popover absolute right-0 top-full mt-2 min-w-[230px]">
                <div className="tms-kicker px-3 pb-1 pt-2">
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
                <div className="tms-kicker mt-2 border-t border-[var(--tms-border-subtle)] px-3 pb-1 pt-3">
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
                    <div className="tms-kicker mt-2 border-t border-[var(--tms-border-subtle)] px-3 pb-1 pt-3">
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
            className="tms-button disabled:cursor-not-allowed disabled:opacity-55"
          >
            Clear selection
          </button>
        </div>
      </div>

      {isArchiveConfirming ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--tms-border)] bg-[var(--tms-warning-soft)] px-4 py-3">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--tms-warning)]">
              Archive {selectedArchivableCount} selected case
              {selectedArchivableCount === 1 ? '' : 's'}?
            </p>
            <p className="m-0 mt-1 text-sm text-[var(--tms-warning)]">
              Archived cases leave the active repository and can be restored from
              the Archived filter.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCancelArchive}
              disabled={isApplying}
              className="tms-button disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmArchive}
              disabled={isApplying}
              className="tms-button border-[var(--tms-warning)] bg-[var(--tms-warning)] text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isApplying ? 'Archiving...' : 'Confirm archive'}
            </button>
          </div>
        </div>
      ) : null}

      {isDeleteConfirming ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--tms-border)] bg-[var(--tms-danger-soft)] px-4 py-3">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--tms-danger)]">
              Permanently delete {selectedArchivedCount} archived case
              {selectedArchivedCount === 1 ? '' : 's'}?
            </p>
            <p className="m-0 mt-1 text-sm text-[var(--tms-danger)]">
              This action cannot be undone. Deleted test cases will be removed
              from the repository.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCancelDeleteArchived}
              disabled={isApplying}
              className="tms-button disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmDeleteArchived}
              disabled={isApplying}
              className="tms-button-danger bg-[var(--tms-danger)] text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isApplying ? 'Deleting...' : 'Confirm delete'}
            </button>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-3 rounded-xl border border-[var(--tms-border)] bg-[var(--tms-danger-soft)] px-4 py-3 text-sm text-[var(--tms-danger)]">
          {errorMessage}
        </div>
      ) : null}
    </div>
  )
}
