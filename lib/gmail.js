const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const FROM = 'Alyssia.k.quirk@gmail.com';

async function getAccessToken() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  const { token } = await oauth2Client.getAccessToken();
  return token;
}

async function sendMail({ to, replyTo, subject, html, attachment }) {
  const accessToken = await getAccessToken();

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: FROM,
      accessToken,
    },
  });

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
