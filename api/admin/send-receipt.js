const { sql } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const { sendMail } = require('../../lib/gmail');
const { generateReceiptPdf } = require('../../lib/pdf');

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

function receiptHtml({ rec }) {
  const num = rec.invoice_number ? '#' + padNum(rec.invoice_number) : '\u2014';
  const datePaid = fmtDate(rec.created_at);
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;padding:0">
  <div style="background:#2d5a27;padding:22px 28px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center">
    <h2 style="color:#fff;margin:0;font-size:1.3rem">\ud83d\udc3e Tails &amp; Trails</h2>
    <span style="color:#b8d4b5;font-size:.9rem">RECEIPT ${num}</span>
  </div>
  <div style="background:#f9f9f7;padding:28px;border-radius:0 0 10px 10px;border:1px solid #e0e0d8;border-top:none">
    <p style="margin:0 0 6px">Hi <strong>${rec.client_name}</strong>,</p>
    <p style="margin:0 0 22px;color:#666">Thank you for your payment &mdash; this is your receipt.</p>

    <div style="background:#e6efe4;border-radius:10px;padding:20px 22px;text-align:center;margin-bottom:24px">
      <div style="font-size:1.4rem;font-weight:700;color:#2d5a27;margin-bottom:4px">\u2713 Payment Received</div>
      <div style="font-size:2.2rem;font-weight:700;color:#2d5a27">${fmtMoney(rec.amount)}</div>
      <div style="font-size:.85rem;color:#5a8a54;margin-top:6px">Received on ${datePaid}</div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:.93rem;margin-bottom:22px">
      <tr><td style="padding:9px 12px;font-weight:700;color:#2d5a27;width:150px;border-bottom:1px solid #ece9e1">Receipt no.</td><td style="padding:9px 12px;border-bottom:1px solid #ece9e1">${num}</td></tr>
      <tr style="background:#fff"><td style="padding:9px 12px;font-weight:700;color:#2d5a27;border-bottom:1px solid #ece9e1">Date paid</td><td style="padding:9px 12px;border-bottom:1px solid #ece9e1">${datePaid}</td></tr>
      ${rec.invoice_description ? `<tr><td style="padding:9px 12px;font-weight:700;color:#2d5a27">For</td><td style="padding:9px 12px">${rec.invoice_description}</td></tr>` : ''}
    </table>

    <p style="margin:0 0 6px;font-size:.9rem;color:#555">Please keep this receipt for your records.</p>
    <p style="margin:16px 0 0;font-size:.85rem;color:#999">Questions? Call or WhatsApp: <a href="tel:+447624354396" style="color:#2d5a27">+44 76 2435 4396</a></p>
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
  if (!id) return res.status(400).json({ error: 'Receipt id required.' });

  try {
    const rows = await sql`
      SELECT r.*, u.name AS client_name, u.email AS client_email,
        i.invoice_number, i.description AS invoice_description
      FROM receipts r
      JOIN users u ON u.id = r.client_id
      LEFT JOIN invoices i ON i.id = r.invoice_id
      WHERE r.id = ${id}
    `;
    const rec = rows[0];
    if (!rec) return res.status(404).json({ error: 'Receipt not found.' });

    const num = rec.invoice_number ? '#' + padNum(rec.invoice_number) : 'Receipt';
    const pdfBuffer = await generateReceiptPdf(rec);
    await sendMail({
      to: rec.client_email,
      subject: `Payment Receipt ${num} \u2013 Tails & Trails`,
      html: receiptHtml({ rec }),
      attachment: {
        filename: `receipt-${padNum(rec.invoice_number || 0)}.pdf`,
        data: pdfBuffer,
      },
    });

    await sql`UPDATE receipts SET email_sent_at = NOW() WHERE id = ${id}`;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Send receipt email error:', err?.response?.data || err.message);
    return res.status(500).json({ error: err.message || 'Could not send email.' });
  }
};
