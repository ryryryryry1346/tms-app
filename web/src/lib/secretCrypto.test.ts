import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decryptSecret, encryptSecret } from './secretCrypto'

const TEST_KEY = 'gIVAXEpK6kwRbCM6ZY0LpXvoSAl23Gk1vVle+t0dIH0='

describe('encryptSecret / decryptSecret', () => {
  const originalEnv = process.env.INTEGRATION_ENCRYPTION_KEY

  beforeEach(() => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY
  })

  afterEach(() => {
    process.env.INTEGRATION_ENCRYPTION_KEY = originalEnv
    vi.restoreAllMocks()
  })

  it('round-trips a plaintext value', () => {
    const encrypted = encryptSecret('super-secret-shortcut-token')
    expect(encrypted).not.toBe('super-secret-shortcut-token')
    expect(encrypted.startsWith('encv1:')).toBe(true)
    expect(decryptSecret(encrypted)).toBe('super-secret-shortcut-token')
  })

  it('produces a different ciphertext each time (random IV)', () => {
    const a = encryptSecret('same-input')
    const b = encryptSecret('same-input')
    expect(a).not.toBe(b)
    expect(decryptSecret(a)).toBe('same-input')
    expect(decryptSecret(b)).toBe('same-input')
  })

  it('passes through legacy plaintext values unchanged (no encv1: prefix)', () => {
    expect(decryptSecret('old-plaintext-token')).toBe('old-plaintext-token')
  })

  it('passes through null/undefined unchanged', () => {
    expect(decryptSecret(null)).toBeNull()
    expect(decryptSecret(undefined)).toBeNull()
    expect(decryptSecret('')).toBe('')
  })

  it('derives a usable key from a non-32-byte INTEGRATION_ENCRYPTION_KEY instead of crashing', () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = 'not-a-proper-length-key'
    const encrypted = encryptSecret('value')
    expect(decryptSecret(encrypted)).toBe('value')
  })

  it('throws a clear error when INTEGRATION_ENCRYPTION_KEY is missing and a value needs encrypting', () => {
    delete process.env.INTEGRATION_ENCRYPTION_KEY
    expect(() => encryptSecret('value')).toThrow(/INTEGRATION_ENCRYPTION_KEY/)
  })

  it('logs and returns null (instead of throwing) when a stored value fails to decrypt - e.g. the key rotated', () => {
    const encrypted = encryptSecret('value')
    process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
    expect(decryptSecret(encrypted)).toBeNull()
  })
})
