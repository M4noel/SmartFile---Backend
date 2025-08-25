import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

/**
 * Utilitário para edição de arquivos PDF
 */
class PdfEditor {
  /**
   * Rotaciona páginas de um PDF
   * @param {Buffer} pdfBuffer - Buffer do PDF
   * @param {Array} rotations - Array de {page: number, degrees: number}
   * @returns {Buffer} Buffer do PDF rotacionado
   */
  static async rotatePages(pdfBuffer, rotations) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      for (const rotation of rotations) {
        const pageIndex = rotation.page - 1; // 0-indexed
        
        // Verifica se o índice da página é válido
        if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
          throw new Error(`Página inválida: ${rotation.page}. O PDF tem ${pdfDoc.getPageCount()} páginas.`);
        }
        
        const page = pdfDoc.getPage(pageIndex);
        page.setRotation(degrees(rotation.degrees));
      }

      return await pdfDoc.save();
    } catch (error) {
      throw new Error(`Falha ao rotacionar páginas: ${error.message}`);
    }
  }

  /**
   * Divide um PDF em múltiplas partes
   * @param {Buffer} pdfBuffer - Buffer do PDF
   * @param {Array} ranges - Array de intervalos de páginas {start: number, end: number}
   * @returns {Array} Array de buffers de PDF
   */
  static async splitPdf(pdfBuffer, ranges) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      const results = [];
      
      for (const range of ranges) {
        const startPage = range.start - 1; // 0-indexed
        const endPage = range.end - 1; // 0-indexed
        
        // Verifica se o intervalo é válido
        if (startPage < 0 || endPage >= pageCount || startPage > endPage) {
          throw new Error(`Intervalo inválido: ${range.start}-${range.end}. O PDF tem ${pageCount} páginas.`);
        }
        
        // Cria um novo documento para este intervalo
        const newPdfDoc = await PDFDocument.create();
        
        // Copia as páginas do intervalo para o novo documento
        const copiedPages = await newPdfDoc.copyPages(pdfDoc, Array.from(
          { length: endPage - startPage + 1 }, (_, i) => startPage + i
        ));
        
        // Adiciona as páginas copiadas ao novo documento
        for (const page of copiedPages) {
          newPdfDoc.addPage(page);
        }
        
        // Salva o novo documento
        const newPdfBytes = await newPdfDoc.save();
        results.push({
          range: `${range.start}-${range.end}`,
          buffer: newPdfBytes
        });
      }
      
      return results;
    } catch (error) {
      throw new Error(`Falha ao dividir PDF: ${error.message}`);
    }
  }

  /**
   * Adiciona senha a um PDF
   * @param {Buffer} pdfBuffer - Buffer do PDF
   * @param {string} password - Senha a ser adicionada
   * @param {Object} options - Opções adicionais
   * @returns {Buffer} Buffer do PDF protegido
   */
  static async addPassword(pdfBuffer, password, options = {}) {
    try {
      const { userPassword = true, ownerPassword = false } = options;
      
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      if (userPassword) {
        pdfDoc.encrypt({
          userPassword: password,
          ownerPassword: ownerPassword ? password : undefined,
          permissions: {
            printing: 'highResolution',
            modifying: false,
            copying: false,
            annotating: false,
            fillingForms: true,
            contentAccessibility: true,
            documentAssembly: false,
          },
        });
      }
      
      return await pdfDoc.save();
    } catch (error) {
      throw new Error(`Falha ao adicionar senha ao PDF: ${error.message}`);
    }
  }

  /**
   * Remove senha de um PDF
   * @param {Buffer} pdfBuffer - Buffer do PDF
   * @param {string} password - Senha atual do PDF
   * @returns {Buffer} Buffer do PDF sem senha
   */
  static async removePassword(pdfBuffer, password) {
    try {
      // Carrega o PDF com a senha
      const pdfDoc = await PDFDocument.load(pdfBuffer, { password });
      
      // Cria um novo documento sem senha
      const newPdfDoc = await PDFDocument.create();
      
      // Copia todas as páginas para o novo documento
      const pages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
      
      // Adiciona as páginas ao novo documento
      for (const page of pages) {
        newPdfDoc.addPage(page);
      }
      
      // Salva o novo documento sem senha
      return await newPdfDoc.save();
    } catch (error) {
      throw new Error(`Falha ao remover senha do PDF: ${error.message}`);
    }
  }
}

/**
 * Função principal para edição de PDF que expõe as funcionalidades da classe PdfEditor
 * @param {Object} options - Opções para edição do PDF
 * @returns {Promise<Buffer>} Buffer do PDF editado
 */
export async function editPdf(options) {
  // Implementação da função que utiliza os métodos da classe PdfEditor
  // baseado nas opções fornecidas
  const { operation, pdfBuffer, ...params } = options;
  
  switch (operation) {
    case 'rotate':
      return await PdfEditor.rotatePages(pdfBuffer, params.rotations);
    case 'split':
      return await PdfEditor.splitPdf(pdfBuffer, params.ranges);
    case 'addPassword':
      return await PdfEditor.addPassword(pdfBuffer, params.password, params.options);
    case 'removePassword':
      return await PdfEditor.removePassword(pdfBuffer, params.password);
    default:
      throw new Error(`Operação não suportada: ${operation}`);
  }
}

export default PdfEditor;