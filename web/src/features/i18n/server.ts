import { createServerFn } from '@tanstack/react-start'
import type { Language } from '../../lib/i18n-core'

export const getLanguage = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Language> => {
    const [{ getRequestHeaders }, { parseLanguageFromCookieHeader }] =
      await Promise.all([
        import('@tanstack/react-start/server'),
        import('../../lib/i18n-core'),
      ])

    return parseLanguageFromCookieHeader(getRequestHeaders().get('cookie'))
  },
)
