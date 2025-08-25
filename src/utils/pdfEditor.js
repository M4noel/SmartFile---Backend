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
 * @param {Buffer} pdfBuffer - Buffer do PDF a ser editado
 * @param {Array} operations - Array de operações a serem realizadas
 * @returns {Promise<Buffer>} Buffer do PDF editado
 */
export async function editPdf(pdfBuffer, operations) {
  console.log('Iniciando função editPdf');
  console.log('Tipo de pdfBuffer:', typeof pdfBuffer);
  console.log('É Buffer?', Buffer.isBuffer(pdfBuffer));
  console.log('Tamanho do buffer:', pdfBuffer ? pdfBuffer.length : 'N/A');
  console.log('Operações recebidas (raw):', operations);
  
  // Verifica se o buffer do PDF é válido
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    console.error('Erro: Buffer de PDF inválido');
    throw new Error('Buffer de PDF inválido');
  }

  // Normaliza as operações para garantir que temos um array
  let normalizedOperations = [];
  
  // Se operations for um array, usa diretamente
  if (Array.isArray(operations)) {
    normalizedOperations = operations;
  } else if (typeof operations === 'object' && operations !== null) {
    // Se for um objeto único, coloca em um array
    normalizedOperations = [operations];
    console.log('Convertendo operação única para array');
  } else if (typeof operations === 'string') {
    // Se for uma string, tenta parsear como JSON
    try {
      const parsed = JSON.parse(operations);
      normalizedOperations = Array.isArray(parsed) ? parsed : [parsed];
      console.log('Operações parseadas de string JSON');
    } catch (error) {
      console.error('Erro ao parsear operações como JSON:', error);
      throw new Error('Formato de operações inválido');
    }
  } else {
    console.error('Erro: Operações inválidas', operations);
    throw new Error('Operações inválidas');
  }
  
  console.log('Operações normalizadas:', JSON.stringify(normalizedOperations));
  
  // Verifica se temos operações válidas após normalização
  if (!normalizedOperations || normalizedOperations.length === 0) {
    console.error('Erro: Nenhuma operação válida após normalização');
    throw new Error('Nenhuma operação válida');
  }

  let currentBuffer = pdfBuffer;

  try {
    // Verifica se o buffer é um PDF válido
    const pdfDoc = await PDFDocument.load(currentBuffer);
    console.log('PDF carregado com sucesso. Número de páginas:', pdfDoc.getPageCount());
  } catch (error) {
    console.error('Erro ao carregar o PDF:', error);
    throw new Error(`Arquivo PDF inválido: ${error.message}`);
  }

  // Processa cada operação sequencialmente
  for (let i = 0; i < normalizedOperations.length; i++) {
    const operation = normalizedOperations[i];
    console.log(`Processando operação ${i}:`, JSON.stringify(operation));
    
    // Garantir que a operação seja um objeto válido
    if (typeof operation !== 'object' || operation === null) {
      console.error(`Erro: Operação ${i} inválida, não é um objeto:`, operation);
      throw new Error(`Formato de operação inválido na posição ${i}`);
    }
    
    // Verificar se o tipo de operação está definido
    if (!operation.type && !operation.operationType) {
      console.error(`Erro: Operação ${i} não tem um tipo definido:`, JSON.stringify(operation));
      throw new Error(`Operação na posição ${i} não tem um tipo definido`);
    }
    
    // Usar operationType se type não estiver definido
    let type = '';
    if (operation.type) {
      type = operation.type;
      console.log(`Tipo de operação encontrado em operation.type: ${type}`);
    } else if (operation.operationType) {
      type = operation.operationType;
      console.log(`Tipo de operação encontrado em operation.operationType: ${type}`);
    }
    
    console.log(`Tipo de operação ${i}:`, type);
    console.log(`Operação completa ${i}:`, JSON.stringify(operation));
    
    try {
      // Imprime o tipo de operação para depuração
      console.log(`Executando operação do tipo: '${type}'`);
      
      // Verifica o tipo de operação e executa a ação correspondente
      console.log('Verificando tipo de operação:', type, 'Tipo de dados:', typeof type);
      
      // Garantir que o tipo seja uma string
      const operationType = String(type).toLowerCase().trim();
      console.log('Tipo de operação normalizado:', operationType);
      
      // Verifica se o tipo de operação é suportado
      if (!operationType) {
        console.error('Tipo de operação indefinido:', JSON.stringify(operation));
        throw new Error('Operação sem tipo definido');
      }
      
      if (operationType === 'rotate') {
        if (!operation.rotations || !Array.isArray(operation.rotations)) {
          throw new Error('Parâmetro rotations inválido ou ausente');
        }
        console.log('Aplicando rotação com parâmetros:', JSON.stringify(operation.rotations));
        currentBuffer = await PdfEditor.rotatePages(currentBuffer, operation.rotations);
        console.log('Rotação aplicada com sucesso');
      } 
      else if (operationType === 'split') {
        if (!operation.ranges || !Array.isArray(operation.ranges)) {
          throw new Error('Parâmetro ranges inválido ou ausente');
        }
        console.log('Aplicando divisão com parâmetros:', JSON.stringify(operation.ranges));
        // Para split, retornamos apenas o primeiro intervalo por padrão
        const splitResults = await PdfEditor.splitPdf(currentBuffer, operation.ranges);
        if (splitResults && splitResults.length > 0) {
          currentBuffer = splitResults[0].buffer;
          console.log('Divisão aplicada com sucesso');
        } else {
          throw new Error('Falha ao dividir o PDF: nenhum resultado obtido');
        }
      } 
      else if (operationType === 'addpassword') {
        if (!operation.password) {
          throw new Error('Parâmetro password ausente');
        }
        console.log('Aplicando senha');
        currentBuffer = await PdfEditor.addPassword(
          currentBuffer, 
          operation.password, 
          operation.options
        );
        console.log('Senha adicionada com sucesso');
      } 
      else if (operationType === 'removepassword') {
        if (!operation.password) {
          throw new Error('Parâmetro password ausente');
        }
        console.log('Removendo senha');
        currentBuffer = await PdfEditor.removePassword(currentBuffer, operation.password);
        console.log('Senha removida com sucesso');
      } 
      else {
        console.error(`Erro: Operação não suportada: '${type}' (normalizado: '${operationType}')`);        throw new Error(`Operação não suportada: ${operationType}`);
      }
    } catch (error) {
      console.error(`Erro ao processar operação ${type}:`, error);
      throw new Error(`Falha na operação ${type}: ${error.message}`);
    }
  }

  console.log('Edição de PDF concluída com sucesso');
  return currentBuffer;
}

export default PdfEditor;