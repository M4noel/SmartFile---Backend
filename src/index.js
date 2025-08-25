import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Carregar variáveis de ambiente
dotenv.config();

// Configurar caminhos
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const binPath = path.join(__dirname, '..', '..', 'bin');

// Adicionar o diretório bin ao PATH para qpdf
if (fs.existsSync(binPath)) {
  process.env.PATH = `${binPath}${path.delimiter}${process.env.PATH}`;
  console.log(`Diretório bin adicionado ao PATH: ${binPath}`);
}

// Importar rotas
import apiRoutes from './routes/api.js';

const app = express();

// Configurações
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar diretório temporário
const tempDir = process.env.TEMP_STORAGE_DIR || './temp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
app.use('/temp', express.static(tempDir));

// Configurar Multer para uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB limit
  }
});

// Rotas
const router = apiRoutes(upload);
app.use('/api', router);

// Rota de saúde/status
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});