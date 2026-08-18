const nodemailer = require('nodemailer');

const FROM = 'Alyssia.k.quirk@gmail.com';

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: FROM,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    },
  });
}

async function sendMail({ to, replyTo, subject, html, attachment }) {
  const transporter = createTransport();
  const msg = {
    from: `"Tails & Trails" <${FROM}>`,
    to,
    replyTo: replyTo || FROM,
    subject,
    html,
  };
  if (attachment) {
    msg.attachments = [{
      filename: attachment.filename,
      content: attachment.data,
      contentType: 'application/pdf',
    }];
  }
  await transporter.sendMail(msg);
}

module.exports = { sendMail, FROM };
