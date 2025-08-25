import Tesseract from 'tesseract.js';

/**
 * Extract text from image using OCR
 * @param {Buffer} buffer - Image buffer
 * @param {string} language - Language code (por, eng, spa, etc.)
 * @returns {Object} OCR result with text and confidence
 */
const processOcr = async (buffer, language = 'por') => {
  try {
    const result = await Tesseract.recognize(
      buffer,
      language,
      {
        logger: info => console.log(info)
      }
    );
    
    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  } catch (error) {
    throw new Error(`OCR processing failed: ${error.message}`);
  }
};

export { processOcr };
export default processOcr;