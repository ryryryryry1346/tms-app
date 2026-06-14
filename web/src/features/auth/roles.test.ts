import { describe, expect, it } from 'vitest'
import { isProjectRole, roleAtLeast } from './roles'

describe('isProjectRole', () => {
  it('accepts known roles', () => {
    expect(isProjectRole('owner')).toBe(true)
    expect(isProjectRole('editor')).toBe(true)
    expect(isProjectRole('viewer')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isProjectRole('admin')).toBe(false)
    expect(isProjectRole('')).toBe(false)
    expect(isProjectRole(null)).toBe(false)
    expect(isProjectRole(undefined)).toBe(false)
    expect(isProjectRole(3)).toBe(false)
  })
})

describe('roleAtLeast', () => {
  it('owner satisfies every minimum', () => {
    expect(roleAtLeast('owner', 'owner')).toBe(true)
    expect(roleAtLeast('owner', 'editor')).toBe(true)
    expect(roleAtLeast('owner', 'viewer')).toBe(true)
  })

  it('editor satisfies editor and viewer but not owner', () => {
    expect(roleAtLeast('editor', 'owner')).toBe(false)
    expect(roleAtLeast('editor', 'editor')).toBe(true)
    expect(roleAtLeast('editor', 'viewer')).toBe(true)
  })

  it('viewer satisfies only viewer', () => {
    expect(roleAtLeast('viewer', 'owner')).toBe(false)
    expect(roleAtLeast('viewer', 'editor')).toBe(false)
    expect(roleAtLeast('viewer', 'viewer')).toBe(true)
  })
})
