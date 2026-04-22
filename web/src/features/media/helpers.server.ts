import { Buffer } from 'node:buffer'
import { v2 as cloudinary } from 'cloudinary'

function ensureCloudinaryConfigured(): void {
  if (
    !process.env.CLOUDINARY_URL &&
    (!process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET)
  ) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_URL or the explicit CLOUDINARY_* variables.',
    )
  }

  cloudinary.config({
    secure: true,
  })
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  ensureCloudinaryConfigured()

  if (!file.type.startsWith('image/')) {
    throw new Error('Only image uploads are supported in the migrated create test flow.')
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }

        if (!result?.secure_url) {
          reject(new Error('Cloudinary did not return a secure_url.'))
          return
        }

        resolve(result.secure_url)
      },
    )

    stream.end(fileBuffer)
  })
}
