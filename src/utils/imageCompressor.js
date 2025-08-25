import sharp from 'sharp';

/**
 * Compress an image buffer
 * @param {Buffer} imageBuffer - The image buffer to compress
 * @param {Object} options - Compression options
 * @param {number} options.quality - JPEG/WebP/AVIF quality (1-100)
 * @param {string} options.format - Output format (jpeg, png, webp, avif)
 * @returns {Buffer} Compressed image buffer
 */
async function compressImage(imageBuffer, options = {}) {
  const { quality = 80, format = 'jpeg' } = options;

  try {
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Invalid image buffer');
    }

    let sharpInstance = sharp(imageBuffer);

    const metadata = await sharpInstance.metadata();
    if (!metadata.format) {
      throw new Error('Unsupported image format');
    }

    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({
          compressionLevel: Math.min(9, Math.floor(quality / 10)),
        });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'avif':
        sharpInstance = sharpInstance.avif({ quality });
        break;
      default:
        sharpInstance = sharpInstance.jpeg({ quality });
    }

    return await sharpInstance.toBuffer();
  } catch (error) {
    throw new Error(`Failed to compress image: ${error.message}`);
  }
}

export { compressImage };

export default compressImage;