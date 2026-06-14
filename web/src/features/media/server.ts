import { createServerFn } from '@tanstack/react-start'
import { logger, serializeError } from '../../lib/logger'

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

export const uploadTestMedia = createServerFn({ method: 'POST' })
  .inputValidator((data: FormData) => data)
  .handler(
  async ({ data }): Promise<{ url: string }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const { uploadMediaToCloudinary } = await import('./helpers.server')

    await requireSessionUser()

    const form = data as unknown as FormData

    if (!(form instanceof FormData)) {
      throw new Error('Upload request must be sent as FormData.')
    }

    const file = form.get('file')

    if (!(file instanceof File)) {
      throw new Error('Upload request is missing the file field.')
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('File is too large. Maximum size is 15 MB.')
    }

    try {
      const url = await uploadMediaToCloudinary(file)

      return { url }
    } catch (error) {
      logger.error('uploadTestMedia failed', {
        name: file.name,
        type: file.type,
        size: file.size,
        ...serializeError(error),
      })

      throw error
    }
  },
)
