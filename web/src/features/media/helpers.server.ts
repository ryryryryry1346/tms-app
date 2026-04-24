import { Buffer } from 'node:buffer'
import { v2 as cloudinary } from 'cloudinary'

function sanitizeCloudinaryValue(value: string | undefined): string | undefined {
  if (!value) {
    return value
  }

  const decodedValue = decodeURIComponent(value.trim())

  return decodedValue.replace(/^<+/, '').replace(/>+$/, '')
}

function ensureCloudinaryConfigured(): void {
  const cloudName = sanitizeCloudinaryValue(process.env.CLOUDINARY_CLOUD_NAME)
  const apiKey = sanitizeCloudinaryValue(process.env.CLOUDINARY_API_KEY)
  const apiSecret = sanitizeCloudinaryValue(process.env.CLOUDINARY_API_SECRET)
  const cloudinaryUrl = process.env.CLOUDINARY_URL

  if (
    !cloudinaryUrl &&
    (!cloudName || !apiKey || !apiSecret)
  ) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_URL or the explicit CLOUDINARY_* variables.',
    )
  }

  if (cloudinaryUrl) {
    const parsedUrl = new URL(cloudinaryUrl)
    const parsedCloudName = sanitizeCloudinaryValue(parsedUrl.hostname)
    const parsedApiKey = sanitizeCloudinaryValue(parsedUrl.username)
    const parsedApiSecret = sanitizeCloudinaryValue(parsedUrl.password)

    if (!parsedCloudName || !parsedApiKey || !parsedApiSecret) {
      throw new Error(
        'Cloudinary URL is invalid. Check cloud name, api key, and api secret.',
      )
    }

    cloudinary.config({
      cloud_name: parsedCloudName,
      api_key: parsedApiKey,
      api_secret: parsedApiSecret,
      secure: true,
    })
    return
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
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
