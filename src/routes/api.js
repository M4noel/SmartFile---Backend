import express from 'express';
import toolsController from '../controllers/toolsController.js';

export default function apiRoutes(upload) {
  const router = express.Router();

  // Rota para compressão de imagens
  router.post('/compress-image', upload.single('image'), toolsController.compressImage);

  // Rota para unir PDFs
  router.post('/merge-pdfs', upload.array('pdfs', 5), toolsController.mergePdfs);

  // Rota para converter imagens
  router.post('/convert-image', upload.single('image'), toolsController.convertImage);

  // Rota para redimensionar imagens
  router.post('/resize-image', upload.single('image'), toolsController.resizeImage);

  // Rota para processamento OCR
  router.post('/ocr-process', upload.single('file'), toolsController.ocrProcess);

  // Rota para converter PDF para imagens
  router.post('/pdf-to-images', upload.single('pdf'), toolsController.pdfToImages);

  // Rota para converter PDF para documento
  router.post('/pdf-to-document', upload.single('pdf'), toolsController.pdfToDocument);

  // Rota para editar PDF
  router.post('/edit-pdf', upload.single('pdf'), toolsController.editPdf);

  // Rota para gerar QR Code
  router.post('/generate-qr-code', toolsController.generateQrCode);

  // Rota para contato
  router.post('/contato', toolsController.contato);

  // Rota para armazenamento temporário
  router.post('/temp-store', upload.single('file'), toolsController.storeFile);
  router.get('/temp-retrieve/:fileId', toolsController.retrieveFile);

  // Rota de teste
  router.get('/test', (req, res) => {
    res.json({
      message: 'API funcionando!',
      timestamp: new Date().toISOString()
    });
  });

  return router;
}