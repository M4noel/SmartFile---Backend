/**
 * Middleware para validar o tamanho dos arquivos enviados
 * @param {Object} req - Objeto de requisição Express
 * @param {Object} res - Objeto de resposta Express
 * @param {Function} next - Função next do Express
 */
export default function fileSizeValidator(req, res, next) {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  // Verificar arquivo único
  if (req.file && req.file.size > MAX_FILE_SIZE) {
    return res.status(413).json({
      success: false,
      error: 'Arquivo muito grande. O tamanho máximo permitido é 50 MB.'
    });
  }

  // Verificar múltiplos arquivos
  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files) {
      if (file.size > MAX_FILE_SIZE) {
        return res.status(413).json({
          success: false,
          error: `Arquivo ${file.originalname} muito grande. O tamanho máximo permitido é 50 MB.`
        });
      }
    }
  }

  next();
}