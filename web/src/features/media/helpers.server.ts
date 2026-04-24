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

export async function uploadMediaToCloudinary(file: File): Promise<string> {
  ensureCloudinaryConfigured()

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  if (!isImage && !isVideo) {
    throw new Error(
      'Only image, GIF, and video uploads are supported in the test case editor.',
    )
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
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
