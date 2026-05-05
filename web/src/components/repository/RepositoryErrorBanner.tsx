import { Panel } from '../ui/Panel'

type RepositoryErrorBannerProps = {
  message: string
}

export function RepositoryErrorBanner({ message }: RepositoryErrorBannerProps) {
  return (
    <Panel className="mx-5 mt-4 rounded-xl bg-[var(--tms-danger-soft)] px-4 py-3 text-sm text-[var(--tms-danger)] shadow-none">
      {message}
    </Panel>
  )
}
