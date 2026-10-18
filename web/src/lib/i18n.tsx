import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  LANGUAGE_COOKIE,
  translate,
  type Language,
  type TranslateFn,
} from './i18n-core'

export {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  normalizeLanguage,
  parseLanguageFromCookieHeader,
  pluralize,
  readLanguageFromDocument,
  translate,
} from './i18n-core'
export type { Language, TranslateFn, TranslateVars } from './i18n-core'

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: TranslateFn
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: Language
  children: ReactNode
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((nextLanguage: Language) => {
    try {
      document.cookie = `${LANGUAGE_COOKIE}=${nextLanguage}; path=/; max-age=31536000; SameSite=Lax`
    } catch {
      // Cookies can be blocked; the choice then only lasts for this page view.
    }

    setLanguageState(nextLanguage)
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (text, vars) => translate(language, text, vars),
    }),
    [language, setLanguage],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used inside <I18nProvider>')
  }

  return context
}

/** Returns the translate function: `const t = useT(); t('Save')`. */
export function useT(): TranslateFn {
  return useI18n().t
}

export function useLanguage(): Pick<I18nContextValue, 'language' | 'setLanguage'> {
  const { language, setLanguage } = useI18n()
  return { language, setLanguage }
}
