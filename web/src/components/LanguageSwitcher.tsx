import { useState } from 'react'
import { Check, ChevronDown, Languages } from 'lucide-react'
import { useLanguage, useT, type Language } from '../lib/i18n'
import { Button } from './ui/Button'
import { PopoverMenu, PopoverMenuItem } from './ui/PopoverMenu'

// Language names are shown in their own language, so they are not translated.
const LANGUAGES: Array<{ value: Language; short: string; name: string }> = [
  { value: 'en', short: 'EN', name: 'English' },
  { value: 'ru', short: 'RU', name: 'Русский' },
]

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage()
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)
  const current =
    LANGUAGES.find((option) => option.value === language) ?? LANGUAGES[0]

  return (
    <div className={`app-language-switcher ${className}`.trim()}>
      <PopoverMenu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onOpenChange={setIsOpen}
        align="right"
        sideOffset={10}
        className="app-language-switcher__menu"
        trigger={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="app-language-switcher__trigger"
            aria-label={t('Interface language')}
            aria-expanded={isOpen}
            title={t('Interface language')}
          >
            <Languages size={16} strokeWidth={2} aria-hidden="true" />
            <span>{current.short}</span>
            <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
          </Button>
        }
      >
        {LANGUAGES.map((option) => {
          const isActive = option.value === language

          return (
            <PopoverMenuItem
              key={option.value}
              role="menuitemradio"
              className="app-language-switcher__item"
              aria-checked={isActive}
              lang={option.value}
              onClick={() => {
                setIsOpen(false)

                if (!isActive) {
                  setLanguage(option.value)
                }
              }}
            >
              <span>{option.name}</span>
              {isActive ? (
                <Check size={14} strokeWidth={2} aria-hidden="true" />
              ) : null}
            </PopoverMenuItem>
          )
        })}
      </PopoverMenu>
    </div>
  )
}
