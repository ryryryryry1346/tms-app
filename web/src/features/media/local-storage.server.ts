import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

/**
 * Local disk storage for uploaded media (STORAGE_DRIVER=local).
 *
 * Files are written to MEDIA_STORAGE_DIR (default: ./storage/media relative
 * to the app's working directory) as <yyyy>/<mm>/<uuid>.<ext> and served by
 * the /api/media/$ route to signed-in users only.
 */

export const MEDIA_URL_PREFIX = '/api/media/'

// Only these types are accepted. The extension (and therefore the
// Content-Type the file is served with) comes from this list, never from the
// uploaded file name, so an upload cannot make the server send e.g. HTML.
const MEDIA_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/ogg': 'ogv',
}

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(MEDIA_TYPES).map(([contentType, extension]) => [
    extension,
    contentType,
  ]),
)

const STORED_PATH_PATTERN =
  /^(\d{4})\/(\d{2})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([a-z0-9]{2,5})$/

export const SUPPORTED_LOCAL_MEDIA_LABEL =
  'PNG, JPEG, GIF, WebP, AVIF, BMP, MP4, WebM, MOV, OGG'

export function getMediaStorageDir(): string {
  const configured = process.env.MEDIA_STORAGE_DIR?.trim()

  return resolve(configured || join('storage', 'media'))
}

export async function saveMediaToLocalStorage(file: File): Promise<string> {
  const extension = MEDIA_TYPES[file.type]

  if (!extension) {
    throw new Error(
      `This file type is not supported. Allowed: ${SUPPORTED_LOCAL_MEDIA_LABEL}.`,
    )
  }

  const now = new Date()
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const fileName = `${randomUUID()}.${extension}`
  const directory = join(getMediaStorageDir(), year, month)

  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, fileName), Buffer.from(await file.arrayBuffer()), {
    flag: 'wx',
  })

  return `${MEDIA_URL_PREFIX}${year}/${month}/${fileName}`
}

/**
 * Maps the part of the URL after /api/media/ to a file on disk. Returns null
 * for anything that is not exactly a path this module could have written,
 * which rules out path traversal.
 */
export function resolveLocalMediaPath(
  relativePath: string,
): { filePath: string; contentType: string } | null {
  const match = STORED_PATH_PATTERN.exec(relativePath)

  if (!match) {
    return null
  }

  const extension = match[4]
  const contentType = CONTENT_TYPE_BY_EXTENSION[extension]

  if (!contentType) {
    return null
  }

  const root = getMediaStorageDir()
  const filePath = resolve(root, match[1], match[2], `${match[3]}.${extension}`)

  if (!filePath.startsWith(root + sep)) {
    return null
  }

  return { filePath, contentType }
}
