/**
 * Pure i18n helpers (no React), shared by the provider and server code.
 */
import { RU_DICTIONARY } from './i18n-ru'

export type Language = 'ru' | 'en'

export const LANGUAGE_COOKIE = 'tms-lang'
export const DEFAULT_LANGUAGE: Language = 'en'

export type TranslateVars = Record<string, string | number>

export type TranslateFn = (text: string, vars?: TranslateVars) => string

export function normalizeLanguage(value: string | null | undefined): Language {
  return value === 'en' || value === 'ru' ? value : DEFAULT_LANGUAGE
}

export function parseLanguageFromCookieHeader(
  cookieHeader: string | null | undefined,
): Language {
  if (!cookieHeader) {
    return DEFAULT_LANGUAGE
  }

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rest] = part.trim().split('=')

    if (rawName === LANGUAGE_COOKIE) {
      return normalizeLanguage(rest.join('='))
    }
  }

  return DEFAULT_LANGUAGE
}

export function readLanguageFromDocument(): Language {
  if (typeof document === 'undefined') {
    return DEFAULT_LANGUAGE
  }

  return parseLanguageFromCookieHeader(document.cookie)
}

function interpolate(text: string, vars?: TranslateVars): string {
  if (!vars) {
    return text
  }

  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/**
 * English source strings are the dictionary keys. A missing Russian entry
 * simply falls back to the English text, so partially translated screens
 * keep working.
 */
export function translate(
  language: Language,
  text: string,
  vars?: TranslateVars,
): string {
  const translated =
    language === 'ru' ? (RU_DICTIONARY[text] ?? text) : text

  return interpolate(translated, vars)
}

type RussianForms = { one: string; few: string; many: string }
type EnglishForms = { one: string; other: string }

/**
 * `{count} {noun}` with the right plural form for the language:
 * pluralize('ru', 3, { one: 'step', other: 'steps' }, { one: 'шаг', few: 'шага', many: 'шагов' })
 * → '3 шага'.
 */
export function pluralize(
  language: Language,
  count: number,
  en: EnglishForms,
  ru: RussianForms,
): string {
  if (language === 'en') {
    return `${count} ${count === 1 ? en.one : en.other}`
  }

  const mod10 = Math.abs(count) % 10
  const mod100 = Math.abs(count) % 100
  const form =
    mod10 === 1 && mod100 !== 11
      ? ru.one
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? ru.few
        : ru.many

  return `${count} ${form}`
}
