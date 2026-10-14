import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import {
  PopoverMenu,
  PopoverMenuItem,
} from '../ui/PopoverMenu'
import { SelectMenu } from '../ui/SelectMenu'
import type {
  RepositoryColumnKey,
  RepositoryVisibleColumns,
} from './CaseRow'
import { REPOSITORY_COLUMN_LABELS } from './CaseRow'
import { useT } from '../../lib/i18n'

export type RepositoryCaseFilter = 'All' | 'Ready' | 'Draft' | 'Archived'
export type RepositoryPriorityFilter =
  | 'All'
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical'

const PRIORITY_FILTER_COLOR: Record<
  Exclude<RepositoryPriorityFilter, 'All'>,
  string
> = {
  Low: 'var(--priority-low-text)',
  Medium: 'var(--priority-medium-text)',
  High: 'var(--priority-high-text)',
  Critical: 'var(--priority-critical-text)',
}

function PriorityOptionLabel({
  priority,
}: {
  priority: Exclude<RepositoryPriorityFilter, 'All'>
}) {
  const t = useT()

  return (
    <span style={{ color: PRIORITY_FILTER_COLOR[priority], fontWeight: 600 }}>
      {t(priority)}
    </span>
  )
}
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
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  onToggleColumn: (column: RepositoryColumnKey) => void
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

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="repository-toolbar__search-icon"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.25 10.25 2.75 2.75" />
    </svg>
  )
}

function ColumnsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 4h10" />
      <path d="M3 8h10" />
      <path d="M3 12h10" />
      <path d="M5.5 3v10" />
      <path d="M10.5 3v10" />
    </svg>
  )
}

export function RepositoryToolbar({
  searchValue,
  priorityFilter,
  caseTypeFilter,
  caseFilter,
  priorityOptions,
  caseTypeOptions,
  visibleColumns,
  onSearchChange,
  onSearchSubmit,
  onToggleColumn,
  onPriorityFilterChange,
  onCaseTypeFilterChange,
  onCaseFilterChange,
}: RepositoryToolbarProps) {
  const t = useT()

  const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false)
  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length

  return (
    <div className="repository-toolbar">
      <form
        role="search"
        className="repository-toolbar__search-wrap"
        onSubmit={(event) => {
          event.preventDefault()
          onSearchSubmit()
        }}
      >
        <SearchIcon />
        <Input
          enterKeyHint="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="repository-toolbar__search-input"
          placeholder={t('Search test suites or cases... (Enter)')}
          aria-label={t('Search test suites or cases')}
          title={t('Press Enter to search')}
        />
      </form>

      <div className="repository-toolbar__filter-wrap">
        <label className="repository-toolbar__filter">
          <span>{t('Priority')}</span>
          <SelectMenu
            value={priorityFilter}
            onValueChange={(value) =>
              onPriorityFilterChange(value as RepositoryPriorityFilter)
            }
            options={[
              { value: 'All', label: t('All') },
              ...priorityOptions.map((priority) => ({
                value: priority,
                label: <PriorityOptionLabel priority={priority} />,
              })),
            ]}
            className="repository-toolbar__select"
            aria-label={t('Filter by priority')}
          />
        </label>

        <label className="repository-toolbar__filter">
          <span>{t('Type')}</span>
          <SelectMenu
            value={caseTypeFilter}
            onValueChange={(value) =>
              onCaseTypeFilterChange(value as RepositoryCaseTypeFilter)
            }
            options={[
              { value: 'All', label: t('All') },
              ...caseTypeOptions.map((caseType) => ({
                value: caseType,
                label: t(caseType),
              })),
            ]}
            className="repository-toolbar__select"
            aria-label={t('Filter by type')}
          />
        </label>
      </div>

      <div
        className="repository-toolbar__status-segmented"
        role="group"
        aria-label={t('Filter by case status')}
      >
        {CASE_FILTER_OPTIONS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => onCaseFilterChange(filter)}
            className={`repository-toolbar__status-button ${
              filter !== 'All'
                ? `repository-toolbar__status-button--${filter.toLowerCase()}`
                : ''
            } ${caseFilter === filter ? 'is-active' : ''}`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="repository-toolbar__spacer" />

      <PopoverMenu
        isOpen={isTableSettingsOpen}
        onClose={() => setIsTableSettingsOpen(false)}
        onOpenChange={setIsTableSettingsOpen}
        className="min-w-[220px]"
        trigger={
          <Button
            type="button"
            variant="secondary"
            aria-label={t('Configure repository table')}
            className="repository-toolbar__columns-button"
          >
            <ColumnsIcon />{t('Columns')}</Button>
        }
      >
        {(Object.keys(REPOSITORY_COLUMN_LABELS) as RepositoryColumnKey[]).map(
          (column) => {
            const isChecked = visibleColumns[column]
            const isLocked = isChecked && visibleColumnCount <= 1

            return (
              <PopoverMenuItem
                key={column}
                role="menuitemcheckbox"
                aria-checked={isChecked}
                disabled={isLocked}
                onClick={(event) => {
                  event.preventDefault()

                  if (isLocked) {
                    return
                  }

                  onToggleColumn(column)
                }}
                className="repository-column-menu-item"
              >
                <span
                  aria-hidden="true"
                  className={`repository-column-checkbox ${
                    isChecked ? 'repository-column-checkbox--checked' : ''
                  }`}
                />
                <span className="repository-column-menu-item__label">
                  {REPOSITORY_COLUMN_LABELS[column]}
                </span>
              </PopoverMenuItem>
            )
          },
        )}
      </PopoverMenu>
    </div>
  )
}
