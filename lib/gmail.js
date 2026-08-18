const { google } = require('googleapis');

const FROM = 'Alyssia.k.quirk@gmail.com';

function encodeSubject(text) {
  return `=?UTF-8?B?${Buffer.from(text).toString('base64')}?=`;
}

function b64(buf) {
  const s = Buffer.isBuffer(buf) ? buf.toString('base64') : Buffer.from(buf).toString('base64');
  return s.match(/.{1,76}/g).join('\r\n');
}

function buildRaw({ to, replyTo, subject, html, attachment }) {
  const hdrs = [
    `From: "Tails & Trails" <${FROM}>`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : null,
    `Subject: ${encodeSubject(subject)}`,
    `MIME-Version: 1.0`,
  ].filter(v => v !== null);

  let body;
  if (!attachment) {
    hdrs.push(`Content-Type: text/html; charset=UTF-8`);
    hdrs.push(`Content-Transfer-Encoding: base64`);
    body = b64(html);
  } else {
    const boundary = `TTBoundary${Date.now()}`;
    hdrs.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    body = [
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      b64(html),
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      ``,
      b64(attachment.data),
      ``,
      `--${boundary}--`,
    ].join('\r\n');
  }

  const raw = hdrs.join('\r\n') + '\r\n\r\n' + body;
  return Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeGmail() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

async function sendMail({ to, replyTo, subject, html, attachment }) {
  const gmail = makeGmail();
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: buildRaw({ to, replyTo, subject, html, attachment }) },
  });
}

module.exports = { sendMail, FROM };
