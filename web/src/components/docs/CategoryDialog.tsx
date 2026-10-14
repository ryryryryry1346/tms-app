import { useState } from 'react'
import {
  DOC_CATEGORY_COLORS,
  DOC_CATEGORY_ICONS,
  type DocCategoryColor,
  type DocCategoryIcon,
} from '../../lib/docCategories'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { CategoryChip, getCategoryIcon } from './CategoryChip'
import { useT } from '../../lib/i18n'

export type CategoryFormValues = {
  name: string
  color: DocCategoryColor
  icon: DocCategoryIcon
}

type CategoryDialogProps = {
  mode: 'create' | 'edit'
  initial: CategoryFormValues
  isPending: boolean
  errorMessage: string | null
  onSubmit: (values: CategoryFormValues) => void
  onClose: () => void
}

/** Create / edit a docs category. Mount it only while open (state starts from `initial`). */
export function CategoryDialog({
  mode,
  initial,
  isPending,
  errorMessage,
  onSubmit,
  onClose,
}: CategoryDialogProps) {
  const t = useT()

  const [name, setName] = useState(initial.name)
  const [color, setColor] = useState<DocCategoryColor>(initial.color)
  const [icon, setIcon] = useState<DocCategoryIcon>(initial.icon)
  const trimmedName = name.trim()

  return (
    <Modal
      open
      title={mode === 'create' ? t('New category') : t('Edit category')}
      onClose={isPending ? () => undefined : onClose}
    >
      <form
        className="category-dialog"
        onSubmit={(event) => {
          event.preventDefault()

          if (trimmedName.length > 0 && !isPending) {
            onSubmit({ name: trimmedName, color, icon })
          }
        }}
      >
        {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

        <label className="category-dialog__field">
          <span className="category-dialog__label">{t('Name')}</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('e.g. Onboarding')}
            maxLength={40}
            autoFocus
          />
        </label>

        <div className="category-dialog__field">
          <span className="category-dialog__label">{t('Color')}</span>
          <div className="category-dialog__swatches" role="radiogroup" aria-label={t('Color')}>
            {DOC_CATEGORY_COLORS.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={item === color}
                aria-label={item}
                className={`category-dialog__swatch${
                  item === color ? ' is-selected' : ''
                }`}
                style={{ background: item, color: item }}
                onClick={() => setColor(item)}
              />
            ))}
          </div>
        </div>

        <div className="category-dialog__field">
          <span className="category-dialog__label">{t('Icon')}</span>
          <div className="category-dialog__icons" role="radiogroup" aria-label={t('Icon')}>
            {DOC_CATEGORY_ICONS.map((item) => {
              const Icon = getCategoryIcon(item)

              return (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={item === icon}
                  aria-label={item}
                  className={`category-dialog__icon${
                    item === icon ? ' is-selected' : ''
                  }`}
                  onClick={() => setIcon(item)}
                >
                  <Icon size={17} strokeWidth={2} aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </div>

        <div className="category-dialog__preview">
          <span>{t('Preview')}</span>
          <CategoryChip name={trimmedName || 'Category name'} color={color} icon={icon} />
        </div>

        <div className="category-dialog__actions">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={onClose}
          >{t('Cancel')}</Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isPending || trimmedName.length === 0}
          >
            {isPending ? t('Saving...') : mode === 'create' ? t('Create') : t('Save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
