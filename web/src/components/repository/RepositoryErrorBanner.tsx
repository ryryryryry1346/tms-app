import { Alert } from '../ui/Alert'

type RepositoryErrorBannerProps = {
  message: string
}

export function RepositoryErrorBanner({ message }: RepositoryErrorBannerProps) {
  return (
    <Alert variant="danger" className="mx-5 mt-4">
      {message}
    </Alert>
  )
}
