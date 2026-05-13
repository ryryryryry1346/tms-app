import { Link } from '@tanstack/react-router'
import type { CSSProperties, DragEvent } from 'react'
import { Checkbox } from '../ui/Checkbox'
import { Input } from '../ui/Input'
import { SelectMenu } from '../ui/SelectMenu'
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
export type RepositoryColumnKey =
  | 'priority'
  | 'type'
  | 'created'
  | 'updated'
  | 'status'
export type RepositoryVisibleColumns = Record<RepositoryColumnKey, boolean>
export type RepositoryTableDensity = 'compact' | 'comfortable'

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
  visibleColumns: RepositoryVisibleColumns
  density: RepositoryTableDensity
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

export const REPOSITORY_COLUMN_LABELS: Record<RepositoryColumnKey, string> = {
  priority: 'Priority',
  type: 'Type',
  created: 'Created',
  updated: 'Updated',
  status: 'Status',
}

export const DEFAULT_REPOSITORY_VISIBLE_COLUMNS: RepositoryVisibleColumns = {
  priority: true,
  type: true,
  created: true,
  updated: true,
  status: true,
}

export function getRepositoryCaseGridTemplate(
  visibleColumns: RepositoryVisibleColumns,
): string {
  return [
    '66px',
    '70px',
    'minmax(220px, 1fr)',
    visibleColumns.priority ? '104px' : null,
    visibleColumns.type ? '120px' : null,
    visibleColumns.created ? '112px' : null,
    visibleColumns.updated ? '112px' : null,
    visibleColumns.status ? '108px' : null,
    '84px',
  ]
    .filter(Boolean)
    .join(' ')
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

function getPriorityChipClass(priority: RepositoryCasePriority): string {
  if (priority === 'Critical') {
    return 'tms-chip-priority-critical'
  }

  if (priority === 'High') {
    return 'tms-chip-priority-high'
  }

  if (priority === 'Low') {
    return 'tms-chip-priority-low'
  }

  return 'tms-chip-priority-medium'
}

function getStatusChipClass(status: RepositoryCaseStatus): string {
  if (status === 'Ready') {
    return 'tms-chip-status-ready'
  }

  if (status === 'Archived') {
    return 'tms-chip-status-archived'
  }

  return 'tms-chip-status-draft'
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
  visibleColumns,
  density,
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
  const isArchived = status === 'Archived'
  const isDropTarget = dragOverDrop?.testId === test.id
  const rowStyle: CSSProperties = {
    gridTemplateColumns: getRepositoryCaseGridTemplate(visibleColumns),
  }

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
      style={rowStyle}
      className={`tms-table-row repository-case-grid px-3 transition sm:px-4 ${
        density === 'compact' ? 'py-1.5' : 'py-2'
      } ${
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
        <Checkbox
          checked={isSelected}
          onChange={onToggleSelection}
        />
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="inline-flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-[var(--tms-text-soft)] hover:border-[var(--tms-border-subtle)] hover:bg-[var(--tms-surface-muted)] hover:text-[var(--tms-text-muted)] active:cursor-grabbing"
          aria-label={`Drag test case ${test.id}`}
        >
          <DragHandleIcon />
        </button>
      </div>
      <Link
        to="/test/$testId"
        params={{ testId: test.id.toString() }}
        className="text-xs font-semibold no-underline text-[var(--tms-primary)]"
      >
        #{test.id}
      </Link>
      {isEditingTitle ? (
        <Input
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
          size="sm"
          className="min-w-0 rounded-lg"
          aria-label={`Edit title for ${test.title}`}
        />
      ) : (
        <button
          type="button"
          onClick={onPreview}
          onDoubleClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onStartTitleEdit()
          }}
          className="block min-w-0 truncate border-0 bg-transparent p-0 pr-3 text-left text-sm font-medium text-[var(--tms-primary)] hover:underline"
          aria-label={`Preview test case ${test.title}`}
        >
          {test.title}
        </button>
      )}
      {visibleColumns.priority ? (
        <SelectMenu
          value={priority}
          onValueChange={(value) =>
            onPriorityChange(value as RepositoryCasePriority)
          }
          options={priorityOptions.map((option) => ({
            value: option,
            label: option,
          }))}
          onPointerDown={(event) => event.stopPropagation()}
          disabled={isPending}
          className={`tms-inline-select w-fit border-0 outline-none ${getPriorityChipClass(priority)}`}
          aria-label={`Change priority for ${test.title}`}
        />
      ) : null}
      {visibleColumns.type ? (
        <SelectMenu
          value={caseType}
          onValueChange={(value) => onCaseTypeChange(value as RepositoryCaseType)}
          options={caseTypeOptions.map((option) => ({
            value: option,
            label: option,
          }))}
          onPointerDown={(event) => event.stopPropagation()}
          disabled={isPending}
          className="tms-inline-select tms-inline-select-neutral w-fit border-0 outline-none"
          aria-label={`Change type for ${test.title}`}
        />
      ) : null}
      {visibleColumns.created ? (
        <span className="text-xs font-medium text-[var(--tms-text-muted)]">
          {formatDate(test.createdAt)}
        </span>
      ) : null}
      {visibleColumns.updated ? (
        <span className="text-xs font-medium text-[var(--tms-text-muted)]">
          {formatDate(test.updatedAt ?? test.createdAt)}
        </span>
      ) : null}
      {visibleColumns.status ? (
        <SelectMenu
          value={status}
          onValueChange={(value) => onStatusChange(value as RepositoryCaseStatus)}
          options={statusOptions.map((option) => ({
            value: option,
            label: option,
          }))}
          onPointerDown={(event) => event.stopPropagation()}
          disabled={isPending}
          className={`tms-inline-select w-fit border-0 outline-none ${getStatusChipClass(status)}`}
          aria-label={`Change status for ${test.title}`}
        />
      ) : null}
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
