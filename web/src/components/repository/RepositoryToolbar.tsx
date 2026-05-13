import { useState } from 'react'
import { WorkspaceSectionHeader } from '../layout/WorkspaceSectionHeader'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { PanelHeader } from '../ui/Panel'
import {
  PopoverMenu,
  PopoverMenuItem,
  PopoverMenuLabel,
  PopoverMenuSeparator,
} from '../ui/PopoverMenu'
import { SelectMenu } from '../ui/SelectMenu'
import type {
  RepositoryColumnKey,
  RepositoryTableDensity,
  RepositoryVisibleColumns,
} from './CaseRow'
import { REPOSITORY_COLUMN_LABELS } from './CaseRow'

export type RepositoryCaseFilter = 'All' | 'Ready' | 'Draft' | 'Archived'
export type RepositoryPriorityFilter =
  | 'All'
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical'
export type RepositoryCaseTypeFilter =
  | 'All'
  | 'Functional'
  | 'Regression'
  | 'Smoke'
  | 'E2E'
  | 'UI'
  | 'API'

type RepositoryToolbarProps = {
  searchValue: string
  priorityFilter: RepositoryPriorityFilter
  caseTypeFilter: RepositoryCaseTypeFilter
  caseFilter: RepositoryCaseFilter
  priorityOptions: Exclude<RepositoryPriorityFilter, 'All'>[]
  caseTypeOptions: Exclude<RepositoryCaseTypeFilter, 'All'>[]
  visibleColumns: RepositoryVisibleColumns
  density: RepositoryTableDensity
  onSearchChange: (value: string) => void
  onToggleColumn: (column: RepositoryColumnKey) => void
  onDensityChange: (density: RepositoryTableDensity) => void
  onPriorityFilterChange: (value: RepositoryPriorityFilter) => void
  onCaseTypeFilterChange: (value: RepositoryCaseTypeFilter) => void
  onCaseFilterChange: (value: RepositoryCaseFilter) => void
}

const CASE_FILTER_OPTIONS: RepositoryCaseFilter[] = [
  'All',
  'Ready',
  'Draft',
  'Archived',
]

function getCaseFilterChipClass(filter: RepositoryCaseFilter): string {
  if (filter === 'Ready') {
    return 'tms-chip-status-ready'
  }

  if (filter === 'Draft') {
    return 'tms-chip-status-draft'
  }

  if (filter === 'Archived') {
    return 'tms-chip-status-archived'
  }

  return 'tms-chip-primary'
}

export function RepositoryToolbar({
  searchValue,
  priorityFilter,
  caseTypeFilter,
  caseFilter,
  priorityOptions,
  caseTypeOptions,
  visibleColumns,
  density,
  onSearchChange,
  onToggleColumn,
  onDensityChange,
  onPriorityFilterChange,
  onCaseTypeFilterChange,
  onCaseFilterChange,
}: RepositoryToolbarProps) {
  const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false)
  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length

  return (
    <PanelHeader dense>
      <WorkspaceSectionHeader
        dense
        title="Test suites and cases"
        actions={
          <div className="tms-toolbar repository-toolbar__controls justify-end">
            <label className="repository-toolbar__field">
              <span className="shrink-0 whitespace-nowrap font-semibold">
                Search
              </span>
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                className="repository-toolbar__input"
              />
            </label>
            <label className="repository-toolbar__field">
              <span className="font-semibold">Priority</span>
              <SelectMenu
                value={priorityFilter}
                onValueChange={(value) =>
                  onPriorityFilterChange(value as RepositoryPriorityFilter)
                }
                options={[
                  { value: 'All', label: 'All' },
                  ...priorityOptions.map((priority) => ({
                    value: priority,
                    label: priority,
                  })),
                ]}
                className="min-w-[96px]"
                aria-label="Filter by priority"
              />
            </label>
            <label className="repository-toolbar__field">
              <span className="font-semibold">Type</span>
              <SelectMenu
                value={caseTypeFilter}
                onValueChange={(value) =>
                  onCaseTypeFilterChange(value as RepositoryCaseTypeFilter)
                }
                options={[
                  { value: 'All', label: 'All' },
                  ...caseTypeOptions.map((caseType) => ({
                    value: caseType,
                    label: caseType,
                  })),
                ]}
                className="min-w-[104px]"
                aria-label="Filter by type"
              />
            </label>
            <div className="repository-toolbar__chips">
              {CASE_FILTER_OPTIONS.map((filter) => (
                <Button
                  key={filter}
                  onClick={() => onCaseFilterChange(filter)}
                  variant={caseFilter === filter ? 'primary' : 'default'}
                  className={`${
                    caseFilter === filter ? getCaseFilterChipClass(filter) : ''
                  }`}
                >
                  {filter}
                </Button>
              ))}
            </div>
            <PopoverMenu
              isOpen={isTableSettingsOpen}
              onClose={() => setIsTableSettingsOpen(false)}
              onOpenChange={setIsTableSettingsOpen}
              className="min-w-[220px]"
              trigger={
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="Configure repository table"
                >
                  View
                </Button>
              }
            >
              <PopoverMenuLabel>Columns</PopoverMenuLabel>
              {(Object.keys(REPOSITORY_COLUMN_LABELS) as RepositoryColumnKey[]).map(
                (column) => (
                  <PopoverMenuItem
                    key={column}
                    onClick={(event) => {
                      event.preventDefault()

                      if (visibleColumns[column] && visibleColumnCount <= 1) {
                        return
                      }

                      onToggleColumn(column)
                    }}
                    className="justify-start gap-2"
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[0.625rem] leading-none ${
                        visibleColumns[column]
                          ? 'border-[var(--tms-primary)] bg-[var(--tms-primary)] text-[var(--tms-text-inverse)]'
                          : 'border-[var(--tms-border)] bg-[var(--tms-surface)]'
                      }`}
                    >
                      {visibleColumns[column] ? 'x' : ''}
                    </span>
                    {REPOSITORY_COLUMN_LABELS[column]}
                  </PopoverMenuItem>
                ),
              )}
              <PopoverMenuSeparator />
              <PopoverMenuLabel>Density</PopoverMenuLabel>
              <PopoverMenuItem onClick={() => onDensityChange('compact')}>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  Compact
                  {density === 'compact' ? (
                    <span aria-hidden="true">Active</span>
                  ) : null}
                </span>
              </PopoverMenuItem>
              <PopoverMenuItem onClick={() => onDensityChange('comfortable')}>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  Comfortable
                  {density === 'comfortable' ? (
                    <span aria-hidden="true">Active</span>
                  ) : null}
                </span>
              </PopoverMenuItem>
            </PopoverMenu>
          </div>
        }
      />
    </PanelHeader>
  )
}
