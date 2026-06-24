const nodemailer = require('nodemailer');

/**
 * Envia um e-mail de recuperação de senha.
 * Se as variáveis de ambiente SMTP não estiverem definidas, o link será logado no console.
 */
async function sendPasswordResetEmail(email, token, appUrl = 'http://localhost:5173') {
  const resetLink = `${appUrl}/?token=${token}`;

  const hasSmtp = process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!hasSmtp) {
    console.log('\n==================================================');
    console.log('📬 [DESENVOLVIMENTO] E-MAIL DE RECUPERAÇÃO DE SENHA');
    console.log(`Para: ${email}`);
    console.log(`Link: ${resetLink}`);
    console.log('==================================================\n');
    return { devMode: true, link: resetLink };
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"Padaria Floresta" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Recuperação de Senha — Padaria Floresta',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            background-color: #120c08;
            color: #faf6f0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #1a1512;
            border: 1px solid rgba(232, 158, 58, 0.25);
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          .email-header {
            text-align: center;
            margin-bottom: 30px;
          }
          .email-title {
            color: #e5a25d;
            font-size: 24px;
            margin-top: 10px;
            font-weight: normal;
          }
          .email-body {
            font-size: 16px;
            line-height: 1.6;
            color: #dcd1c4;
            margin-bottom: 30px;
          }
          .btn-container {
            text-align: center;
            margin: 35px 0;
          }
          .btn-reset {
            background-color: #e5a25d;
            color: #120c08 !important;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            display: inline-block;
            transition: background-color 0.2s;
          }
          .email-footer {
            border-top: 1px solid #403227;
            padding-top: 20px;
            font-size: 12px;
            color: #9e8e80;
            text-align: center;
          }
          .email-motto {
            font-style: italic;
            color: #e5a25d;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div style="padding: 20px;">
          <div class="email-container">
            <div class="email-header">
              <span style="font-size: 40px;">🥖</span>
              <h1 class="email-title">Padaria Floresta</h1>
              <p class="email-motto">Nunca foi sorte, sempre foi Deus</p>
            </div>
            
            <div class="email-body">
              <p>Olá,</p>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema da Padaria Floresta.</p>
              <p>Para prosseguir com a redefinição de senha, por favor clique no botão abaixo. Este link expira em 1 hora.</p>
              
              <div class="btn-container">
                <a href="${resetLink}" class="btn-reset" target="_blank">Redefinir Minha Senha</a>
              </div>
              
              <p>Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
              <p style="word-break: break-all; font-size: 14px; color: #e5a25d;">${resetLink}</p>
            </div>
            
            <div class="email-footer">
              <p>Este é um e-mail automático enviado pelo sistema da Padaria Floresta.</p>
              <p>Se você não solicitou a redefinição de senha, ignore este e-mail. Nenhuma alteração foi feita na sua conta.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Olá,\n\nRecebemos uma solicitação para redefinir a senha da sua conta no sistema da Padaria Floresta.\n\nPara redefinir sua senha, acesse o link abaixo. Este link expira em 1 hora:\n\n${resetLink}\n\nSe você não solicitou isso, pode ignorar este e-mail.\n\nPadaria Floresta — Nunca foi sorte, sempre foi Deus`
  };

  await transporter.sendMail(mailOptions);
  return { success: true };
}

module.exports = { sendPasswordResetEmail };
