import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

export default {
  // Configurações do servidor
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Configurações de CORS
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || '*',
  
  // Configurações de email
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM
  },
  
  // Configurações alternativas para Gmail
  gmail: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  },
  
  // Configurações de armazenamento temporário
  tempStorage: {
    dir: process.env.TEMP_STORAGE_DIR || './temp',
    expiry: parseInt(process.env.TEMP_STORAGE_EXPIRY || '86400000') // 24 horas em milissegundos
  },
  
  // Configurações de upload
  upload: {
    maxFileSize: 50 * 1024 * 1024 // 50 MB
  }
};