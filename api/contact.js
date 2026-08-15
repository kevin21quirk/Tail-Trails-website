const { google } = require('googleapis');

const ALYSSIA_EMAIL = 'Alyssia.k.quirk@gmail.com';

const SERVICE_LABELS = {
  walk: 'Dog Walking',
  daycare: 'Day Care',
  feeding: 'Feeding / Home Visit',
  combined: 'Combined Day Care & Walk',
};

function buildRaw({ to, from, subject, html }) {
  const msg = [
    `From: Tails & Trails <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    html,
  ].join('\r\n');
  return Buffer.from(msg)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function alyssiaEmail({ name, dog, email, phone, service, message }) {
  const serviceLabel = SERVICE_LABELS[service] || service;
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;padding:0">
  <div style="background:#2d5a27;padding:22px 28px;border-radius:10px 10px 0 0">
    <h2 style="color:#fff;margin:0;font-size:1.3rem">🐾 New Enquiry — Tails &amp; Trails</h2>
  </div>
  <div style="background:#f9f9f7;padding:28px;border-radius:0 0 10px 10px;border:1px solid #e0e0d8;border-top:none">
    <table style="width:100%;border-collapse:collapse;font-size:.95rem">
      <tr><td style="padding:10px 12px;font-weight:700;color:#2d5a27;width:170px;border-bottom:1px solid #ece9e1">Name</td><td style="padding:10px 12px;border-bottom:1px solid #ece9e1">${name}</td></tr>
      <tr style="background:#fff"><td style="padding:10px 12px;font-weight:700;color:#2d5a27;border-bottom:1px solid #ece9e1">Dog's name &amp; breed</td><td style="padding:10px 12px;border-bottom:1px solid #ece9e1">${dog}</td></tr>
      <tr><td style="padding:10px 12px;font-weight:700;color:#2d5a27;border-bottom:1px solid #ece9e1">Email</td><td style="padding:10px 12px;border-bottom:1px solid #ece9e1"><a href="mailto:${email}" style="color:#2d5a27">${email}</a></td></tr>
      <tr style="background:#fff"><td style="padding:10px 12px;font-weight:700;color:#2d5a27;border-bottom:1px solid #ece9e1">Phone / WhatsApp</td><td style="padding:10px 12px;border-bottom:1px solid #ece9e1">${phone || '<em style="color:#aaa">not provided</em>'}</td></tr>
      <tr><td style="padding:10px 12px;font-weight:700;color:#2d5a27;border-bottom:1px solid #ece9e1">Service</td><td style="padding:10px 12px;border-bottom:1px solid #ece9e1">${serviceLabel}</td></tr>
      <tr style="background:#fff"><td style="padding:10px 12px;font-weight:700;color:#2d5a27;vertical-align:top">Message</td><td style="padding:10px 12px">${message ? message.replace(/\n/g, '<br>') : '<em style="color:#aaa">No message provided</em>'}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #ddd;margin:24px 0 16px">
    <p style="font-size:.82rem;color:#999;margin:0">Sent via the Tails &amp; Trails website contact form</p>
  </div>
</body>
</html>`;
}

function clientEmail({ name, dog, email, service, message }) {
  const serviceLabel = SERVICE_LABELS[service] || service;
  const dogFirstName = dog.split(',')[0].trim();
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;padding:0">
  <div style="background:#2d5a27;padding:22px 28px;border-radius:10px 10px 0 0">
    <h2 style="color:#fff;margin:0;font-size:1.3rem">Thanks for getting in touch, ${name}! 🐾</h2>
  </div>
  <div style="background:#f9f9f7;padding:28px;border-radius:0 0 10px 10px;border:1px solid #e0e0d8;border-top:none">
    <p style="margin:0 0 18px">I've received your enquiry and will be in touch as soon as possible to arrange a free, relaxed meet &amp; greet for you and ${dogFirstName}.</p>
    <h3 style="color:#2d5a27;font-size:1rem;margin:0 0 12px">Your enquiry details:</h3>
    <table style="width:100%;border-collapse:collapse;font-size:.95rem">
      <tr><td style="padding:10px 12px;font-weight:700;color:#2d5a27;width:170px;border-bottom:1px solid #ece9e1">Dog's name &amp; breed</td><td style="padding:10px 12px;border-bottom:1px solid #ece9e1">${dog}</td></tr>
      <tr style="background:#fff"><td style="padding:10px 12px;font-weight:700;color:#2d5a27;border-bottom:1px solid #ece9e1">Service requested</td><td style="padding:10px 12px;border-bottom:1px solid #ece9e1">${serviceLabel}</td></tr>
      ${message ? `<tr><td style="padding:10px 12px;font-weight:700;color:#2d5a27;vertical-align:top">Your message</td><td style="padding:10px 12px">${message.replace(/\n/g, '<br>')}</td></tr>` : ''}
    </table>
    <p style="margin:24px 0 6px">In the meantime, feel free to call or WhatsApp me on <strong>+44 76 2435 4396</strong>.</p>
    <p style="margin:0 0 24px">Looking forward to meeting you and ${dogFirstName} soon!</p>
    <p style="margin:0">Alyssia 🐕<br><strong style="color:#2d5a27">Tails &amp; Trails</strong><br>
    <a href="tel:+447624354396" style="color:#2d5a27">+44 76 2435 4396</a></p>
  </div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, dog, email, phone, service, message } = req.body || {};

  if (!name || !dog || !email || !service) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const fields = { name, dog, email, phone, service, message };

  try {
    await Promise.all([
      gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: buildRaw({
            to: ALYSSIA_EMAIL,
            from: ALYSSIA_EMAIL,
            subject: `New enquiry from ${name} – ${dog}`,
            html: alyssiaEmail(fields),
          }),
        },
      }),
      gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: buildRaw({
            to: email,
            from: ALYSSIA_EMAIL,
            subject: `Thanks for your enquiry – Tails & Trails`,
            html: clientEmail(fields),
          }),
        },
      }),
    ]);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Gmail API error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Could not send your message. Please call or WhatsApp instead.' });
  }
};
