// api/test-email.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: 'Teste de produção - SmartFiles',
      text: 'Se você recebeu este e-mail, o SMTP está funcionando!'
    });
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
