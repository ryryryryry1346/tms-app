/**
 * At-rest encryption for secrets stored in the database (e.g. the Shortcut
 * API token in `project_shortcut_settings`). Uses AES-256-GCM with a key derived from
 * INTEGRATION_ENCRYPTION_KEY — a dedicated secret, deliberately separate
 * from BETTER_AUTH_SECRET, so rotating one never affects the other.
 *
 * Stored format: `encv1:<iv base64>:<authTag base64>:<ciphertext base64>`.
 * Values that don't start with that prefix are treated as legacy plaintext
 * (saved before this was introduced) and returned unchanged by decrypt() -
 * they get re-encrypted automatically the next time they're saved.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { logger, serializeError } from './logger'

const ALGO = 'aes-256-gcm'
const PREFIX = 'encv1:'
const IV_LENGTH = 12

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY is not configured on the server. ' +
        'Set it (see web/.env.example) before saving integration secrets.',
    )
  }

  // Accept a proper 32-byte key (base64-encoded); otherwise derive a stable
  // 32-byte key via SHA-256 so an operator can't silently break things by
  // pasting a value of the wrong length.
  const asBase64 = Buffer.from(raw, 'base64')
  if (asBase64.length === 32) {
    return asBase64
  }
  return createHash('sha256').update(raw).digest()
}

export function encryptSecret(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`
}

/**
 * Decrypts a value previously produced by encryptSecret(). Returns the
 * original legacy value unchanged if it predates encryption, and null (with
 * a logged error) if it looks encrypted but fails to decrypt - e.g. the key
 * changed - so callers see "not configured" rather than a raw crash.
 */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) {
    return stored ?? null
  }

  if (!stored.startsWith(PREFIX)) {
    return stored
  }

  try {
    const [, ivB64, tagB64, dataB64] = stored.split(':')
    const key = getKey()
    const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ])
    return plaintext.toString('utf8')
  } catch (error) {
    logger.error('Failed to decrypt stored secret', serializeError(error))
    return null
  }
}
