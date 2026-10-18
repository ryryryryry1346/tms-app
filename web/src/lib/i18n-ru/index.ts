import { RU_COMMON } from './common'
import { RU_PART1 } from './part1'
import { EN_PART, RU_PART2 } from './part2'
import { EN_PART3, RU_PART3 } from './part3'
import { EN_PART4 } from './part4'
import { RU_TMS_APP } from './tms-app'

/**
 * Parts EN_PART* were written for sources whose strings were Russian
 * (Russian → English). Here the sources are English, so they are inverted.
 */
function invert(dictionary: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [russian, english] of Object.entries(dictionary)) {
    if (!(english in result)) {
      result[english] = russian
    }
  }

  return result
}

// English source string → Russian. Later parts win over earlier ones.
export const RU_DICTIONARY: Record<string, string> = {
  ...invert(EN_PART),
  ...invert(EN_PART3),
  ...invert(EN_PART4),
  ...RU_COMMON,
  ...RU_PART1,
  ...RU_PART2,
  ...RU_PART3,
  ...RU_TMS_APP,
}
