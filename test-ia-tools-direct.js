// Script direto para testar envio de email IA Tools
// Execute com: node test-ia-tools-direct.js

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testarNotificacaoIaTools() {
  console.log('🤖 Testando notificação IA Tools diretamente...\n');
  
  const email = 'usuario.interessado@exemplo.com';
  const feature = 'PDF Inteligente';
  
  console.log('📝 Dados simulados:', { email, feature });
  
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.log('❌ Configurações de email não encontradas');
    return;
  }
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
  });
  
  const adminRecipient = process.env.ADMIN_EMAIL || 'murilomanoel221@gmail.com';
  const subject = `🤖 Novo interesse em IA Tools - ${feature}`;
  const text = `Novo interesse registrado no SmartFiles IA Tools!\n\n` +
               `📧 Email do usuário: ${email}\n` +
               `🛠️ Recurso interessado: ${feature}\n` +
               `📅 Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n` +
               `Responda para este email para entrar em contato diretamente.`;
  
  try {
    console.log('\n📧 Verificando conexão...');
    await transporter.verify();
    console.log('✅ Conexão verificada');
    
    console.log('📨 Enviando email de notificação IA Tools...');
    
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
              <span style="color: #34495e; background-color: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${feature}</span>
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
    
    console.log('\n✅ Email IA Tools enviado com sucesso!');
    console.log('📨 Message ID:', info.messageId);
    console.log('📬 Email enviado para:', adminRecipient);
    console.log('↩️ Reply-to configurado para:', email);
    
  } catch (error) {
    console.log('\n❌ Erro ao enviar email IA Tools:');
    console.error({
      message: error.message,
      code: error.code
    });
  }
}

testarNotificacaoIaTools();
