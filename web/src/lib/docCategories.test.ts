import { describe, expect, it } from 'vitest'
import { GENERAL_DOC_CATEGORY, planCategorySeed } from './docCategories'

describe('planCategorySeed', () => {
  it('seeds the shipped defaults with General last', () => {
    const names = planCategorySeed([]).map((category) => category.name)

    expect(names).toEqual([
      'Runbook',
      'API',
      'Support',
      'Test data',
      'AWS',
      'Release',
      GENERAL_DOC_CATEGORY,
    ])
  })

  it('adds categories already used by docs, once, before General', () => {
    const names = planCategorySeed(['Security', 'security', 'API', 'general', 'Security ']).map(
      (category) => category.name,
    )

    expect(names).toEqual([
      'Runbook',
      'API',
      'Support',
      'Test data',
      'AWS',
      'Release',
      'Security',
      GENERAL_DOC_CATEGORY,
    ])
  })

  it('ignores empty and missing names', () => {
    const plan = planCategorySeed([null, undefined, '', '   '])

    expect(plan).toHaveLength(7)
  })
})
