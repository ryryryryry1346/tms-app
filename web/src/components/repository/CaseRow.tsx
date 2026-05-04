import { Link } from '@tanstack/react-router'
import type { DragEvent } from 'react'
import { CaseActionsMenu } from './CaseActionsMenu'

export type RepositoryCaseStatus = 'Draft' | 'Ready' | 'Archived'
export type RepositoryCasePriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type RepositoryCaseType =
  | 'Functional'
  | 'Regression'
  | 'Smoke'
  | 'E2E'
  | 'UI'
  | 'API'

export type RepositoryCaseRowTest = {
  id: number
  title: string
  status: string | null
  priority: string | null
  caseType: string | null
  createdAt: string | null
  updatedAt: string | null
}

type CaseRowProps = {
  test: RepositoryCaseRowTest
  isSelected: boolean
  isMenuOpen: boolean
  isPending: boolean
  isEditingTitle: boolean
  editingTitleValue: string
  draggedTestIds: number[]
  dragOverDrop: { testId: number; position: 'before' | 'after' } | null
  priorityOptions: RepositoryCasePriority[]
  caseTypeOptions: RepositoryCaseType[]
  statusOptions: RepositoryCaseStatus[]
  formatDate: (value: string | null | undefined) => string
  onToggleSelection: () => void
  onDragStart: (event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  onDragOver: (event: DragEvent<HTMLElement>, position: 'before' | 'after') => void
  onDragLeave: () => void
  onDrop: (event: DragEvent<HTMLElement>) => void
  onTitleEditChange: (value: string) => void
  onStartTitleEdit: () => void
  onSaveTitleEdit: () => void
  onCancelTitleEdit: () => void
  onPriorityChange: (priority: RepositoryCasePriority) => void
  onCaseTypeChange: (caseType: RepositoryCaseType) => void
  onStatusChange: (status: RepositoryCaseStatus) => void
  onToggleMenu: () => void
  onCloseMenu: () => void
  onPreview: () => void
  onDuplicate: () => void
  onRestore: () => void
  onDeletePermanently: () => void
  onArchive: () => void
}

function DragHandleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="currentColor"
    >
      <path d="M5 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5 12.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 12.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
    </svg>
  )
}

