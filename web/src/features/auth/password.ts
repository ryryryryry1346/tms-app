import {
  pbkdf2 as nodePbkdf2,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(nodeScrypt)
const pbkdf2 = promisify(nodePbkdf2)

const DEFAULT_SCRYPT_N = 32768
const DEFAULT_SCRYPT_R = 8
const DEFAULT_SCRYPT_P = 1
const DEFAULT_KEY_LENGTH = 32
const DEFAULT_PBKDF2_DIGEST = 'sha256'
const DEFAULT_PBKDF2_ITERATIONS = 600000

function encodeHex(buffer: Buffer): string {
  return buffer.toString('hex')
}

function decodeHex(value: string): Buffer {
  return Buffer.from(value, 'hex')
}

async function deriveScryptHash(
  password: string,
  salt: string,
  keyLength: number,
  options?: {
    N?: number
    r?: number
    p?: number
  },
): Promise<Buffer> {
  return (await scrypt(password, salt, keyLength, options)) as Buffer
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await pbkdf2(
    password,
    salt,
    DEFAULT_PBKDF2_ITERATIONS,
    DEFAULT_KEY_LENGTH,
    DEFAULT_PBKDF2_DIGEST,
  )

  return `pbkdf2:${DEFAULT_PBKDF2_DIGEST}:${DEFAULT_PBKDF2_ITERATIONS}$${salt}$${encodeHex(derivedKey)}`
}

async function verifyWerkzeugScryptHash(
  password: string,
  method: string,
  salt: string,
  storedHash: string,
): Promise<boolean> {
  const [, nString, rString, pString] = method.split(':')
  const derivedKey = await deriveScryptHash(
    password,
    salt,
    storedHash.length / 2,
    {
      N: Number(nString),
      r: Number(rString),
      p: Number(pString),
    },
  )

  return timingSafeEqual(derivedKey, decodeHex(storedHash))
}

async function verifyWerkzeugPbkdf2Hash(
  password: string,
  method: string,
  salt: string,
  storedHash: string,
): Promise<boolean> {
  const [, digest = 'sha256', iterationsString = '1000000'] = method.split(':')
  const iterations = Number(iterationsString)
  const keyLength = storedHash.length / 2
  const key = await pbkdf2(
    password,
    salt,
    iterations,
    keyLength,
    digest,
  )

  return timingSafeEqual(key, decodeHex(storedHash))
}

export async function verifyPassword(
  password: string,
  storedPasswordHash: string,
): Promise<boolean> {
  const parts = storedPasswordHash.split('$')

  if (parts.length !== 3) {
    return false
  }

  const [method, salt, storedHash] = parts

  if (method.startsWith('scrypt:')) {
    return verifyWerkzeugScryptHash(password, method, salt, storedHash)
  }

  if (method.startsWith('pbkdf2:')) {
    return verifyWerkzeugPbkdf2Hash(password, method, salt, storedHash)
  }

  return false
}
