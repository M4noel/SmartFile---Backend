import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import config from '../config/env.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '..', '..', config.tempStorage.dir || 'temp');
fs.mkdir(tempDir, { recursive: true }).catch(console.error);

// Schedule cleanup job (every hour)
cron.schedule('0 * * * *', async () => {
  try {
    const files = await fs.readdir(tempDir);
    const now = Date.now();
    const expiryTime = config.tempStorage.expiry || 24 * 60 * 60 * 1000; // 24 hours default
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);
      
      // Delete files older than expiry time
      if (now - stats.mtimeMs > expiryTime) {
        await fs.unlink(filePath);
        console.log(`Deleted expired file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});

/**
 * Store file temporarily
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @returns {Object} Stored file info
 */
async function storeFile(buffer, filename) {
  const fileId = uuidv4();
  const storedFilename = `${fileId}-${filename}`;
  const filePath = path.join(tempDir, storedFilename);
  
  await fs.writeFile(filePath, buffer);
  
  return {
    id: fileId,
    filename: storedFilename,
    originalName: filename,
    path: filePath,
    createdAt: new Date()
  };
}

/**
 * Retrieve stored file
 * @param {string} fileId - File ID
 * @returns {Object} File info and buffer
 */
async function retrieveFile(fileId) {
  // Find file by ID
  const files = await fs.readdir(tempDir);
  const storedFile = files.find(file => file.startsWith(`${fileId}-`));
  
  if (!storedFile) {
    throw new Error('File not found or expired');
  }
  
  const filePath = path.join(tempDir, storedFile);
  const buffer = await fs.readFile(filePath);
  
  return {
    buffer,
    filename: storedFile,
    originalName: storedFile.substring(storedFile.indexOf('-') + 1)
  };
}

/**
 * Delete stored file
 * @param {string} fileId - File ID
 */
async function deleteFile(fileId) {
  const files = await fs.readdir(tempDir);
  const storedFile = files.find(file => file.startsWith(`${fileId}-`));
  
  if (storedFile) {
    const filePath = path.join(tempDir, storedFile);
    await fs.unlink(filePath);
  }
}

export { storeFile, retrieveFile, deleteFile };

export default {
  storeFile,
  retrieveFile,
  deleteFile
};