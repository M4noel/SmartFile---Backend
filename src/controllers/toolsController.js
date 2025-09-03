import { compressImage } from '../utils/imageCompressor.js';
import { convertImage } from '../utils/imageConverter.js';
import { resizeImage } from '../utils/imageResizer.js';
import { mergePdfs } from '../utils/pdfMerge.js';
import { editPdf } from '../utils/pdfEditor.js';
import { pdfToImages } from '../utils/pdfToImageConverter.js';
import { pdfToDocument } from '../utils/pdfToDocumentConverter.js';
import { processOcr } from '../utils/ocrProcessor.js';
import { storeFile, retrieveFile } from '../utils/tempStorage.js';
import PdfEditor from '../utils/pdfEditor.js';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export default {
  // Compressão de imagem
  async compressImage(req, res) {
    try {
      if (!req.files || !req.files.pdf) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      // Obter o buffer do PDF
      const buffer = req.files.pdf[0].buffer;
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
      if (!req.files || !req.files.pdf) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.files.pdf[0].buffer;
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
      if (!req.files || !req.files.pdf) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.files.pdf[0].buffer;
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
      console.log('Files:', req.files);
      
      if (!req.files || !req.files.pdf) {
        console.log('Erro: Nenhum arquivo PDF enviado');
        return res.status(400).json({ error: 'Nenhum arquivo PDF enviado' });
      }

      console.log('Arquivo recebido:', req.files.pdf[0].originalname, 'Tamanho:', req.files.pdf[0].size);
      
      const buffer = req.files.pdf[0].buffer;
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
            } else if (operationType === 'watermark' && req.files && req.files.watermarkImage) {
              // Para watermark com imagem, usar o arquivo enviado
              operations = [{
                type: 'imagewatermark',
                imageBuffer: req.files.watermarkImage[0].buffer,
                opacity: options.opacity || 0.5,
                position: options.position || 'center',
                width: options.imageWidth || 150,
                height: options.imageHeight || 150
              }];
              // console.log('Operação de watermark com imagem construída:', operations);
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
          } else if (operationType === 'watermark' && req.files && req.files.watermarkImage) {
            // Para watermark com imagem - verificar se temos a imagem
            console.log('Arquivos recebidos para watermark:', Object.keys(req.files));
            console.log('Campo watermarkImage:', req.files.watermarkImage);
            console.log('Tamanho da imagem:', req.files.watermarkImage[0].size);
            console.log('Tipo da imagem:', req.files.watermarkImage[0].mimetype);
            
            operations = [{
              type: 'imagewatermark',
              imageBuffer: req.files.watermarkImage[0].buffer,
              opacity: parseFloat(req.body.opacity) || 0.5,
              position: req.body.position || 'center',
              width: parseInt(req.body.imageWidth) || 150,
              height: parseInt(req.body.imageHeight) || 150
            }];
            console.log('Operação de watermark com imagem construída:', operations);
          } else if (operationType === 'removepages' && req.body.pagesToRemove) {
            // Para remoção de páginas
            let pagesToRemove;
            try {
              pagesToRemove = typeof req.body.pagesToRemove === 'string' ? 
                JSON.parse(req.body.pagesToRemove) : req.body.pagesToRemove;
            } catch (e) {
              return res.status(400).json({ error: 'Formato de pagesToRemove inválido' });
            }
            
            operations = [{
              type: 'removepages',
              pagesToRemove: Array.isArray(pagesToRemove) ? pagesToRemove : [pagesToRemove]
            }];
            console.log('Operação de remoção de páginas construída:', operations);
          } else if (operationType === 'addannotations' && req.body.comments) {
            // Para anotações
            let comments;
            try {
              comments = typeof req.body.comments === 'string' ? 
                JSON.parse(req.body.comments) : req.body.comments;
            } catch (e) {
              return res.status(400).json({ error: 'Formato de comments inválido' });
            }
            
            operations = [{
              type: 'addannotations',
              comments: Array.isArray(comments) ? comments : [comments]
            }];
            console.log('Operação de anotações construída:', operations);
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
      if (!req.files || !req.files.pdf) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.files.pdf[0].buffer;
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
      if (!req.files || !req.files.pdf) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.files.pdf[0].buffer;
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
      if (!req.files || !req.files.pdf) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.files.pdf[0].buffer;
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
      console.log('📧 Processando formulário de contato');
      console.log('Headers da requisição:', req.headers);
      console.log('Dados recebidos:', req.body);
      
      const { nome, email, assunto, mensagem } = req.body;

      // Validações
      if (!nome || !email || !assunto || !mensagem) {
        console.log('❌ Campos obrigatórios faltando:', { nome: !!nome, email: !!email, assunto: !!assunto, mensagem: !!mensagem });
        return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios' });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.log('❌ Email inválido:', email);
        return res.status(400).json({ success: false, error: 'Email inválido' });
      }

      console.log('✅ Validações passaram, configurando transporter...');
      
      // Verificar variáveis de ambiente
      console.log('📋 Variáveis de ambiente encontradas:');
      console.log({
        GMAIL_USER: !!process.env.GMAIL_USER,
        GMAIL_PASS: !!process.env.GMAIL_PASS,
        SMTP_HOST: !!process.env.SMTP_HOST,
        SMTP_USER: !!process.env.SMTP_USER,
        SMTP_PASS: !!process.env.SMTP_PASS,
        ADMIN_EMAIL: !!process.env.ADMIN_EMAIL,
        SMTP_FROM: !!process.env.SMTP_FROM
      });

      // Configurar transporter
      let transporter;
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        console.log('📧 Usando configuração SMTP customizada');
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
      } else if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
        console.log('📧 Usando configuração Gmail');
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
        });
      } else {
        console.log('❌ Configuração de email não disponível');
        // Retornar sucesso para não confundir o usuário, mas logar o problema
        console.warn('⚠️ Email não será enviado - configurações faltando');
        return res.json({ success: true, message: 'Mensagem registrada! Entraremos em contato em breve.' });
      }

      const adminRecipient = process.env.ADMIN_EMAIL || 'murilomanoel221@gmail.com';
      const subject = `Nova mensagem de contato - SmartFiles: ${assunto}`;
      const text = `Mensagem recebida do formulário de contato do SmartFiles:\n\n` +
                   `Nome: ${nome}\n` +
                   `Email: ${email}\n` +
                   `Assunto: ${assunto}\n\n` +
                   `Mensagem:\n${mensagem}\n\n` +
                   `Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

      console.log('📨 Enviando email para:', adminRecipient);
      console.log('📝 Assunto:', subject);
      
      try {
        // Testar conexão primeiro
        console.log('🔧 Verificando conexão SMTP...');
        await transporter.verify();
        console.log('✅ Conexão SMTP verificada');
        
        // Enviar email
        const info = await transporter.sendMail({
          from: `"SmartFiles" <${process.env.GMAIL_USER}>`,
          to: adminRecipient,
          subject,
          text,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
              <div style="background-color: #3498db; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">📧 Nova Mensagem - SmartFiles</h1>
              </div>
              <div style="background-color: white; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                <div style="margin-bottom: 15px;">
                  <strong style="color: #2c3e50;">👤 Nome:</strong> 
                  <span style="color: #34495e;">${nome}</span>
                </div>
                <div style="margin-bottom: 15px;">
                  <strong style="color: #2c3e50;">📧 Email:</strong> 
                  <a href="mailto:${email}" style="color: #3498db;">${email}</a>
                </div>
                <div style="margin-bottom: 15px;">
                  <strong style="color: #2c3e50;">📋 Assunto:</strong> 
                  <span style="color: #34495e;">${assunto}</span>
                </div>
                <div style="margin-bottom: 15px;">
                  <strong style="color: #2c3e50;">💬 Mensagem:</strong>
                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db; margin-top: 10px; white-space: pre-wrap; color: #34495e;">${mensagem}</div>
                </div>
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e9ecef; color: #7f8c8d; font-size: 12px;">
                  <strong>🕒 Data:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                </div>
              </div>
            </div>
          `
        });
        
        console.log('✅ Email enviado com sucesso!');
        console.log('📨 Message ID:', info.messageId);
        
        res.json({ success: true, message: 'Mensagem enviada com sucesso! Entraremos em contato em breve.' });
        
      } catch (emailError) {
        console.error('❌ Erro detalhado ao enviar email:');
        console.error({
          message: emailError.message,
          code: emailError.code,
          command: emailError.command,
          response: emailError.response,
          responseCode: emailError.responseCode
        });
        
        // Verificar tipos específicos de erro
        if (emailError.code === 'EAUTH') {
          console.log('💡 Dica: Verifique se está usando uma "App Password" do Gmail');
        } else if (emailError.code === 'ETIMEDOUT') {
          console.log('💡 Dica: Problema de conexão - verifique firewall/proxy');
        } else if (emailError.code === 'ECONNECTION') {
          console.log('💡 Dica: Não foi possível conectar ao servidor SMTP');
        }
        
        // Não expor erro técnico para o usuário, mas registrar sucesso
        console.log('⚠️ Retornando sucesso para o usuário apesar do erro de email');
        res.json({ success: true, message: 'Mensagem registrada! Entraremos em contato em breve.' });
      }
    } catch (error) {
      console.error('❌ Erro geral ao processar contato:', error);
      res.status(500).json({ success: false, error: 'Erro interno ao processar mensagem', details: error.message });
    }
  },

  // Notificar interesse em IA Tools
  async notifyIaTools(req, res) {
    try {
      console.log('🤖 Processando notificação IA Tools (backend)');
      console.log('Dados recebidos:', req.body);
      
      const { email, feature } = req.body;

      // Validações
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.log('❌ Email inválido:', email);
        return res.status(400).json({ success: false, error: 'Email inválido' });
      }

      console.log('✅ Email válido, preparando notificação...');
      
      // Verificar variáveis de ambiente
      console.log('📋 Variáveis de ambiente encontradas:');
      console.log({
        GMAIL_USER: !!process.env.GMAIL_USER,
        GMAIL_PASS: !!process.env.GMAIL_PASS,
        ADMIN_EMAIL: !!process.env.ADMIN_EMAIL,
        SMTP_FROM: !!process.env.SMTP_FROM
      });

      // Configurar transporter
      let transporter;
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        console.log('📧 Usando configuração SMTP customizada');
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
      } else if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
        console.log('📧 Usando configuração Gmail');
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
        });
      } else {
        console.log('❌ Configuração de email não disponível');
        // Retornar sucesso para não confundir o usuário, mas logar o problema
        console.warn('⚠️ Email não será enviado - configurações faltando');
        return res.json({ success: true, message: 'Interesse registrado! Entraremos em contato em breve.' });
      }

      const adminRecipient = process.env.ADMIN_EMAIL || 'murilomanoel221@gmail.com';
      const subject = `🤖 Novo interesse em IA Tools - ${feature || 'IA Tools'}`;
      const text = `Novo interesse registrado no SmartFiles IA Tools!\n\n` +
                   `📧 Email do usuário: ${email}\n` +
                   `🛠️ Recurso interessado: ${feature || 'IA Tools'}\n` +
                   `📅 Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n` +
                   `Responda para este email para entrar em contato diretamente.`;

      console.log('📨 Enviando notificação para:', adminRecipient);
      console.log('📝 Assunto:', subject);
      
      try {
        // Testar conexão primeiro
        console.log('🔧 Verificando conexão SMTP...');
        await transporter.verify();
        console.log('✅ Conexão SMTP verificada');
        
        // Enviar email
        const info = await transporter.sendMail({
          from: `"SmartFiles - IA Tools" <${process.env.SMTP_FROM || process.env.GMAIL_USER}>`,
          to: adminRecipient,
          subject,
          text,
          replyTo: email,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f0f8ff; border-radius: 10px;">
              <div style="background: linear-gradient(135deg, #2a75ff, #1a65e0); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">🤖 Novo Interesse - IA Tools</h1>
              </div>
              <div style="background-color: white; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2a75ff;">
                  <p style="margin: 0; color: #1976d2; font-weight: bold; font-size: 16px;">🎆 Alguém está interessado nas ferramentas de IA!</p>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <strong style="color: #2c3e50;">📧 Email do interessado:</strong> 
                  <a href="mailto:${email}" style="color: #2a75ff; font-weight: bold;">${email}</a>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <strong style="color: #2c3e50;">🛠️ Recurso de interesse:</strong> 
                  <span style="color: #34495e; background-color: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${feature || 'IA Tools'}</span>
                </div>
                
                <div style="margin-bottom: 20px;">
                  <strong style="color: #2c3e50;">📅 Data do interesse:</strong> 
                  <span style="color: #34495e;">${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
                  <p style="margin: 0; color: #28a745; font-weight: bold;">💬 Ação recomendada:</p>
                  <p style="margin: 10px 0 0; color: #34495e;">Responda para este email para entrar em contato diretamente com o interessado!</p>
                </div>
              </div>
            </div>
          `
        });
        
        console.log('✅ Email enviado com sucesso!');
        console.log('📨 Message ID:', info.messageId);
        
        res.json({ success: true, message: 'Interesse registrado! Entraremos em contato em breve.' });
        
      } catch (emailError) {
        console.error('❌ Erro detalhado ao enviar email IA Tools:');
        console.error({
          message: emailError.message,
          code: emailError.code,
          command: emailError.command,
          response: emailError.response,
          responseCode: emailError.responseCode
        });
        
        // Verificar tipos específicos de erro
        if (emailError.code === 'EAUTH') {
          console.log('💡 Dica: Verifique se está usando uma "App Password" do Gmail');
        }
        
        // Não expor erro técnico para o usuário, mas registrar sucesso
        console.log('⚠️ Retornando sucesso para o usuário apesar do erro de email');
        res.json({ success: true, message: 'Interesse registrado! Entraremos em contato em breve.' });
      }
    } catch (error) {
      console.error('❌ Erro geral ao processar notificação IA Tools:', error);
      res.status(500).json({ success: false, error: 'Erro interno ao processar notificação', details: error.message });
    }
  },

  // Armazenamento temporário
  async storeFile(req, res) {
    try {
      if (!req.files || !req.files.pdf) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.files.pdf[0].buffer;
      const originalName = req.body.originalName || req.files.pdf[0].originalname;

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
  },

  // Comprimir PDF
  async compressPdf(req, res) {
    try {
      if (!req.files || !req.files.pdf) {
        return res.status(400).json({ success: false, error: 'Arquivo PDF não enviado' });
      }

      const { buffer } = req.file;
      const { quality = 'medium' } = req.body; // low, medium, high

      console.log('Comprimindo PDF com qualidade:', quality);
      console.log('Tamanho original:', buffer.length, 'bytes');

      try {
        // Verificar se o Ghostscript está instalado
        const isGhostscriptInstalled = async () => {
          try {
            // Tenta executar o comando 'gs --version' para verificar se o Ghostscript está instalado
            await execPromise('gs --version');
            return true;
          } catch (error) {
            console.warn('Ghostscript não está instalado:', error.message);
            return false;
          }
        };

        // Criar arquivos temporários
        const os = await import('os');
        const tempDir = os.tmpdir();
        const inputPath = path.join(tempDir, `original-${Date.now()}.pdf`);
        
        // Escrever o buffer em um arquivo temporário
        await fs.promises.writeFile(inputPath, buffer);
        
        // Verificar se o Ghostscript está instalado
        if (await isGhostscriptInstalled()) {
          // Importar a biblioteca compress-pdf
          const { compress } = await import('compress-pdf');
          
          // Configurar qualidade de compressão
          // Opções: screen (72dpi), ebook (150dpi), printer (300dpi), prepress (300dpi preservando cores)
          let resolution = 'ebook'; // Padrão - compressão média
          if (quality === 'low') {
            resolution = 'screen'; // Baixa qualidade, maior compressão
          } else if (quality === 'high') {
            resolution = 'prepress'; // Alta qualidade, menor compressão
          }
          
          // Comprimir o PDF usando compress-pdf
          const compressedBuffer = await compress(inputPath, {
            resolution: resolution
          });
          
          console.log('Tamanho comprimido:', compressedBuffer.length, 'bytes');
          console.log('Redução:', Math.round((1 - compressedBuffer.length / buffer.length) * 100), '%');
          
          // Enviar o PDF comprimido
          res.set('Content-Type', 'application/pdf');
          res.set('Content-Disposition', 'attachment; filename="pdf-comprimido.pdf"');
          res.send(compressedBuffer);
        } else {
          console.log('Ghostscript não está instalado, usando pdf-lib como alternativa');
          
          // Usar pdf-lib como alternativa para compressão básica
          try {
            const { PDFDocument } = await import('pdf-lib');
            
            // Carregar o PDF do buffer
            const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
            
            // Comprimir usando pdf-lib (compressão básica)
            const compressedPdfBytes = await pdfDoc.save({
              useObjectStreams: quality !== 'high', // Usar streams de objetos para melhor compressão
              addDefaultPage: false,
              useStreamingMode: true
            });
            
            const compressedBuffer = Buffer.from(compressedPdfBytes);
            
            console.log('Tamanho comprimido (pdf-lib):', compressedBuffer.length, 'bytes');
            console.log('Redução (pdf-lib):', Math.round((1 - compressedBuffer.length / buffer.length) * 100), '%');
            
            // Enviar o PDF comprimido
            res.set('Content-Type', 'application/pdf');
            res.set('Content-Disposition', 'attachment; filename="pdf-comprimido.pdf"');
            res.send(compressedBuffer);
          } catch (pdfLibError) {
            console.error('Erro ao usar pdf-lib:', pdfLibError);
            // Se falhar com pdf-lib, retornar o PDF original
            res.set('Content-Type', 'application/pdf');
            res.set('Content-Disposition', 'attachment; filename="pdf-original.pdf"');
            res.send(buffer);
          }
        }
        
        // Limpar arquivos temporários
        try {
          await fs.promises.unlink(inputPath);
        } catch (cleanupError) {
          console.warn('Erro ao limpar arquivos temporários:', cleanupError);
        }
      } catch (compressError) {
        console.error('Erro ao comprimir PDF:', compressError);
        // Em caso de erro, retornar o PDF original
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'attachment; filename="pdf-original.pdf"');
        res.send(buffer);
      }
    } catch (error) {
      console.error('Erro ao comprimir PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao comprimir PDF',
        details: error.message
      });
    }
  },

  // Remover senha de PDF
  async removePdfPassword(req, res) {
    try {
      if (!req.files || !req.files.pdf) {
        return res.status(400).json({ success: false, error: 'Arquivo PDF não enviado' });
      }

      const { buffer } = req.file;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ success: false, error: 'Senha atual do PDF é obrigatória' });
      }

      try {
        const unprotectedBuffer = await PdfEditor.removePassword(buffer, password);
        
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'attachment; filename="pdf-sem-senha.pdf"');
        res.send(unprotectedBuffer);
      } catch (error) {
        console.error('Erro ao remover senha:', error);
        res.status(400).json({
          success: false,
          error: 'Falha ao remover senha. Verifique se a senha está correta.'
        });
      }
    } catch (error) {
      console.error('Erro ao remover senha do PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao remover senha do PDF',
        details: error.message
      });
    }
  },

  // Gerar PDF
  async generatePdf(req, res) {
    try {
      const { type, content, title, pageSize, fontSize, tableData, tableHeaders } = req.body;
      
      let pdfBuffer;
      
      switch (type) {
        case 'text':
          if (!content) {
            return res.status(400).json({ success: false, error: 'Conteúdo de texto é obrigatório' });
          }
          pdfBuffer = await PdfEditor.createPdfFromText(content, { title, pageSize, fontSize });
          break;
          
        case 'image':
          if (!req.files || !req.files.image) {
            return res.status(400).json({ success: false, error: 'Imagem é obrigatória' });
          }
          console.log('Arquivos recebidos:', Object.keys(req.files));
          console.log('Campo image:', req.files.image);
          console.log('Tamanho da imagem:', req.files.image[0].size);
          console.log('Tipo da imagem:', req.files.image[0].mimetype);
          
          const imageBuffer = req.files.image[0].buffer;
          console.log('Buffer da imagem criado, tamanho:', imageBuffer.length);
          
          pdfBuffer = await PdfEditor.createPdfFromImages([imageBuffer], { pageSize });
          console.log('PDF gerado com sucesso, tamanho:', pdfBuffer.length);
          break;
          
        case 'table':
          if (!tableData) {
            return res.status(400).json({ success: false, error: 'Dados da tabela são obrigatórios' });
          }
          const parsedTableData = JSON.parse(tableData);
          const parsedTableHeaders = tableHeaders ? JSON.parse(tableHeaders) : [];
          pdfBuffer = await PdfEditor.createPdfFromTable(parsedTableData, parsedTableHeaders, { title, pageSize });
          break;
          
        default:
          return res.status(400).json({ success: false, error: `Tipo não suportado: ${type}` });
      }
      
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', 'attachment; filename="documento.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao gerar PDF',
        details: error.message
      });
    }
  },

  // Gerar PDF combinado
  async generateCombinedPdf(req, res) {
    try {
      const { title, pageSize, fontSize, contentData } = req.body;
      
      // Parse content data
      const parsedContentData = JSON.parse(contentData);
      
      // Process content items
      const contentItems = [];
      let imageIndex = 0; // Track the actual image index
      for (let i = 0; i < parsedContentData.length; i++) {
        const item = parsedContentData[i];
        const contentItem = {
          type: item.type
        };
        
        switch (item.type) {
          case 'text':
            contentItem.content = item.content || '';
            break;
            
          case 'image':
            // Find the image file for this item
            const fieldName = `image_${imageIndex}`;
            if (req.files && req.files[fieldName]) {
              // Access the file by field name
              contentItem.imageBuffer = req.files[fieldName][0].buffer;
              imageIndex++;
            }
            break;
            
          case 'table':
            if (item.tableData) {
              contentItem.tableData = item.tableData;
              contentItem.tableHeaders = item.tableHeaders || [];
            }
            break;
        }
        
        contentItems.push(contentItem);
      }
      
      // Generate combined PDF
      const { PDFDocument, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      
      for (const item of contentItems) {
        switch (item.type) {
          case 'text':
            if (item.content) {
              const page = pdfDoc.addPage();
              const { width, height } = page.getSize();
              
                             if (title) {
                 page.drawText(title, {
                   x: 50,
                   y: height - 50,
                   size: parseInt(fontSize || 12) + 4,
                   color: rgb(0, 0, 0),
                 });
               }
              
              const lines = item.content.split('\n');
              let yPosition = height - 100;
              
              for (const line of lines) {
                if (yPosition < 50) {
                  const newPage = pdfDoc.addPage();
                  yPosition = height - 50;
                }
                
                                 page.drawText(line, {
                   x: 50,
                   y: yPosition,
                   size: parseInt(fontSize || 12),
                   color: rgb(0, 0, 0),
                 });
                 
                 yPosition -= parseInt(fontSize || 12) + 5;
              }
            }
            break;
            
          case 'image':
            if (item.imageBuffer) {
              let image;
              try {
                image = await pdfDoc.embedPng(item.imageBuffer);
              } catch (e) {
                try {
                  image = await pdfDoc.embedJpg(item.imageBuffer);
                } catch (e2) {
                  console.warn('Formato de imagem não suportado');
                  continue;
                }
              }
              
              const page = pdfDoc.addPage();
              const { width, height } = page.getSize();
              
              const imageWidth = image.width;
              const imageHeight = image.height;
              
              let scaleX = width / imageWidth;
              let scaleY = height / imageHeight;
              const scale = Math.min(scaleX, scaleY) * 0.9;
              
              const scaledWidth = imageWidth * scale;
              const scaledHeight = imageHeight * scale;
              
              const x = (width - scaledWidth) / 2;
              const y = (height - scaledHeight) / 2;
              
              page.drawImage(image, {
                x,
                y,
                width: scaledWidth,
                height: scaledHeight,
              });
            }
            break;
            
          case 'table':
            if (item.tableData) {
              const page = pdfDoc.addPage();
              const { width, height } = page.getSize();
              const margin = 50;
              const tableWidth = width - (2 * margin);
              const cellPadding = 5;
              
                             if (title) {
                 page.drawText(title, {
                   x: margin,
                   y: height - margin,
                   size: parseInt(fontSize || 10) + 4,
                   color: rgb(0, 0, 0),
                 });
               }
              
              let yPosition = height - margin - 30;
              
              // Draw headers
              if (item.tableHeaders && item.tableHeaders.length > 0) {
                const columnWidth = tableWidth / item.tableHeaders.length;
                
                                 for (let i = 0; i < item.tableHeaders.length; i++) {
                   page.drawText(item.tableHeaders[i], {
                     x: margin + (i * columnWidth) + cellPadding,
                     y: yPosition,
                     size: parseInt(fontSize) || 10,
                     color: rgb(0, 0, 0),
                   });
                 }
                 
                 yPosition -= parseInt(fontSize || 10) + 10;
              }
              
              // Draw table data
              for (const row of item.tableData) {
                if (yPosition < margin + 50) {
                  const newPage = pdfDoc.addPage();
                  yPosition = height - margin;
                }
                
                const columnWidth = tableWidth / Math.max(row.length, (item.tableHeaders || []).length || 1);
                
                for (let i = 0; i < row.length; i++) {
                  const cellText = String(row[i] || '');
                  
                  const maxChars = Math.floor(columnWidth / ((fontSize || 10) * 0.6));
                                     if (cellText.length > maxChars) {
                     const truncatedText = cellText.substring(0, maxChars) + '...';
                     page.drawText(truncatedText, {
                       x: margin + (i * columnWidth) + cellPadding,
                       y: yPosition,
                       size: parseInt(fontSize) || 10,
                       color: rgb(0, 0, 0),
                     });
                   } else {
                     page.drawText(cellText, {
                       x: margin + (i * columnWidth) + cellPadding,
                       y: yPosition,
                       size: parseInt(fontSize) || 10,
                       color: rgb(0, 0, 0),
                     });
                   }
                 }
                 
                 yPosition -= parseInt(fontSize || 10) + 5;
              }
            }
            break;
        }
      }
      
      const pdfBuffer = await pdfDoc.save();
      
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', 'attachment; filename="documento-combinado.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erro ao gerar PDF combinado:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao gerar PDF combinado',
        details: error.message
      });
    }
  }
};