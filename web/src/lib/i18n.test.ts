import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LANGUAGE,
  parseLanguageFromCookieHeader,
  pluralize,
  translate,
} from './i18n-core'

const STEP_EN = { one: 'step', other: 'steps' }
const STEP_RU = { one: 'шаг', few: 'шага', many: 'шагов' }

describe('translate', () => {
  it('keeps English source strings and interpolates variables', () => {
    expect(translate('en', 'Save')).toBe('Save')
    expect(translate('en', 'Token OK — {name}', { name: 'Ivan' })).toBe('Token OK — Ivan')
  })

  it('translates to Russian and falls back to the English text', () => {
    expect(translate('ru', 'Save')).toBe('Сохранить')
    expect(translate('ru', 'Token OK — {name}', { name: 'Ivan' })).toBe(
      'Токен работает — Ivan',
    )
    expect(translate('ru', 'Some brand new string')).toBe('Some brand new string')
  })

  it('uses inverted Russian → English parts for English source strings', () => {
    expect(translate('ru', 'No links yet.')).toBe('Ссылок пока нет.')
  })
})

describe('pluralize', () => {
  it('uses English singular and plural', () => {
    expect(pluralize('en', 1, STEP_EN, STEP_RU)).toBe('1 step')
    expect(pluralize('en', 0, STEP_EN, STEP_RU)).toBe('0 steps')
    expect(pluralize('en', 5, STEP_EN, STEP_RU)).toBe('5 steps')
  })

  it('uses the three Russian forms', () => {
    const ru = (count: number) => pluralize('ru', count, STEP_EN, STEP_RU)

    expect([1, 21, 101].map(ru)).toEqual(['1 шаг', '21 шаг', '101 шаг'])
    expect([2, 3, 4, 22, 104].map(ru)).toEqual([
      '2 шага',
      '3 шага',
      '4 шага',
      '22 шага',
      '104 шага',
    ])
    expect([0, 5, 11, 12, 14, 111, 25].map(ru)).toEqual([
      '0 шагов',
      '5 шагов',
      '11 шагов',
      '12 шагов',
      '14 шагов',
      '111 шагов',
      '25 шагов',
    ])
  })
})

describe('parseLanguageFromCookieHeader', () => {
  it('reads the tms-lang cookie and defaults to English', () => {
    expect(DEFAULT_LANGUAGE).toBe('en')
    expect(parseLanguageFromCookieHeader('a=1; tms-lang=ru; b=2')).toBe('ru')
    expect(parseLanguageFromCookieHeader('tms-lang=de')).toBe('en')
    expect(parseLanguageFromCookieHeader(undefined)).toBe('en')
  })
})
