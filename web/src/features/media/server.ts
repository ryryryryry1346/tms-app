import { createServerFn } from '@tanstack/react-start'

export const uploadTestMedia = createServerFn({ method: 'POST' }).handler(
  async ({ data }): Promise<{ url: string }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const { uploadMediaToCloudinary } = await import('./helpers.server')

    await requireSessionUser()

    if (!(data instanceof FormData)) {
      throw new Error('Upload request must be sent as FormData.')
    }

    const file = data.get('file')

    if (!(file instanceof File)) {
      throw new Error('Upload request is missing the file field.')
    }

    try {
      const url = await uploadMediaToCloudinary(file)

      return { url }
    } catch (error) {
      console.error('uploadTestMedia failed', {
        name: file.name,
        type: file.type,
        size: file.size,
        error,
      })

      throw error
    }
  },
)
