import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Convert PDF document to images
 * @param {Buffer} pdfBuffer - PDF buffer
 * @param {string} outputFormat - Output format (jpeg, png, webp)
 * @param {Object} options - Conversion options
 * @returns {Array} Array of image buffers
 */
async function pdfToImages(pdfBuffer, outputFormat = 'jpeg', options = {}) {
  try {
    // Validate output format
    const supportedOutputFormats = ['jpeg', 'png', 'webp'];
    if (!supportedOutputFormats.includes(outputFormat.toLowerCase())) {
      throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    // Get page range to convert
    const { startPage = 0, endPage = pageCount - 1, dpi = 300 } = options;
    
    // Validate page range
    if (startPage < 0 || startPage >= pageCount) {
      throw new Error(`Invalid start page: ${startPage}. Document has ${pageCount} pages.`);
    }
    
    if (endPage < startPage || endPage >= pageCount) {
      throw new Error(`Invalid end page: ${endPage}. Document has ${pageCount} pages.`);
    }
    
    // Create a temporary directory for processing
    const tempDir = path.join(__dirname, '..', '..', 'temp', `pdf-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    try {
      // Write PDF to temporary file
      const tempPdfPath = path.join(tempDir, 'temp.pdf');
      await fs.writeFile(tempPdfPath, pdfBuffer);
      
      // Convert pages to images
      const imageBuffers = [];
      
      for (let i = startPage; i <= endPage; i++) {
        // Use sharp to convert PDF page to image
        const sharpInstance = sharp(tempPdfPath, { 
          page: i,
          density: dpi
        });
        
        // Set output format
        switch (outputFormat.toLowerCase()) {
          case 'jpeg':
            sharpInstance.jpeg({ quality: options.quality || 90 });
            break;
          case 'png':
            sharpInstance.png({ compressionLevel: options.compressionLevel || 6 });
            break;
          case 'webp':
            sharpInstance.webp({ quality: options.quality || 90 });
            break;
          default:
            sharpInstance.jpeg({ quality: options.quality || 90 });
        }
        
        // Generate image buffer
        const imageBuffer = await sharpInstance.toBuffer();
        imageBuffers.push({
          pageNumber: i + 1,
          buffer: imageBuffer,
          format: outputFormat
        });
      }
      
      return imageBuffers;
    } finally {
      // Clean up temporary directory
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  } catch (error) {
    throw new Error(`PDF to image conversion failed: ${error.message}`);
  }
}

export { pdfToImages };
export default pdfToImages;