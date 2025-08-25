import PDFMerger from 'pdf-merger-js';

/**
 * Mescla múltiplos arquivos PDF em um único documento
 * @param {Array} files - Array de objetos de arquivo com buffer
 * @returns {Buffer} Buffer do PDF mesclado
 */
const mergePdfs = async (files) => {
  const merger = new PDFMerger();
  
  for (const file of files) {
    await merger.add(file.buffer);
  }

  return merger.saveAsBuffer();
};

export { mergePdfs };
export default mergePdfs;