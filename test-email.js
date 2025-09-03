// Script para testar a configuração de email do backend
// Execute com: node test-email.js

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

function criarTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  } else if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
    });
  }
  return null;
}

async function testarEmail() {
  console.log('🔧 Testando configuração de email do backend...\n');
  
  console.log('📋 Variáveis de ambiente encontradas:');
  console.log({
    GMAIL_USER: !!process.env.GMAIL_USER ? '✅ Configurada' : '❌ Não configurada',
    GMAIL_PASS: !!process.env.GMAIL_PASS ? '✅ Configurada' : '❌ Não configurada',
    SMTP_FROM: !!process.env.SMTP_FROM ? '✅ Configurada' : '❌ Não configurada',
    ADMIN_EMAIL: !!process.env.ADMIN_EMAIL ? '✅ Configurada' : '❌ Não configurada',
    CORS_ORIGIN: !!process.env.CORS_ORIGIN ? '✅ Configurada' : '❌ Não configurada'
  });
  
  const transporter = criarTransporter();
  
  if (!transporter) {
    console.log('\n❌ Erro: Transporter não pôde ser criado');
    console.log('Verifique se as variáveis GMAIL_USER e GMAIL_PASS estão configuradas no arquivo .env');
    return;
  }
  
  console.log('\n✅ Transporter criado com sucesso');
  
  try {
    console.log('📧 Testando conexão SMTP...');
    await transporter.verify();
    console.log('✅ Conexão SMTP verificada com sucesso');
    
    console.log('📨 Enviando email de teste...');
    const adminRecipient = process.env.ADMIN_EMAIL || 'murilomanoel221@gmail.com';
    
    const info = await transporter.sendMail({
      from: `"SmartFiles - Teste Backend" <${process.env.SMTP_FROM || process.env.GMAIL_USER}>`,
      to: adminRecipient,
      subject: 'Teste de Configuração - SmartFiles Backend',
      text: `Email de teste do backend enviado com sucesso!\n\nData: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\nConfigurações funcionando corretamente.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
          <div style="background-color: #28a745; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🚀 Teste Backend - SmartFiles</h1>
          </div>
          <div style="background-color: white; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <p style="color: #28a745; font-size: 18px; margin-bottom: 20px;">✅ <strong>Configuração funcionando!</strong></p>
            <p style="color: #34495e;">Este email confirma que as configurações de email do backend estão funcionando corretamente.</p>
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e9ecef; color: #7f8c8d; font-size: 12px;">
              <strong>🕒 Data do teste:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            </div>
          </div>
        </div>
      `
    });
    
    console.log('✅ Email enviado com sucesso!');
    console.log('📨 ID da mensagem:', info.messageId);
    console.log('📬 Email enviado para:', adminRecipient);
    
  } catch (error) {
    console.log('\n❌ Erro ao testar email:');
    console.error({
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Dica: Verifique se você está usando uma "App Password" do Gmail, não a senha normal.');
      console.log('Como gerar: https://support.google.com/accounts/answer/185833');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 Dica: Problema de conexão - verifique sua conexão com a internet');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n💡 Dica: Não foi possível conectar ao servidor Gmail');
    }
  }
}

testarEmail();
