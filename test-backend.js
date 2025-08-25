import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// URL base para testes
const BASE_URL = 'http://localhost:3000';

// Função para testar endpoints
async function testEndpoint(endpoint, method = 'GET', data = null, files = null) {
  console.log(`\n🧪 Testando ${method} ${endpoint}...`);
  
  try {
    let options = {
      method,
      headers: {}
    };
    
    // Adicionar dados ao corpo da requisição
    if (data && !files) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
    
    // Adicionar arquivos usando FormData
    if (files) {
      const formData = new FormData();
      
      // Adicionar campos de dados
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }
      
      // Adicionar arquivos
      if (Array.isArray(files)) {
        files.forEach((file, index) => {
          formData.append('files', fs.createReadStream(file.path), file.name);
        });
      } else {
        formData.append('file', fs.createReadStream(files.path), files.name);
      }
      
      options.body = formData;
      options.headers = formData.getHeaders();
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const contentType = response.headers.get('content-type');
    
    let responseData;
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else if (contentType && contentType.includes('text/')) {
      responseData = await response.text();
    } else {
      responseData = await response.buffer();
    }
    
    console.log(`✅ Status: ${response.status}`);
    console.log('📄 Resposta:', typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : responseData);
    
    return { success: response.ok, data: responseData, status: response.status };
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Função principal para executar testes
async function runTests() {
  console.log('🚀 Iniciando testes do backend...');
  
  // Testar endpoint de saúde
  await testEndpoint('/api/health');
  
  // Testar compressão de imagem (simulado)
  console.log('\n⏳ Testes de compressão de imagem seriam executados com um arquivo real');
  
  // Testar mesclagem de PDF (simulado)
  console.log('\n⏳ Testes de mesclagem de PDF seriam executados com arquivos reais');
  
  // Testar OCR (simulado)
  console.log('\n⏳ Testes de OCR seriam executados com uma imagem real');
  
  console.log('\n✅ Testes concluídos!');
}

// Executar testes
runTests().catch(console.error);