import { Alert } from './Alert'
import { Button } from './Button'

type ConfirmActionAlertProps = {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger'
  isPending?: boolean
  pendingLabel?: string
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

export function ConfirmActionAlert({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  isPending = false,
  pendingLabel,
  onConfirm,
  onCancel,
  className,
}: ConfirmActionAlertProps) {
  const alertVariant = confirmVariant === 'danger' ? 'danger' : 'warning'

  return (
    <Alert
      variant={alertVariant}
      className={className}
      title={title}
      action={
        <>
          <Button
            onClick={onCancel}
            disabled={isPending}
            variant="secondary"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            variant={confirmVariant}
          >
            {isPending ? pendingLabel ?? confirmLabel : confirmLabel}
          </Button>
        </>
      }
    >
      {description}
    </Alert>
  )
}
