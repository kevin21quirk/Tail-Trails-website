const { sql } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const { sendMail } = require('../../lib/gmail');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function fmtMoney(v) { return '\u00a3' + Number(v).toFixed(2); }
function fmtDate(v) {
  if (!v) return '\u2014';
  return new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function padNum(n) { return String(n).padStart(5, '0'); }

function invoiceHtml({ inv }) {
  const num = '#' + padNum(inv.invoice_number);
  const issued = fmtDate(inv.created_at);
  const due = inv.due_date ? fmtDate(inv.due_date) : null;
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;padding:0">
  <div style="background:#2d5a27;padding:22px 28px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center">
    <h2 style="color:#fff;margin:0;font-size:1.3rem">\ud83d\udc3e Tails &amp; Trails</h2>
    <span style="color:#b8d4b5;font-size:.9rem">INVOICE ${num}</span>
  </div>
  <div style="background:#f9f9f7;padding:28px;border-radius:0 0 10px 10px;border:1px solid #e0e0d8;border-top:none">
    <p style="margin:0 0 6px">Hi <strong>${inv.client_name}</strong>,</p>
    <p style="margin:0 0 22px;color:#666">Please find your invoice details below. Thank you for choosing Tails &amp; Trails!</p>

    <table style="width:100%;border-collapse:collapse;font-size:.93rem;margin-bottom:22px">
      <tr><td style="padding:9px 12px;font-weight:700;color:#2d5a27;width:150px;border-bottom:1px solid #ece9e1">Invoice no.</td><td style="padding:9px 12px;border-bottom:1px solid #ece9e1">${num}</td></tr>
      <tr style="background:#fff"><td style="padding:9px 12px;font-weight:700;color:#2d5a27;border-bottom:1px solid #ece9e1">Date issued</td><td style="padding:9px 12px;border-bottom:1px solid #ece9e1">${issued}</td></tr>
      ${due ? `<tr><td style="padding:9px 12px;font-weight:700;color:#2d5a27;border-bottom:1px solid #ece9e1">Due date</td><td style="padding:9px 12px;border-bottom:1px solid #ece9e1">${due}</td></tr>` : ''}
      <tr style="background:#fff"><td style="padding:9px 12px;font-weight:700;color:#2d5a27;border-bottom:1px solid #ece9e1">Description</td><td style="padding:9px 12px;border-bottom:1px solid #ece9e1">${inv.description || 'Dog care services'}</td></tr>
    </table>

    <div style="background:#fff;border:2px solid #2d5a27;border-radius:10px;padding:18px 22px;text-align:center;margin-bottom:24px">
      <div style="font-size:.82rem;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Amount Due</div>
      <div style="font-size:2.2rem;font-weight:700;color:#2d5a27">${fmtMoney(inv.amount)}</div>
    </div>

    <p style="margin:0 0 6px;font-size:.9rem;color:#555">To pay, please bank transfer to the details I will send you separately, or get in touch and I&rsquo;ll help you arrange payment.</p>
    <p style="margin:0 0 6px;font-size:.9rem;color:#555">Please use invoice number <strong>${num}</strong> as your payment reference.</p>
    <p style="margin:20px 0 0;font-size:.85rem;color:#999">Questions? Call or WhatsApp: <a href="tel:+447624354396" style="color:#2d5a27">+44 76 2435 4396</a></p>
    <hr style="border:none;border-top:1px solid #ddd;margin:20px 0 14px">
    <p style="font-size:.78rem;color:#aaa;margin:0">VAT not applicable &mdash; Tails &amp; Trails is not VAT registered</p>
  </div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = requireAuth(req, res);
  if (!auth) return;
  if (auth.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Invoice id required.' });

  try {
    const rows = await sql`
      SELECT i.*, u.name AS client_name, u.email AS client_email
      FROM invoices i
      JOIN users u ON u.id = i.client_id
      WHERE i.id = ${id}
    `;
    const inv = rows[0];
    if (!inv) return res.status(404).json({ error: 'Invoice not found.' });

    const num = '#' + padNum(inv.invoice_number);
    await sendMail({
      to: inv.client_email,
      subject: `Invoice ${num} \u2013 Tails & Trails`,
      html: invoiceHtml({ inv }),
    });

    await sql`UPDATE invoices SET email_sent_at = NOW() WHERE id = ${id}`;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Send invoice email error:', err?.response?.data || err.message);
    return res.status(500).json({ error: err.message || 'Could not send email.' });
  }
};
