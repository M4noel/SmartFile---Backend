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

      const resized = await resizeImage(buffer, { width, height, format });

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
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = req.file.buffer;
      const operations = JSON.parse(req.body.operations || '[]');

      if (!operations || operations.length === 0) {
        return res.status(400).json({ error: 'Nenhuma operação especificada' });
      }

      const edited = await editPdf(buffer, operations);
      res.set('Content-Type', 'application/pdf');
      res.send(edited);
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