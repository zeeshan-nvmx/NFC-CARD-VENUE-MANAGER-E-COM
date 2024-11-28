// utils/image.js
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const sharp = require('sharp')
const crypto = require('crypto')
const path = require('path')

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
})

// Generate unique filename
const generateFileName = (originalname) => {
  const timestamp = Date.now()
  const hashedFileName = crypto.createHash('md5').update(`${timestamp}-${originalname}`).digest('hex')
  return `${hashedFileName}${path.extname(originalname)}`
}

// Process image and create thumbnail
async function processImage(buffer, width = 800, height = 600) {
  try {
    const processedImage = await sharp(buffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer()

    const thumbnail = await sharp(buffer)
      .resize(200, 200, {
        fit: 'cover',
      })
      .toBuffer()

    return {
      processedImage,
      thumbnail,
    }
  } catch (error) {
    console.error('Image processing error:', error)
    throw new Error('Failed to process image')
  }
}

const uploadToS3 = async (file, folder = '') => {
  try {
    const fileName = generateFileName(file.originalname)
    const key = folder ? `${folder}/${fileName}` : fileName
    const thumbnailKey = folder ? `${folder}/thumbnails/${fileName}` : `thumbnails/${fileName}`

    // Process image and create thumbnail
    const { processedImage, thumbnail } = await processImage(file.buffer)

    // Upload main image
    const mainImageParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: processedImage,
      ContentType: file.mimetype,
    }

    // Upload thumbnail
    const thumbnailParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: thumbnailKey,
      Body: thumbnail,
      ContentType: file.mimetype,
    }

    await Promise.all([s3.send(new PutObjectCommand(mainImageParams)), s3.send(new PutObjectCommand(thumbnailParams))])

    return {
      imageUrl: `https://${process.env.R2_PUBLIC_DOMAIN}/${key}`,
      thumbnailUrl: `https://${process.env.R2_PUBLIC_DOMAIN}/${thumbnailKey}`,
      key,
      thumbnailKey,
    }
  } catch (err) {
    console.error('R2 Upload Error:', {
      error: err.message,
      code: err.Code,
      requestId: err.$metadata?.requestId,
      statusCode: err.$metadata?.httpStatusCode,
    })
    throw new Error('Failed to upload image')
  }
}

const deleteFromS3 = async (key) => {
  try {
    if (!key) return

    const folder = path.dirname(key)
    const fileName = path.basename(key)
    const thumbnailKey = path.join(folder, 'thumbnails', fileName)

    // Delete both main image and thumbnail
    const deletePromises = [
      s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
        })
      ),
      s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: thumbnailKey,
        })
      ),
    ]

    await Promise.all(deletePromises)
    console.log('Successfully deleted image and thumbnail:', key)
  } catch (err) {
    console.error('Delete error:', err)
    throw new Error('Failed to delete image')
  }
}

// Add multer middleware configuration
const multer = require('multer')

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed!'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

const testR2Connection = async () => {
  try {
    const testKey = `test-${Date.now()}.txt`
    const testParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: testKey,
      Body: 'test connection',
      ContentType: 'text/plain',
    }

    await s3.send(new PutObjectCommand(testParams))
    console.log('Test upload successful')
    await deleteFromS3(testKey)
    return true
  } catch (error) {
    console.error('Connection test failed:', error)
    return false
  }
}

module.exports = {
  uploadToS3,
  deleteFromS3,
  testR2Connection,
  upload,
}