export function CaseRow({
  test,
  isSelected,
  isMenuOpen,
  isPending,
  isEditingTitle,
  editingTitleValue,
  draggedTestIds,
  dragOverDrop,
  priorityOptions,
  caseTypeOptions,
  statusOptions,
  formatDate,
  onToggleSelection,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onTitleEditChange,
  onStartTitleEdit,
  onSaveTitleEdit,
  onCancelTitleEdit,
  onPriorityChange,
  onCaseTypeChange,
  onStatusChange,
  onToggleMenu,
  onCloseMenu,
  onPreview,
  onDuplicate,
  onRestore,
  onDeletePermanently,
  onArchive,
}: CaseRowProps) {
  const status = (test.status ?? 'Draft') as RepositoryCaseStatus
  const priority = (test.priority ?? 'Medium') as RepositoryCasePriority
  const caseType = (test.caseType ?? 'Functional') as RepositoryCaseType
  const isReady = status === 'Ready'
  const isArchived = status === 'Archived'
  const isDropTarget = dragOverDrop?.testId === test.id

  return (
    <article
      onDragOver={(event) => {
        if (draggedTestIds.length === 0) {
          return
        }

        event.preventDefault()
        event.stopPropagation()
        event.dataTransfer.dropEffect = 'move'
        const bounds = event.currentTarget.getBoundingClientRect()
        const position =
          event.clientY - bounds.top > bounds.height / 2 ? 'after' : 'before'

        onDragOver(event, position)
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`tms-table-row grid grid-cols-[64px_82px_minmax(220px,1fr)_110px_110px_110px_110px_110px_96px] px-5 py-2.5 transition ${
        draggedTestIds.includes(test.id)
          ? 'bg-[var(--tms-surface-muted)] opacity-70'
          : isDropTarget
            ? dragOverDrop.position === 'before'
              ? 'bg-[var(--tms-primary-soft)] shadow-[inset_0_2px_0_var(--tms-primary)]'
              : 'bg-[var(--tms-primary-soft)] shadow-[inset_0_-2px_0_var(--tms-primary)]'
            : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className="h-4 w-4 rounded border-[var(--tms-border)] text-[var(--tms-primary)] focus:ring-[var(--tms-primary)]"
        />
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="cursor-grab rounded-md p-1 text-[var(--tms-text-soft)] hover:bg-[var(--tms-surface-muted)] hover:text-[var(--tms-text-muted)] active:cursor-grabbing"
          aria-label={`Drag test case ${test.id}`}
        >
          <DragHandleIcon />
        </button>
      </div>
      <Link
        to="/test/$testId"
        params={{ testId: test.id.toString() }}
        className="text-sm font-semibold no-underline text-[var(--tms-primary)]"
      >
        #{test.id}
      </Link>
      {isEditingTitle ? (
        <input
          value={editingTitleValue}
          onChange={(event) => onTitleEditChange(event.target.value)}
          onBlur={onSaveTitleEdit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              onCancelTitleEdit()
            }
          }}
          onPointerDown={(event) => event.stopPropagation()}
          disabled={isPending}
          autoFocus
          className="tms-input min-h-0 min-w-0 rounded-lg px-2 py-1 disabled:cursor-not-allowed disabled:opacity-55"
          aria-label={`Edit title for ${test.title}`}
        />
      ) : (
        <Link
          to="/test/$testId"
          params={{ testId: test.id.toString() }}
          onDoubleClick={(event) => {
            event.preventDefault()
            onStartTitleEdit()
          }}
          className="block min-w-0 truncate pr-4 text-sm font-semibold no-underline text-[var(--tms-text)] hover:text-[var(--tms-primary)]"
        >
          {test.title}
        </Link>
      )}
      <select
        value={priority}
        onChange={(event) =>
          onPriorityChange(event.target.value as RepositoryCasePriority)
        }
        onPointerDown={(event) => event.stopPropagation()}
        disabled={isPending}
        className={`tms-chip w-fit border-0 outline-none disabled:cursor-not-allowed disabled:opacity-55 ${
          priority === 'Critical'
            ? 'tms-chip-danger'
            : priority === 'High'
              ? 'tms-chip-warning'
            : priority === 'Low'
                ? 'tms-chip-draft'
                : 'tms-chip-primary'
        }`}
        aria-label={`Change priority for ${test.title}`}
      >
        {priorityOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <select
        value={caseType}
        onChange={(event) =>
          onCaseTypeChange(event.target.value as RepositoryCaseType)
        }
        onPointerDown={(event) => event.stopPropagation()}
        disabled={isPending}
        className="tms-chip w-fit border-0 outline-none disabled:cursor-not-allowed disabled:opacity-55"
        aria-label={`Change type for ${test.title}`}
      >
        {caseTypeOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-sm font-semibold text-[var(--tms-text-muted)]">
        {formatDate(test.createdAt)}
      </span>
      <span className="text-sm font-semibold text-[var(--tms-text-muted)]">
        {formatDate(test.updatedAt ?? test.createdAt)}
      </span>
      <select
        value={status}
        onChange={(event) =>
          onStatusChange(event.target.value as RepositoryCaseStatus)
        }
        onPointerDown={(event) => event.stopPropagation()}
        disabled={isPending}
        className={`tms-chip w-fit border-0 outline-none disabled:cursor-not-allowed disabled:opacity-55 ${
          isReady
            ? 'tms-chip-success'
            : isArchived
              ? 'tms-chip-warning'
              : 'tms-chip-draft'
        }`}
        aria-label={`Change status for ${test.title}`}
      >
        {statusOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <CaseActionsMenu
        testId={test.id}
        isOpen={isMenuOpen}
        isArchived={isArchived}
        isPending={isPending}
        onToggle={onToggleMenu}
        onClose={onCloseMenu}
        onPreview={onPreview}
        onDuplicate={onDuplicate}
        onRestore={onRestore}
        onDeletePermanently={onDeletePermanently}
        onArchive={onArchive}
      />
    </article>
  )
}
