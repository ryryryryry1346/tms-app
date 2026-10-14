import { EmptyState } from '../ui/EmptyState'
import { useT } from '../../lib/i18n'

type RepositoryEmptyReason = 'no-suites' | 'no-matching-cases'
type RepositoryCaseFilter = 'All' | 'Ready' | 'Draft' | 'Archived'

type RepositoryEmptyStateProps = {
  reason: RepositoryEmptyReason
  caseFilter?: RepositoryCaseFilter
}

function getEmptyMessage({
  reason,
  caseFilter = 'All',
}: RepositoryEmptyStateProps): string {
  if (reason === 'no-suites') {
    return 'This project does not have test suites yet.'
  }

  if (caseFilter === 'All') {
    return 'No test cases match the current search and suite filters.'
  }

  if (caseFilter === 'Archived') {
    return 'No archived test cases match the current search and suite filters.'
  }

  return `No ${caseFilter.toLowerCase()} test cases match the current search and suite filters.`
}

export function RepositoryEmptyState(props: RepositoryEmptyStateProps) {
  const t = useT()

  return (
    <EmptyState
      className="m-5"
      title={t('No cases to show')}
      description={getEmptyMessage(props)}
    />
  )
}
