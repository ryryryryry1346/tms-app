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
      className={`grid grid-cols-[64px_82px_minmax(220px,1fr)_110px_110px_110px_110px_110px_96px] items-center border-t border-[#eef2f8] px-5 py-2.5 transition hover:bg-[#f8fbff] ${
        draggedTestIds.includes(test.id)
          ? 'bg-[#f8fbff] opacity-70'
          : isDropTarget
            ? dragOverDrop.position === 'before'
              ? 'bg-[#ecf2ff] shadow-[inset_0_2px_0_#2f6fe4]'
              : 'bg-[#ecf2ff] shadow-[inset_0_-2px_0_#2f6fe4]'
            : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className="h-4 w-4 rounded border-[#c7d5ee] text-[#2f6fe4] focus:ring-[#2f6fe4]"
        />
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="cursor-grab rounded-md p-1 text-[#9aa7bf] hover:bg-[#eef3fb] hover:text-[#60718f] active:cursor-grabbing"
          aria-label={`Drag test case ${test.id}`}
        >
          <DragHandleIcon />
        </button>
      </div>
      <Link
        to="/test/$testId"
        params={{ testId: test.id.toString() }}
        className="text-sm font-semibold no-underline text-[#2f6fe4]"
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
          className="min-w-0 rounded-lg border border-[#9dbaf7] bg-white px-2 py-1 text-sm font-semibold text-[#1b2f5b] outline-none disabled:cursor-not-allowed disabled:opacity-55"
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
          className="block min-w-0 truncate pr-4 text-sm font-semibold no-underline text-[#1b2f5b] hover:text-[#2f6fe4]"
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
        className={`w-fit rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-55 ${
          priority === 'Critical'
            ? 'bg-rose-50 text-rose-700'
            : priority === 'High'
              ? 'bg-amber-50 text-amber-800'
              : priority === 'Low'
                ? 'bg-slate-100 text-slate-600'
                : 'bg-[#eef6ff] text-[#506487]'
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
        className="w-fit rounded-full border-0 bg-[#f3f5f9] px-2.5 py-1 text-xs font-semibold text-[#60718f] outline-none disabled:cursor-not-allowed disabled:opacity-55"
        aria-label={`Change type for ${test.title}`}
      >
        {caseTypeOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-sm font-semibold text-[#60718f]">
        {formatDate(test.createdAt)}
      </span>
      <span className="text-sm font-semibold text-[#60718f]">
        {formatDate(test.updatedAt ?? test.createdAt)}
      </span>
      <select
        value={status}
        onChange={(event) =>
          onStatusChange(event.target.value as RepositoryCaseStatus)
        }
        onPointerDown={(event) => event.stopPropagation()}
        disabled={isPending}
        className={`w-fit rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-55 ${
          isReady
            ? 'bg-emerald-50 text-emerald-700'
            : isArchived
              ? 'bg-amber-50 text-amber-800'
              : 'bg-slate-100 text-slate-700'
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
