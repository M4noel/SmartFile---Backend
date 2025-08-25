import sharp from 'sharp';

/**
 * Convert image between formats
 * @param {Buffer} buffer - Image buffer
 * @param {string} format - Target format (jpeg, png, webp, etc.)
 * @param {Object} options - Format-specific options
 * @returns {Buffer} Converted image buffer
 */
const convertImage = async (buffer, format, options = {}) => {
  const sharpInstance = sharp(buffer);
  
  // Apply format-specific options
  switch (format.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      sharpInstance.jpeg({ quality: options.quality || 80 });
      break;
    case 'png':
      sharpInstance.png({ compressionLevel: options.compressionLevel || 6 });
      break;
    case 'webp':
      sharpInstance.webp({ quality: options.quality || 80 });
      break;
    case 'tiff':
      sharpInstance.tiff({ quality: options.quality || 80 });
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
  
  return await sharpInstance.toBuffer();
};

export { convertImage };
export default convertImage;