// Script para testar notificação IA Tools
// Execute com: node test-ia-tools.js

import axios from 'axios';

const testIaToolsNotification = async () => {
  console.log('🧪 Testando notificação IA Tools...\n');
  
  // Dados de teste
  const testData = {
    email: 'teste@exemplo.com',
    feature: 'PDF Inteligente'
  };
  
  // URL do backend local (ajuste conforme necessário)
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('📤 Enviando dados de teste:', testData);
    console.log('🌐 URL:', `${baseUrl}/api/notify-ia-tools`);
    
    const response = await axios.post(`${baseUrl}/api/notify-ia-tools`, testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ Resposta do servidor:');
    console.log('Status:', response.status);
    console.log('Dados:', response.data);
    
    if (response.data.success) {
      console.log('\n🎉 Teste bem-sucedido! Notificação IA Tools funcionando corretamente.');
    } else {
      console.log('\n⚠️ Teste falhou - resposta indica erro:', response.data.error);
    }
    
  } catch (error) {
    console.log('\n❌ Erro no teste:');
    
    if (error.response) {
      console.log('Status HTTP:', error.response.status);
      console.log('Dados da resposta:', error.response.data);
    } else if (error.request) {
      console.log('Erro de rede - servidor pode não estar rodando');
      console.log('💡 Dica: Inicie o servidor com "npm start" na pasta SmartFile---Backend');
    } else {
      console.log('Erro:', error.message);
    }
  }
};

// Testar também com form-data
const testWithFormData = async () => {
  console.log('\n\n🧪 Testando com application/x-www-form-urlencoded...\n');
  
  const formData = new URLSearchParams();
  formData.append('email', 'teste2@exemplo.com');
  formData.append('feature', 'Texto Inteligente');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('📤 Enviando dados como form-data');
    
    const response = await axios.post(`${baseUrl}/api/notify-ia-tools`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('\n✅ Resposta do servidor (form-data):');
    console.log('Status:', response.status);
    console.log('Dados:', response.data);
    
  } catch (error) {
    console.log('\n❌ Erro no teste form-data:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Erro:', error.response.data);
    } else {
      console.log('Erro de rede');
    }
  }
};

// Executar testes
const runAllTests = async () => {
  await testIaToolsNotification();
  await testWithFormData();
  
  console.log('\n📝 Resumo dos testes concluído!');
  console.log('💡 Verifique os logs do servidor e seu email para confirmar o funcionamento.');
};

runAllTests();
