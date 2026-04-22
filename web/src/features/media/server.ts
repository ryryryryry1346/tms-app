import { createServerFn } from '@tanstack/react-start'

export const uploadTestImage = createServerFn({ method: 'POST' }).handler(
  async ({ data }): Promise<{ url: string }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const { uploadImageToCloudinary } = await import('./helpers.server')

    await requireSessionUser()

    if (!(data instanceof FormData)) {
      throw new Error('Upload request must be sent as FormData.')
    }

    const file = data.get('file')

    if (!(file instanceof File)) {
      throw new Error('Upload request is missing the file field.')
    }

    const url = await uploadImageToCloudinary(file)

    return { url }
  },
)
