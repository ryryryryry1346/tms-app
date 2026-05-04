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

type RepositorySuiteOption = {
  id: number
  name: string
}

type RepositoryToolbarProps = {
  visibleCount: number
  searchValue: string
  suiteFilterId: string
  priorityFilter: RepositoryPriorityFilter
  caseTypeFilter: RepositoryCaseTypeFilter
  caseFilter: RepositoryCaseFilter
  allSuitesFilter: string
  suites: RepositorySuiteOption[]
  priorityOptions: Exclude<RepositoryPriorityFilter, 'All'>[]
  caseTypeOptions: Exclude<RepositoryCaseTypeFilter, 'All'>[]
  onSearchChange: (value: string) => void
  onSuiteFilterChange: (value: string) => void
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

export function RepositoryToolbar({
  visibleCount,
  searchValue,
  suiteFilterId,
  priorityFilter,
  caseTypeFilter,
  caseFilter,
  allSuitesFilter,
  suites,
  priorityOptions,
  caseTypeOptions,
  onSearchChange,
  onSuiteFilterChange,
  onPriorityFilterChange,
  onCaseTypeFilterChange,
  onCaseFilterChange,
}: RepositoryToolbarProps) {
  return (
    <div className="tms-panel-header">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-xl font-semibold text-[var(--tms-text)]">
            Test suites and cases
          </h2>
          <div className="tms-kicker mt-1">
            {visibleCount} visible cases
          </div>
        </div>
        <div className="tms-toolbar justify-end">
          <label className="tms-input flex w-[260px] items-center gap-2">
            <span className="shrink-0 whitespace-nowrap font-semibold">
              Search
            </span>
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[var(--tms-text)] outline-none"
            />
          </label>
          <label className="tms-input flex items-center gap-2">
            <span className="font-semibold">Suite</span>
            <select
              value={suiteFilterId}
              onChange={(event) => onSuiteFilterChange(event.target.value)}
              className="min-w-[160px] border-0 bg-transparent p-0 text-sm text-[var(--tms-text)] outline-none"
            >
              <option value={allSuitesFilter}>All suites</option>
              {suites.map((section) => (
                <option key={section.id} value={section.id.toString()}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <label className="tms-input flex items-center gap-2">
            <span className="font-semibold">Priority</span>
            <select
              value={priorityFilter}
              onChange={(event) =>
                onPriorityFilterChange(
                  event.target.value as RepositoryPriorityFilter,
                )
              }
              className="min-w-[110px] border-0 bg-transparent p-0 text-sm text-[var(--tms-text)] outline-none"
            >
              <option value="All">All</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="tms-input flex items-center gap-2">
            <span className="font-semibold">Type</span>
            <select
              value={caseTypeFilter}
              onChange={(event) =>
                onCaseTypeFilterChange(
                  event.target.value as RepositoryCaseTypeFilter,
                )
              }
              className="min-w-[120px] border-0 bg-transparent p-0 text-sm text-[var(--tms-text)] outline-none"
            >
              <option value="All">All</option>
              {caseTypeOptions.map((caseType) => (
                <option key={caseType} value={caseType}>
                  {caseType}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {CASE_FILTER_OPTIONS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => onCaseFilterChange(filter)}
                className={`tms-button ${
                  caseFilter === filter
                    ? filter === 'Archived'
                      ? 'tms-chip-warning'
                      : 'tms-chip-primary'
                    : ''
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
