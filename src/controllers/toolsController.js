import { compressImage } from '../utils/imageCompressor.js';
import { convertImage } from '../utils/imageConverter.js';
import { resizeImage } from '../utils/imageResizer.js';
import { mergePdfs } from '../utils/pdfMerge.js';
import { editPdf } from '../utils/pdfEditor.js';
import { pdfToImages } from '../utils/pdfToImageConverter.js';
import { pdfToDocument } from '../utils/pdfToDocumentConverter.js';
import { processOcr } from '../utils/ocrProcessor.js';
import { storeFile, retrieveFile } from '../utils/tempStorage.js';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

export default {
  // Compressão de imagem
  async compressImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.file.buffer;
      const quality = parseInt(req.body.quality || '80', 10);
      const format = req.body.format || 'jpeg';

      const compressed = await compressImage(buffer, { quality, format });

      res.set('Content-Type', `image/${format}`);
      res.send(compressed);
    } catch (error) {
      console.error('Erro ao comprimir imagem:', error);
      res.status(500).json({ error: 'Falha ao comprimir imagem', details: error.message });
    }
  },

  // Conversão de imagem
  async convertImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.file.buffer;
      const format = req.body.format || 'jpeg';
      const quality = parseInt(req.body.quality || '80', 10);

      // Validar formato
      const supportedFormats = ['jpeg', 'png', 'webp', 'tiff'];
      if (!supportedFormats.includes(format.toLowerCase())) {
        return res.status(400).json({
          error: `Formato não suportado: ${format}`
        });
      }

      const converted = await convertImage(buffer, format, { quality });

      // Definir tipo de conteúdo apropriado
      let contentType = 'image/jpeg';
      switch (format.toLowerCase()) {
        case 'png':
          contentType = 'image/png';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
        case 'tiff':
          contentType = 'image/tiff';
          break;
      }

      res.set('Content-Type', contentType);
      res.send(converted);
    } catch (error) {
      console.error('Erro ao converter imagem:', error);
      res.status(500).json({
        error: 'Erro interno ao converter imagem',
        details: error.message
      });
    }
  },

  // Redimensionamento de imagem
  async resizeImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.file.buffer;
      const width = parseInt(req.body.width || '0', 10);
      const height = parseInt(req.body.height || '0', 10);
      const format = req.body.format || 'jpeg';

      if (width <= 0 && height <= 0) {
        return res.status(400).json({ error: 'Especifique pelo menos uma dimensão válida (largura ou altura)' });
      }

      const resized = await resizeImage(buffer, width, height, { format });

      // Definir tipo de conteúdo apropriado
      let contentType = 'image/jpeg';
      switch (format.toLowerCase()) {
        case 'png':
          contentType = 'image/png';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
      }

      res.set('Content-Type', contentType);
      res.send(resized);
    } catch (error) {
      console.error('Erro ao redimensionar imagem:', error);
      res.status(500).json({
        error: 'Erro interno ao redimensionar imagem',
        details: error.message
      });
    }
  },

  // União de PDFs
  async mergePdfs(req, res) {
    try {
      if (!req.files || req.files.length < 2) {
        return res.status(400).json({ error: 'Envie pelo menos dois arquivos PDF para unir' });
      }

      const merged = await mergePdfs(req.files);
      res.set('Content-Type', 'application/pdf');
      res.send(merged);
    } catch (error) {
      console.error('Erro ao unir PDFs:', error);
      res.status(500).json({ error: 'Falha ao unir PDFs', details: error.message });
    }
  },

  // Edição de PDF
  async editPdf(req, res) {
    try {
      console.log('Requisição recebida para edição de PDF');
      console.log('Headers:', req.headers);
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Body keys:', Object.keys(req.body));
      console.log('Body operations type:', typeof req.body.operations);
      console.log('Body operations value:', req.body.operations);
      console.log('Conteúdo completo do req.body:', req.body);
      console.log('Valor bruto de req.body.operations:', req.body.operations);
      
      if (!req.file) {
        console.log('Erro: Nenhum arquivo enviado');
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      console.log('Arquivo recebido:', req.file.originalname, 'Tamanho:', req.file.size);
      
      const buffer = req.file.buffer;
      let operations;
      
      // Tenta obter as operações do corpo da requisição
      console.log('Corpo da requisição:', req.body);
      console.log('Tipo de req.body.operations:', typeof req.body.operations);
      
      try {
        // Novo bloco: Verificar se temos operation e options (formato alternativo)
        if (req.body.operation && req.body.options) {
          console.log('Usando formato operation + options');
          const operationType = req.body.operation;
          let options;
          
          try {
            options = typeof req.body.options === 'string' ? JSON.parse(req.body.options) : req.body.options;
            console.log('Options parseadas:', options);
            
            // Criar objeto de operação com base no tipo
            if (operationType === 'rotate' && options.rotations) {
              operations = [{
                type: 'rotate',
                rotations: options.rotations
              }];
              console.log('Operação de rotação construída:', operations);
            } else {
              // Para outros tipos de operações
              operations = [{
                type: operationType,
                ...options
              }];
              console.log('Operação genérica construída:', operations);
            }
          } catch (e) {
            console.error('Erro ao parsear options como JSON:', e);
            return res.status(400).json({ error: 'Formato de options inválido', details: e.message });
          }
        }
        // Verificar se temos campos separados para a operação (fallback)
        else if (req.body.operationType) {
          console.log('Usando campos separados para a operação');
          
          // Construir objeto de operação a partir dos campos separados
          const operationType = req.body.operationType;
          
          if (operationType === 'rotate' && req.body.rotations) {
  let rotations = [];

  try {
    // Tenta parsear como JSON
    const parsed = JSON.parse(req.body.rotations);
    if (Array.isArray(parsed)) {
      rotations = parsed;
    } else {
      console.error('Rotations não é um array:', parsed);
      return res.status(400).json({ error: 'Formato de rotations inválido' });
    }
  } catch (e) {
    console.error('Erro ao parsear rotations:', e);
    return res.status(400).json({ error: 'Rotations deve ser um JSON válido' });
  }

  // Garante que cada item tem page e degrees
  const validRotations = rotations.filter(r => typeof r.page === 'number' && typeof r.degrees === 'number');
  if (validRotations.length === 0) {
    return res.status(400).json({ error: 'Nenhuma rotação válida encontrada em rotations' });
  }

  operations = [{
    type: 'rotate',
    rotations: validRotations
  }];

  console.log('Operação construída a partir de campos separados:', operations);
} else {
  console.log('Tipo de operação não suportado ou campos incompletos');
  return res.status(400).json({ error: 'Tipo de operação não suportado ou campos incompletos' });
}

        } 
        // Se não temos campos separados, tentar usar o campo operations
        else if (req.body.operations) {
          // Parsear as operações se for uma string JSON
          if (typeof req.body.operations === 'string') {
            try {
              operations = JSON.parse(req.body.operations);
              console.log('Operações parseadas de string JSON:', operations);
            } catch (e) {
              console.error('Erro ao parsear operations como JSON:', e);
              return res.status(400).json({ error: 'Formato de operações inválido', details: e.message });
            }
          } else if (typeof req.body.operations === 'object') {
            operations = req.body.operations;
            console.log('Operações recebidas como objeto:', operations);
          } else {
            operations = [];
            console.log('Nenhuma operação encontrada no corpo da requisição');
          }
          
          console.log('Tipo de operations após processamento:', typeof operations);
          
          // Normalizar para garantir que temos um array de operações
          if (operations && !Array.isArray(operations) && typeof operations === 'object' && operations.type) {
            // Se for um objeto único com propriedade 'type', colocamos em um array
            operations = [operations];
            console.log('Operação única convertida para array:', operations);
          }
        } else {
          operations = [];
          console.log('Nenhuma operação encontrada no corpo da requisição');
        }
        
        // Verificar se temos operações válidas
        if (!operations || !Array.isArray(operations)) {
          console.error('Erro: operations não é um array após processamento');
          return res.status(400).json({ error: 'Formato de operações inválido', details: 'As operações devem ser um array ou um objeto com propriedade type' });
        }
        
        console.log('Array de operações com', operations.length, 'item(s)');
        operations.forEach((op, index) => {
          console.log(`Operação ${index}:`, op);
          console.log(`Tipo da operação ${index}:`, op.type);
        });
      } catch (parseError) {
        console.error('Erro ao processar operações:', parseError);
        return res.status(400).json({ error: 'Formato de operações inválido', details: parseError.message });
      }
      
      // Imprime o conteúdo exato das operações para depuração
      console.log('Conteúdo exato das operações:', JSON.stringify(operations, null, 2));

      // Garante que operations seja um array
      if (!Array.isArray(operations)) {
        operations = [operations];
        console.log('Convertendo operação única para array:', operations);
      }
      
      // Verifica se cada operação tem um tipo válido
      for (let i = 0; i < operations.length; i++) {
        console.log(`Verificando operação ${i}:`, operations[i]);
        if (!operations[i].type) {
          console.error(`Erro: Operação ${i} não tem um tipo definido`);
          return res.status(400).json({ error: 'Formato de operação inválido', details: `Operação ${i} não tem um tipo definido` });
        }
      }

      if (!operations || operations.length === 0) {
        console.log('Erro: Nenhuma operação especificada');
        return res.status(400).json({ error: 'Nenhuma operação especificada' });
      }

      console.log('Iniciando edição do PDF com', operations.length, 'operações');
      console.log('Chamando editPdf com operações:', JSON.stringify(operations));
      
      // Verificar e corrigir cada operação antes de enviar para o editor
      for (let i = 0; i < operations.length; i++) {
        console.log(`Verificando operação ${i} antes de enviar:`, operations[i]);
        
        // Garantir que o tipo está definido
        if (!operations[i].type && operations[i].operationType) {
          console.log(`Corrigindo operação ${i}: usando operationType como type`);
          operations[i].type = operations[i].operationType;
        }
        
        // Verificar se o tipo está definido após a correção
        if (!operations[i].type) {
          console.error(`Erro: Operação ${i} não tem um tipo definido após correção`);
          return res.status(400).json({ error: 'Formato de operação inválido', details: `Operação ${i} não tem um tipo definido` });
        }
        
        console.log(`Operação ${i} após verificação:`, operations[i]);
      }
      
      try {
        // Garantir que cada operação tenha um tipo definido e normalizado
        for (let i = 0; i < operations.length; i++) {
          console.log(`Verificando e normalizando operação ${i}:`, JSON.stringify(operations[i]));
          
          // Verificar se o tipo está definido em algum lugar
          if (!operations[i].type && operations[i].operationType) {
            console.log(`Operação ${i}: Usando operationType (${operations[i].operationType}) como type`);
            operations[i].type = operations[i].operationType;
          }
          
          // Se ainda não tiver tipo, tentar extrair do campo operations como string
          if (!operations[i].type && req.body.operations && typeof req.body.operations === 'string') {
            try {
              console.log(`Operação ${i}: Tentando extrair tipo da string operations`);
              const parsedOps = JSON.parse(req.body.operations);
              if (Array.isArray(parsedOps) && parsedOps[i] && parsedOps[i].type) {
                operations[i].type = parsedOps[i].type;
                console.log(`Operação ${i}: Tipo extraído do array operations[${i}].type: ${operations[i].type}`);
              } else if (!Array.isArray(parsedOps) && parsedOps.type) {
                operations[i].type = parsedOps.type;
                console.log(`Operação ${i}: Tipo extraído do objeto operations.type: ${operations[i].type}`);
              }
            } catch (e) {
              console.error('Erro ao tentar extrair tipo da string operations:', e);
            }
          }
          
          // Verificar novamente se o tipo está definido
          if (!operations[i].type) {
            console.error(`Erro: Operação ${i} não tem um tipo definido após todas as tentativas`);
            return res.status(400).json({ error: 'Formato de operação inválido', details: `Operação ${i} não tem um tipo definido após todas as tentativas` });
          }
          
          console.log(`Operação ${i} final:`, JSON.stringify(operations[i]));
        }
        
        // Verificação final antes de chamar editPdf
        for (let i = 0; i < operations.length; i++) {
          console.log(`Verificação final da operação ${i}:`, JSON.stringify(operations[i]));
          
          // Garantir que o tipo está definido e é uma string
          if (!operations[i].type) {
            console.error(`Erro: Operação ${i} ainda não tem um tipo definido após todas as tentativas de correção`);
            return res.status(400).json({ 
              error: 'Formato de operação inválido', 
              details: `Operação ${i} não tem um tipo definido após tentativas de correção` 
            });
          }
          
          // Normalizar o tipo para minúsculas
          if (typeof operations[i].type === 'string') {
            operations[i].type = operations[i].type.toLowerCase();
            console.log(`Operação ${i}: Tipo normalizado para ${operations[i].type}`);
          }
        }
        
        console.log('Enviando operações para editPdf:', JSON.stringify(operations));
        const editedPdf = await editPdf(buffer, operations);
        console.log('PDF editado com sucesso');
        
        res.set('Content-Type', 'application/pdf');
        res.send(editedPdf);
      } catch (error) {
        console.error('Erro detalhado ao editar PDF:', error);
        res.status(500).json({ error: 'Falha ao editar PDF', details: error.message });
      }
    } catch (error) {
      console.error('Erro ao editar PDF:', error);
      res.status(500).json({ error: 'Falha ao editar PDF', details: error.message });
    }
  },

  // Conversão de PDF para imagens
  async pdfToImages(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.file.buffer;
      const format = req.body.format || 'jpeg';
      const dpi = parseInt(req.body.dpi || '150', 10);

      const images = await pdfToImages(buffer, { format, dpi });

      res.json({
        success: true,
        pageCount: images.length,
        images: images.map((img, index) => ({
          page: index + 1,
          data: img.toString('base64'),
          format
        }))
      });
    } catch (error) {
      console.error('Erro ao converter PDF para imagens:', error);
      res.status(500).json({ error: 'Falha ao converter PDF para imagens', details: error.message });
    }
  },

  // Conversão de PDF para documento
  async pdfToDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.file.buffer;
      const format = req.body.format || 'txt';

      // Validar formato
      const supportedFormats = ['txt', 'docx', 'html'];
      if (!supportedFormats.includes(format.toLowerCase())) {
        return res.status(400).json({
          error: `Formato não suportado: ${format}`
        });
      }

      const document = await pdfToDocument(buffer, format);

      // Definir tipo de conteúdo apropriado
      let contentType = 'text/plain';
      let filename = `documento.${format}`;
      switch (format.toLowerCase()) {
        case 'docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'html':
          contentType = 'text/html';
          break;
      }

      res.set('Content-Type', contentType);
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(document);
    } catch (error) {
      console.error('Erro ao converter PDF para documento:', error);
      res.status(500).json({ error: 'Falha ao converter PDF para documento', details: error.message });
    }
  },

  // Processamento OCR
  async ocrProcess(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.file.buffer;
      const language = req.body.language || 'por';
      const outputFormat = req.body.outputFormat || 'text';

      const result = await processOcr(buffer, language);

      if (outputFormat === 'json') {
        return res.json(result);
      } else {
        res.set('Content-Type', 'text/plain');
        res.send(result.text);
      }
    } catch (error) {
      console.error('Erro ao processar OCR:', error);
      res.status(500).json({ error: 'Falha ao processar OCR', details: error.message });
    }
  },

  // Geração de QR Code
  async generateQrCode(req, res) {
    try {
      const { text, format = 'png', size = 300 } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Texto para o QR Code é obrigatório' });
      }

      let qrBuffer;
      const options = { width: parseInt(size, 10) };

      if (format === 'svg') {
        const svgString = await QRCode.toString(text, {
          type: 'svg',
          ...options
        });
        res.set('Content-Type', 'image/svg+xml');
        return res.send(svgString);
      } else {
        qrBuffer = await QRCode.toBuffer(text, {
          type: 'png',
          ...options
        });
        res.set('Content-Type', 'image/png');
        return res.send(qrBuffer);
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      res.status(500).json({ error: 'Falha ao gerar QR Code', details: error.message });
    }
  },

  // Contato
  async contato(req, res) {
    try {
      const { nome, email, assunto, mensagem } = req.body;

      if (!nome || !email || !assunto || !mensagem) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Email inválido' });
      }

      // Configurar transporter
      let transporter;
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
      } else if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
        });
      } else {
        return res.status(500).json({ error: 'Configuração de email não disponível' });
      }

      const adminRecipient = process.env.ADMIN_EMAIL || 'murilomanoel221@gmail.com';
      const subject = `Nova mensagem de contato: ${assunto}`;
      const text = `Mensagem recebida do formulário de contato do SmartFiles:\n\n` +
                   `Nome: ${nome}\n` +
                   `Email: ${email}\n` +
                   `Assunto: ${assunto}\n\n` +
                   `Mensagem:\n${mensagem}`;

      // Enviar email
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.GMAIL_USER,
        to: adminRecipient,
        subject,
        text
      });

      res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
    } catch (error) {
      console.error('Erro ao enviar mensagem de contato:', error);
      res.status(500).json({ error: 'Falha ao enviar mensagem', details: error.message });
    }
  },

  // Armazenamento temporário
  async storeFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.file.buffer;
      const originalName = req.body.originalName || req.file.originalname;

      const storedFile = await storeFile(buffer, originalName);

      res.json({
        success: true,
        fileId: storedFile.id,
        filename: storedFile.originalName,
        createdAt: storedFile.createdAt
      });
    } catch (error) {
      console.error('Erro ao armazenar arquivo:', error);
      res.status(500).json({ error: 'Falha ao armazenar arquivo', details: error.message });
    }
  },

  async retrieveFile(req, res) {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        return res.status(400).json({ error: 'ID do arquivo é obrigatório' });
      }

      const file = await retrieveFile(fileId);

      if (!file) {
        return res.status(404).json({ error: 'Arquivo não encontrado ou expirado' });
      }

      // Definir tipo de conteúdo apropriado
      const ext = file.originalName.split('.').pop().toLowerCase();
      const contentTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'zip': 'application/zip'
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';

      res.set('Content-Type', contentType);
      res.set('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.send(file.buffer);
    } catch (error) {
      console.error('Erro ao recuperar arquivo:', error);
      res.status(500).json({ error: 'Falha ao recuperar arquivo', details: error.message });
    }
  }
};