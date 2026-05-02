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
    <div className="border-b border-[#dfe6f4] px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-xl font-semibold text-[#1b2f5b]">
            Test suites and cases
          </h2>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#7f8da9]">
            {visibleCount} visible cases
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex w-[260px] items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm text-[#6d7d9e]">
            <span className="shrink-0 whitespace-nowrap font-semibold">
              Search
            </span>
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[#1b2f5b] outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm text-[#6d7d9e]">
            <span className="font-semibold">Suite</span>
            <select
              value={suiteFilterId}
              onChange={(event) => onSuiteFilterChange(event.target.value)}
              className="min-w-[160px] border-0 bg-transparent p-0 text-sm text-[#1b2f5b] outline-none"
            >
              <option value={allSuitesFilter}>All suites</option>
              {suites.map((section) => (
                <option key={section.id} value={section.id.toString()}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm text-[#6d7d9e]">
            <span className="font-semibold">Priority</span>
            <select
              value={priorityFilter}
              onChange={(event) =>
                onPriorityFilterChange(
                  event.target.value as RepositoryPriorityFilter,
                )
              }
              className="min-w-[110px] border-0 bg-transparent p-0 text-sm text-[#1b2f5b] outline-none"
            >
              <option value="All">All</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm text-[#6d7d9e]">
            <span className="font-semibold">Type</span>
            <select
              value={caseTypeFilter}
              onChange={(event) =>
                onCaseTypeFilterChange(
                  event.target.value as RepositoryCaseTypeFilter,
                )
              }
              className="min-w-[120px] border-0 bg-transparent p-0 text-sm text-[#1b2f5b] outline-none"
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
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  caseFilter === filter
                    ? filter === 'Archived'
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : 'border-[#b7cdfa] bg-[#ecf2ff] text-[#2f6fe4]'
                    : 'border-[#dbe4f4] bg-white text-[#60718f]'
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
