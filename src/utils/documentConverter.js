import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sharp from 'sharp';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supported formats
const SUPPORTED_INPUT_FORMATS = [
  'pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv', 
  'json', 'xml', 'html', 'md', 'jpg', 'jpeg', 'png', 'webp', 'tiff'
];

// Only support image output formats
const SUPPORTED_OUTPUT_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'tiff'];

/**
 * Detect file format from buffer or extension
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @returns {string} Detected format
 */
export async function detectFormat(buffer, filename) {
  try {
    // Try to detect from file extension first
    const ext = path.extname(filename).toLowerCase().slice(1);
    if (SUPPORTED_INPUT_FORMATS.includes(ext)) {
      return ext;
    }
    
    // Try to detect from buffer content
    const header = buffer.slice(0, 100).toString('hex');
    
    // PDF detection
    if (header.startsWith('25504446')) return 'pdf';
    
    // Image format detection
    if (header.startsWith('ffd8ffe0') || header.startsWith('ffd8ffe1') || 
        header.startsWith('ffd8ffe2') || header.startsWith('ffd8ffe3') || 
        header.startsWith('ffd8ffe8')) return 'jpg';
    
    if (header.startsWith('89504e47')) return 'png';
    
    if (header.startsWith('52494646') && buffer.slice(8, 12).toString('hex') === '57454250') return 'webp';
    
    if (header.startsWith('49492a00') || header.startsWith('4d4d002a')) return 'tiff';
    
    // Text-based formats (fallback)
    const text = buffer.toString('utf8', 0, 1000);
    
    // JSON detection
    try {
      JSON.parse(text.trim());
      return 'json';
    } catch {}
    
    // XML detection
    if (text.trim().startsWith('<?xml') || text.trim().startsWith('<')) {
      if (text.includes('<worksheet')) return 'xlsx';
      if (text.includes('<Presentation')) return 'pptx';
      if (text.includes('<w:document')) return 'docx';
      return 'xml';
    }
    
    // Markdown detection
    if (text.includes('# ') || text.includes('## ') || text.includes('### ')) {
      return 'md';
    }
    
    // CSV detection
    if (text.includes(',')) {
      const lines = text.split('\n');
      if (lines.length > 1) {
        const firstLineFields = lines[0].split(',').length;
        const secondLineFields = lines[1].split(',').length;
        if (firstLineFields === secondLineFields && firstLineFields > 1) {
          return 'csv';
        }
      }
    }
    
    // Default to text
    return 'txt';
  } catch (error) {
    console.error('Error detecting format:', error);
    // Fallback to extension-based detection
    const ext = path.extname(filename).toLowerCase().slice(1);
    return SUPPORTED_INPUT_FORMATS.includes(ext) ? ext : 'txt';
  }
}

/**
 * Convert document from one format to another
 * @param {Buffer} buffer - Input file buffer
 * @param {string} inputFormat - Input format
 * @param {string} outputFormat - Output format
 * @param {Object} options - Conversion options
 * @returns {Buffer} Converted file buffer
 */
export async function convertDocument(buffer, inputFormat, outputFormat, options = {}) {
  try {
    // Validate formats
    if (!SUPPORTED_INPUT_FORMATS.includes(inputFormat)) {
      throw new Error(`Unsupported input format: ${inputFormat}`);
    }
    
    if (!SUPPORTED_OUTPUT_FORMATS.includes(outputFormat)) {
      throw new Error(`Unsupported output format: ${outputFormat}`);
    }
    
    // Handle PDF to image conversion
    if (inputFormat === 'pdf' && ['jpg', 'jpeg', 'png', 'webp', 'tiff'].includes(outputFormat)) {
      return await convertPdfToImage(buffer, outputFormat, options);
    }
    
    // Handle image to image conversion
    if (['jpg', 'jpeg', 'png', 'webp', 'tiff'].includes(inputFormat) && 
        ['jpg', 'jpeg', 'png', 'webp', 'tiff'].includes(outputFormat)) {
      return await convertImage(buffer, outputFormat, options);
    }
    
    throw new Error(`Conversion from ${inputFormat} to ${outputFormat} is not supported yet`);
  } catch (error) {
    throw new Error(`Document conversion failed: ${error.message}`);
  }
}

/**
 * Convert PDF to image
 * @param {Buffer} pdfBuffer - PDF buffer
 * @param {string} outputFormat - Output image format
 * @param {Object} options - Conversion options
 * @returns {Buffer} Image buffer
 */
async function convertPdfToImage(pdfBuffer, outputFormat, options = {}) {
  try {
    const { pageNumber = 0, dpi = 300 } = options;
    
    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Validate page number
    const pageCount = pdfDoc.getPageCount();
    if (pageNumber >= pageCount) {
      throw new Error(`Invalid page number: ${pageNumber}. Document has ${pageCount} pages.`);
    }
    
    // For now, we'll use a simple approach with sharp
    // In a production environment, you might want to use a more robust solution like pdf2image
    
    // Create a temporary file for the PDF
    const tempPdfPath = path.join(__dirname, '..', '..', 'temp', `temp-${Date.now()}.pdf`);
    await fs.mkdir(path.dirname(tempPdfPath), { recursive: true });
    await fs.writeFile(tempPdfPath, pdfBuffer);
    
    // Use sharp to convert PDF to image
    // Note: This is a simplified approach and might not work for all PDFs
    // For a production environment, consider using a dedicated PDF to image library
    const sharpInstance = sharp(tempPdfPath, { page: pageNumber });
    
    // Set output format
    switch (outputFormat) {
      case 'jpg':
      case 'jpeg':
        sharpInstance.jpeg({ quality: options.quality || 90 });
        break;
      case 'png':
        sharpInstance.png({ compressionLevel: options.compressionLevel || 6 });
        break;
      case 'webp':
        sharpInstance.webp({ quality: options.quality || 90 });
        break;
      case 'tiff':
        sharpInstance.tiff({ quality: options.quality || 90 });
        break;
      default:
        sharpInstance.jpeg({ quality: options.quality || 90 });
    }
    
    // Generate image buffer
    const imageBuffer = await sharpInstance.toBuffer();
    
    // Clean up temporary file
    await fs.unlink(tempPdfPath).catch(() => {});
    
    return imageBuffer;
  } catch (error) {
    throw new Error(`PDF to image conversion failed: ${error.message}`);
  }
}

/**
 * Convert image from one format to another
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} outputFormat - Output format
 * @param {Object} options - Conversion options
 * @returns {Buffer} Converted image buffer
 */
async function convertImage(imageBuffer, outputFormat, options = {}) {
  try {
    let sharpInstance = sharp(imageBuffer);
    
    // Apply resize if specified
    if (options.width || options.height) {
      sharpInstance = sharpInstance.resize({
        width: options.width,
        height: options.height,
        fit: options.fit || 'contain',
        background: options.background || { r: 255, g: 255, b: 255, alpha: 1 }
      });
    }
    
    // Set output format
    switch (outputFormat) {
      case 'jpg':
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality: options.quality || 90 });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({
          compressionLevel: options.compressionLevel || 6
        });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality: options.quality || 90 });
        break;
      case 'tiff':
        sharpInstance = sharpInstance.tiff({ quality: options.quality || 90 });
        break;
      default:
        sharpInstance = sharpInstance.jpeg({ quality: options.quality || 90 });
    }
    
    return await sharpInstance.toBuffer();
  } catch (error) {
    throw new Error(`Image conversion failed: ${error.message}`);
  }
}

export default {
  detectFormat,
  convertDocument,
  SUPPORTED_INPUT_FORMATS,
  SUPPORTED_OUTPUT_FORMATS
};