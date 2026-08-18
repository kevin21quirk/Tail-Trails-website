const { google } = require('googleapis');

const FROM = 'Alyssia.k.quirk@gmail.com';

function encodeSubject(text) {
  return `=?UTF-8?B?${Buffer.from(text).toString('base64')}?=`;
}

function b64Lines(buf) {
  const s = buf.toString('base64');
  return s.match(/.{1,76}/g).join('\r\n');
}

function buildRaw({ to, from, replyTo, subject, html, attachment }) {
  const toRaw = (lines) =>
    Buffer.from(lines.filter(v => v !== null).join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  if (!attachment) {
    return toRaw([
      `From: Tails & Trails <${from}>`,
      `To: ${to}`,
      replyTo ? `Reply-To: ${replyTo}` : null,
      `Subject: ${encodeSubject(subject)}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      html,
    ]);
  }

  const boundary = 'TTBoundary' + Date.now();
  const htmlB64  = b64Lines(Buffer.from(html));
  const pdfB64   = b64Lines(attachment.data);

  return toRaw([
    `From: Tails & Trails <${from}>`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : null,
    `Subject: ${encodeSubject(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    htmlB64,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${attachment.filename}"`,
    ``,
    pdfB64,
    ``,
    `--${boundary}--`,
  ]);
}

async function sendMail({ to, replyTo, subject, html, attachment }) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: buildRaw({ from: FROM, to, replyTo: replyTo || FROM, subject, html }),
    },
  });
}

module.exports = { sendMail, FROM };
