import sharp from 'sharp';

/**
 * Resize image
 * @param {Buffer} buffer - Image buffer
 * @param {number} width - Target width
 * @param {number} height - Target height
 * @param {Object} options - Resize options
 * @returns {Buffer} Resized image buffer
 */
const resizeImage = async (buffer, width, height, options = {}) => {
  const sharpInstance = sharp(buffer);
  
  // Validate dimensions
  if (!width && !height) {
    throw new Error('Width or height must be provided');
  }
  
  // Apply resize options
  const resizeOptions = {
    width: width ? parseInt(width) : null,
    height: height ? parseInt(height) : null,
    fit: options.fit || 'inside',
    position: options.position || 'center',
    kernel: options.kernel || 'lanczos3',
    withoutEnlargement: options.withoutEnlargement || false
  };
  
  sharpInstance.resize(resizeOptions);
  
  // Apply format if specified
  if (options.format) {
    sharpInstance.toFormat(options.format);
  }
  
  return await sharpInstance.toBuffer();
};

export { resizeImage };
export default resizeImage;