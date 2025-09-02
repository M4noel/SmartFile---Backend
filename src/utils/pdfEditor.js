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

  /**
   * Remove páginas específicas de um PDF
   * @param {Buffer} pdfBuffer - Buffer do PDF
   * @param {Array<number>} pagesToRemove - Array com números das páginas a remover
   * @returns {Buffer} Buffer do PDF com páginas removidas
   */
  static async removePages(pdfBuffer, pagesToRemove) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      // Converter para índices baseados em 0 e ordenar
      const pagesToRemoveIndexes = pagesToRemove
        .map(pageNum => pageNum - 1)
        .filter(index => index >= 0 && index < pageCount)
        .sort((a, b) => b - a); // Ordenar decrescente para remover do final para o início
      
      // Remover páginas do final para o início para evitar problemas com índices
      for (const pageIndex of pagesToRemoveIndexes) {
        pdfDoc.removePage(pageIndex);
      }
      
      return await pdfDoc.save();
    } catch (error) {
      throw new Error(`Falha ao remover páginas: ${error.message}`);
    }
  }

  /**
   * Adiciona watermark a um PDF
   * @param {Buffer} pdfBuffer - Buffer do PDF
   * @param {string} watermarkText - Texto do watermark
   * @param {number} opacity - Opacidade (0-1)
   * @param {string} position - Posição ('center', 'top-left', 'top-right', 'bottom-left', 'bottom-right')
   * @param {number} width - Largura do watermark
   * @param {number} height - Altura do watermark
   * @returns {Buffer} Buffer do PDF com watermark
   */
  static async addWatermark(pdfBuffer, watermarkText, opacity = 0.5, position = 'center', width = 150, height = 150) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      // Calcular posição do watermark
      const getPosition = (pageWidth, pageHeight, watermarkWidth, watermarkHeight, pos) => {
        switch (pos) {
          case 'top-left':
            return { x: 50, y: pageHeight - watermarkHeight - 50 };
          case 'top-right':
            return { x: pageWidth - watermarkWidth - 50, y: pageHeight - watermarkHeight - 50 };
          case 'bottom-left':
            return { x: 50, y: 50 };
          case 'bottom-right':
            return { x: pageWidth - watermarkWidth - 50, y: 50 };
          case 'center':
          default:
            return { 
              x: (pageWidth - watermarkWidth) / 2, 
              y: (pageHeight - watermarkHeight) / 2 
            };
        }
      };
      
      // Adicionar watermark em todas as páginas
      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        const pos = getPosition(pageWidth, pageHeight, width, height, position);
        
        // Desenhar retângulo de fundo
        page.drawRectangle({
          x: pos.x,
          y: pos.y,
          width: width,
          height: height,
          color: rgb(1, 1, 1), // Branco
          opacity: 0.1
        });
        
        // Desenhar texto do watermark
        page.drawText(watermarkText, {
          x: pos.x + 10,
          y: pos.y + height / 2,
          size: Math.min(width, height) / 10,
          color: rgb(0, 0, 0), // Preto
          opacity: opacity
        });
      }
      
      return await pdfDoc.save();
    } catch (error) {
      throw new Error(`Falha ao adicionar watermark: ${error.message}`);
    }
  }

  /**
   * Adiciona watermark com imagem a um PDF
   * @param {Buffer} pdfBuffer - Buffer do PDF
   * @param {Buffer} imageBuffer - Buffer da imagem do watermark
   * @param {number} opacity - Opacidade (0-1)
   * @param {string} position - Posição ('center', 'top-left', 'top-right', 'bottom-left', 'bottom-right')
   * @param {number} width - Largura do watermark
   * @param {number} height - Altura do watermark
   * @returns {Buffer} Buffer do PDF com watermark de imagem
   */
  static async addImageWatermark(pdfBuffer, imageBuffer, opacity = 0.5, position = 'center', width = 150, height = 150) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      // Calcular posição do watermark
      const getPosition = (pageWidth, pageHeight, watermarkWidth, watermarkHeight, pos) => {
        switch (pos) {
          case 'top-left':
            return { x: 50, y: pageHeight - watermarkHeight - 50 };
          case 'top-right':
            return { x: pageWidth - watermarkWidth - 50, y: pageHeight - watermarkHeight - 50 };
          case 'bottom-left':
            return { x: 50, y: 50 };
          case 'bottom-right':
            return { x: pageWidth - watermarkWidth - 50, y: 50 };
          case 'center':
          default:
            return { 
              x: (pageWidth - watermarkWidth) / 2, 
              y: (pageHeight - watermarkHeight) / 2 
            };
        }
      };
      
      // Adicionar watermark em todas as páginas
      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        const pos = getPosition(pageWidth, pageHeight, width, height, position);
        
        // Tentar carregar a imagem como PNG primeiro, depois como JPEG
        let image;
        try {
          image = await pdfDoc.embedPng(imageBuffer);
        } catch (e) {
          try {
            image = await pdfDoc.embedJpg(imageBuffer);
          } catch (e2) {
            throw new Error('Formato de imagem não suportado para watermark. Use PNG ou JPEG.');
          }
        }
        
        // Desenhar a imagem como watermark
        page.drawImage(image, {
          x: pos.x,
          y: pos.y,
          width: width,
          height: height,
          opacity: opacity
        });
      }
      
      return await pdfDoc.save();
    } catch (error) {
      throw new Error(`Falha ao adicionar watermark com imagem: ${error.message}`);
    }
  }

  /**
   * Adiciona anotações/comentários a um PDF
   * @param {Buffer} pdfBuffer - Buffer do PDF
   * @param {Array} comments - Array de comentários com {page, x, y, content, textColor, bgColor, fontSize, width, height}
   * @returns {Buffer} Buffer do PDF com anotações
   */
  static async addAnnotations(pdfBuffer, comments) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      for (const comment of comments) {
        const pageIndex = comment.page - 1; // Converter para índice baseado em 0
        
        if (pageIndex < 0 || pageIndex >= pageCount) {
          console.warn(`Página ${comment.page} não existe, pulando comentário`);
          continue;
        }
        
        const page = pdfDoc.getPage(pageIndex);
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        // Validar coordenadas
        const x = Math.max(0, Math.min(comment.x, pageWidth - comment.width));
        const y = Math.max(0, Math.min(comment.y, pageHeight - comment.height));
        
        // Desenhar retângulo de fundo
        page.drawRectangle({
          x: x,
          y: y,
          width: comment.width,
          height: comment.height,
          color: rgb(
            comment.bgColor?.[0] || 1, 
            comment.bgColor?.[1] || 1, 
            comment.bgColor?.[2] || 1
          ),
          opacity: 0.8
        });
        
        // Desenhar borda
        page.drawRectangle({
          x: x,
          y: y,
          width: comment.width,
          height: comment.height,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1
        });
        
        // Desenhar texto
        page.drawText(comment.content, {
          x: x + 5,
          y: y + comment.height / 2,
          size: comment.fontSize || 12,
          color: rgb(
            comment.textColor?.[0] || 0, 
            comment.textColor?.[1] || 0, 
            comment.textColor?.[2] || 0
          )
        });
      }
      
      return await pdfDoc.save();
    } catch (error) {
      throw new Error(`Falha ao adicionar anotações: ${error.message}`);
    }
  }

  /**
   * Cria um PDF a partir de texto
   * @param {string} text - Texto a ser convertido para PDF
   * @param {Object} options - Opções do PDF
   * @returns {Buffer} Buffer do PDF gerado
   */
  static async createPdfFromText(text, options = {}) {
    try {
      const { title = 'Documento', pageSize = 'A4', fontSize = 12 } = options;
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      
      // Configurar tamanho da página
      const { width, height } = page.getSize();
      
      // Adicionar título
      if (title) {
         page.drawText(title, {
           x: 50,
           y: height - 50,
           size: parseInt(fontSize) + 4,
           color: rgb(0, 0, 0),
         });
      }
      
      // Adicionar texto
      const lines = text.split('\n');
      let yPosition = height - 100;
      
      for (const line of lines) {
        if (yPosition < 50) {
          // Nova página se necessário
          const newPage = pdfDoc.addPage();
          yPosition = height - 50;
        }
        
         page.drawText(line, {
           x: 50,
           y: yPosition,
           size: parseInt(fontSize),
           color: rgb(0, 0, 0),
         });
        
                 yPosition -= parseInt(fontSize) + 5;
       }
       
       return await pdfDoc.save();
     } catch (error) {
       throw new Error(`Falha ao criar PDF a partir de texto: ${error.message}`);
     }
   }

  /**
   * Cria um PDF a partir de imagens
   * @param {Array<Buffer>} imageBuffers - Array de buffers de imagens
   * @param {Object} options - Opções do PDF
   * @returns {Buffer} Buffer do PDF gerado
   */
  static async createPdfFromImages(imageBuffers, options = {}) {
    try {
      const { pageSize = 'A4' } = options;
      
      const pdfDoc = await PDFDocument.create();
      
      for (const imageBuffer of imageBuffers) {
        let image;
        
        // Tentar carregar como PNG primeiro
        try {
          image = await pdfDoc.embedPng(imageBuffer);
          console.log('Imagem carregada como PNG:', image.width, 'x', image.height);
        } catch (e) {
          console.log('Erro ao carregar como PNG, tentando JPEG:', e.message);
          // Tentar carregar como JPEG
          try {
            image = await pdfDoc.embedJpg(imageBuffer);
            console.log('Imagem carregada como JPEG:', image.width, 'x', image.height);
          } catch (e2) {
            console.log('Erro ao carregar como JPEG:', e2.message);
            throw new Error('Formato de imagem não suportado. Use PNG ou JPEG.');
          }
        }
        
        // Criar uma nova página para cada imagem
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        
        console.log('Dimensões da página:', width, 'x', height);
        console.log('Dimensões da imagem:', image.width, 'x', image.height);
        
        // Calcular dimensões da imagem para caber na página
        const imageWidth = image.width;
        const imageHeight = image.height;
        
        // Calcular escala para caber na página com margem
        const margin = 50;
        const maxWidth = width - (2 * margin);
        const maxHeight = height - (2 * margin);
        
        let scaleX = maxWidth / imageWidth;
        let scaleY = maxHeight / imageHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Não aumentar a imagem
        
        const scaledWidth = imageWidth * scale;
        const scaledHeight = imageHeight * scale;
        
        // Centralizar a imagem na página
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;
        
        console.log('Posição da imagem:', x, y);
        console.log('Dimensões escaladas:', scaledWidth, 'x', scaledHeight);
        
        // Desenhar a imagem na página
        page.drawImage(image, {
          x: x,
          y: y,
          width: scaledWidth,
          height: scaledHeight,
        });
        
        console.log('Imagem desenhada na página com sucesso');
      }
      
      console.log('PDF com imagens criado com sucesso');
      return await pdfDoc.save();
    } catch (error) {
      console.error('Erro ao criar PDF a partir de imagens:', error);
      throw new Error(`Falha ao criar PDF a partir de imagens: ${error.message}`);
    }
  }

  /**
   * Cria um PDF a partir de dados de tabela
   * @param {Array<Array>} tableData - Dados da tabela
   * @param {Array<string>} tableHeaders - Cabeçalhos da tabela
   * @param {Object} options - Opções do PDF
   * @returns {Buffer} Buffer do PDF gerado
   */
  static async createPdfFromTable(tableData, tableHeaders = [], options = {}) {
    try {
      const { title = 'Tabela', pageSize = 'A4', fontSize = 10 } = options;
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      
      const { width, height } = page.getSize();
      const margin = 50;
      const tableWidth = width - (2 * margin);
      const cellPadding = 5;
      
      // Adicionar título
      if (title) {
                           page.drawText(title, {
            x: margin,
            y: height - margin,
            size: parseInt(fontSize) + 4,
            color: rgb(0, 0, 0),
          });
      }
      
      let yPosition = height - margin - 30;
      
      // Desenhar cabeçalhos
      if (tableHeaders.length > 0) {
        const columnWidth = tableWidth / tableHeaders.length;
        
        for (let i = 0; i < tableHeaders.length; i++) {
                                 page.drawText(tableHeaders[i], {
              x: margin + (i * columnWidth) + cellPadding,
              y: yPosition,
              size: parseInt(fontSize),
              color: rgb(0, 0, 0),
            });
        }
        
                 yPosition -= parseInt(fontSize) + 10;
      }
      
      // Desenhar dados da tabela
      for (const row of tableData) {
        if (yPosition < margin + 50) {
          // Nova página se necessário
          const newPage = pdfDoc.addPage();
          yPosition = height - margin;
        }
        
        const columnWidth = tableWidth / Math.max(row.length, tableHeaders.length || 1);
        
        for (let i = 0; i < row.length; i++) {
          const cellText = String(row[i] || '');
          
          // Quebrar texto longo
          const maxChars = Math.floor(columnWidth / (fontSize * 0.6));
          if (cellText.length > maxChars) {
            const truncatedText = cellText.substring(0, maxChars) + '...';
                                       page.drawText(truncatedText, {
                x: margin + (i * columnWidth) + cellPadding,
                y: yPosition,
                size: parseInt(fontSize),
                color: rgb(0, 0, 0),
              });
          } else {
                                       page.drawText(cellText, {
                x: margin + (i * columnWidth) + cellPadding,
                y: yPosition,
                size: parseInt(fontSize),
                color: rgb(0, 0, 0),
              });
          }
        }
        
        yPosition -= parseInt(fontSize) + 5;
      }
      
      return await pdfDoc.save();
    } catch (error) {
      throw new Error(`Falha ao criar PDF a partir de tabela: ${error.message}`);
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
      // console.log(`Tipo de operação encontrado em operation.operationType: ${type}`);
    }
    
    // console.log(`Tipo de operação ${i}:`, type);
    // console.log(`Operação completa ${i}:`, JSON.stringify(operation));
    
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
        let ranges = operation.ranges;
        
        // Se não temos ranges, tentar usar splitPoints
        if (!ranges || !Array.isArray(ranges)) {
          if (operation.splitPoints && Array.isArray(operation.splitPoints)) {
            // Carregar o PDF para obter o número de páginas
            const pdfDoc = await PDFDocument.load(currentBuffer);
            const pageCount = pdfDoc.getPageCount();
            
            ranges = [];
            let lastPage = 0;
            for (const splitPoint of operation.splitPoints) {
              if (splitPoint > lastPage && splitPoint <= pageCount) {
                ranges.push({ start: lastPage + 1, end: splitPoint });
                lastPage = splitPoint;
              }
            }
            if (lastPage < pageCount) {
              ranges.push({ start: lastPage + 1, end: pageCount });
            }
          } else {
            throw new Error('Parâmetro ranges ou splitPoints inválido ou ausente');
          }
        }
        
        console.log('Aplicando divisão com parâmetros:', JSON.stringify(ranges));
        // Para split, retornamos apenas o primeiro intervalo por padrão
        const splitResults = await PdfEditor.splitPdf(currentBuffer, ranges);
        if (splitResults && splitResults.length > 0) {
          currentBuffer = splitResults[0].buffer;
          console.log('Divisão aplicada com sucesso');
        } else {
          throw new Error('Falha ao dividir o PDF: nenhum resultado obtido');
        }
      } 
      else if (operationType === 'removepages') {
        if (!operation.pagesToRemove || !Array.isArray(operation.pagesToRemove)) {
          throw new Error('Parâmetro pagesToRemove inválido ou ausente');
        }
        console.log('Removendo páginas:', operation.pagesToRemove);
        currentBuffer = await PdfEditor.removePages(currentBuffer, operation.pagesToRemove);
        console.log('Páginas removidas com sucesso');
      }
      else if (operationType === 'watermark') {
        if (!operation.watermarkText) {
          throw new Error('Parâmetro watermarkText ausente');
        }
        console.log('Aplicando watermark com texto:', operation.watermarkText);
        currentBuffer = await PdfEditor.addWatermark(
          currentBuffer, 
          operation.watermarkText,
          operation.opacity || 0.5,
          operation.position || 'center',
          operation.imageWidth || 150,
          operation.imageHeight || 150
        );
        console.log('Watermark com texto aplicado com sucesso');
      }
      else if (operationType === 'imagewatermark') {
        if (!operation.imageBuffer) {
          throw new Error('Parâmetro imageBuffer ausente');
        }
        console.log('Aplicando watermark com imagem');
        currentBuffer = await PdfEditor.addImageWatermark(
          currentBuffer, 
          operation.imageBuffer,
          operation.opacity || 0.5,
          operation.position || 'center',
          operation.imageWidth || 150,
          operation.imageHeight || 150
        );
        console.log('Watermark com imagem aplicado com sucesso');
      }
      else if (operationType === 'addannotations') {
        if (!operation.comments || !Array.isArray(operation.comments)) {
          throw new Error('Parâmetro comments inválido ou ausente');
        }
        console.log('Adicionando anotações:', operation.comments.length);
        currentBuffer = await PdfEditor.addAnnotations(currentBuffer, operation.comments);
        console.log('Anotações adicionadas com sucesso');
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
        console.error(`Erro: Operação não suportada: '${type}' (normalizado: '${operationType}')`);
        throw new Error(`Operação não suportada: ${operationType}`);
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