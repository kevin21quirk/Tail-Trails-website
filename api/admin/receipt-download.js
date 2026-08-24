const { sql } = require('../../lib/db');
const { getTokenFromReq, verifyToken } = require('../../lib/auth');

const fmtMoney = (n) => '£' + Number(n).toFixed(2);
const pad = (n) => String(n).padStart(5, '0');
function fmtDate(val, opts) {
  if (!val) return '—';
  const s = typeof val === 'string' ? val.slice(0, 10) : new Date(val).toISOString().slice(0, 10);
  return new Date(s + 'T00:00').toLocaleDateString('en-GB', opts || { day: 'numeric', month: 'long', year: 'numeric' });
}

module.exports = async function handler(req, res) {
  try {
    const token = getTokenFromReq(req);
    if (!token) throw new Error('no token');
    const auth = verifyToken(token);
    if (auth.role !== 'admin') throw new Error('forbidden');
  } catch {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(401).send('<html><body style="font-family:sans-serif;padding:2rem"><h2>Unauthorized</h2><p><a href="/login.html#admin">Return to login</a></p></body></html>');
  }

  const { id } = req.query;
  if (!id) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.status(400).send('<html><body>Missing receipt id.</body></html>'); }

  try {
    const rows = await sql`
      SELECT r.*,
        u.name AS client_name, u.email AS client_email, u.address AS client_address,
        i.invoice_number, i.description AS invoice_description, i.due_date AS invoice_due_date,
        b.service AS b_service, b.booking_date AS b_date
      FROM receipts r
      JOIN users u ON u.id = r.client_id
      LEFT JOIN invoices i ON i.id = r.invoice_id
      LEFT JOIN bookings b ON b.id = i.booking_id
      WHERE r.id = ${id}
    `;
    if (!rows[0]) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.status(404).send('<html><body>Receipt not found.</body></html>'); }

    const rec = rows[0];
    const numStr = rec.invoice_number ? pad(rec.invoice_number) : 'N/A';
    const SVC = { walk: 'Dog Walking', daycare: 'Day Care', feeding: 'Feeding / Home Visit', combined: 'Combined Day Care & Walk' };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Receipt #${numStr} – Tails &amp; Trails by Alyssia</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#1a1a1a;background:#e8e8e8;}
    .page{max-width:794px;margin:24px auto;background:#fff;padding:42px 48px;min-height:820px;position:relative;box-shadow:0 3px 28px rgba(0,0,0,.2);}
    @media print{
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      body{background:#fff;}
      .page{box-shadow:none;margin:0;padding:18mm 20mm;max-width:100%;min-height:unset;}
      .no-print{display:none!important;}
      @page{size:A4 portrait;margin:0;}
    }
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:22px;border-bottom:3px solid #2d5a27;margin-bottom:30px;}
    .logo{width:62px;height:62px;object-fit:contain;border-radius:8px;}
    .co-name{font-size:19pt;font-weight:900;color:#2d5a27;letter-spacing:-.5px;line-height:1.1;}
    .co-tag{font-size:9pt;color:#5a7a5a;margin-top:3px;}
    .co-info{font-size:8.5pt;color:#666;margin-top:8px;line-height:1.7;}
    .doc-type{font-size:30pt;font-weight:900;color:#2d5a27;letter-spacing:5px;text-align:right;}
    .doc-meta{font-size:9.5pt;color:#555;margin-top:8px;text-align:right;line-height:1.85;}
    .doc-meta strong{color:#1a1a1a;}
    .section-row{display:flex;justify-content:flex-start;gap:48px;margin-bottom:28px;flex-wrap:wrap;}
    .bill-to h4{font-size:7.5pt;text-transform:uppercase;letter-spacing:1.3px;color:#2d5a27;margin-bottom:7px;font-weight:800;}
    .bill-to p{font-size:10.5pt;line-height:1.8;color:#333;}
    .paid-box{background:#e6efe4;border:2px solid #2d5a27;border-radius:12px;padding:22px 28px;margin-bottom:26px;display:flex;justify-content:space-between;align-items:center;}
    .paid-box .label{font-size:9pt;text-transform:uppercase;letter-spacing:1px;color:#2d5a27;font-weight:700;margin-bottom:4px;}
    .paid-box .amount{font-size:28pt;font-weight:900;color:#2d5a27;}
    .paid-confirm{font-size:13pt;font-weight:700;color:#2d5a27;}
    .paid-date{font-size:9pt;color:#5a7a5a;margin-top:3px;}
    table.items{width:100%;border-collapse:collapse;margin-bottom:18px;}
    table.items thead tr{background:#2d5a27;}
    table.items thead th{color:#fff;padding:10px 14px;text-align:left;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.6px;}
    table.items tbody td{padding:13px 14px;border-bottom:1px solid #e8f0e6;font-size:10.5pt;}
    table.items tbody tr:last-child td{border-bottom:none;}
    table.items tfoot tr{border-top:2px solid #2d5a27;}
    table.items tfoot td{padding:10px 14px;font-size:12pt;font-weight:900;color:#2d5a27;}
    .footer{border-top:1px solid #e8f0e6;padding-top:18px;margin-top:32px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;}
    .ft-left .ty{font-size:11pt;font-weight:700;color:#2d5a27;margin-bottom:5px;}
    .ft-left p,.ft-right p{font-size:8.5pt;color:#999;line-height:1.7;}
    .ft-right{text-align:right;}
    .print-btn{position:fixed;bottom:22px;right:22px;background:#2d5a27;color:#fff;border:none;padding:13px 26px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:700;box-shadow:0 5px 18px rgba(45,90,39,.45);z-index:100;letter-spacing:.3px;}
    .print-btn:hover{background:#1a3d18;}
  </style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <div style="display:flex;align-items:flex-start;gap:14px">
      <img src="/Public/tailsandtrailslogo%20(2).png" class="logo" alt="Tails &amp; Trails by Alyssia" onerror="this.style.display='none'"/>
      <div>
        <div class="co-name">Tails &amp; Trails by Alyssia</div>
        <div class="co-tag">Professional Dog Care</div>
        <div class="co-info">Douglas, Isle of Man<br>Alyssia.k.quirk@gmail.com</div>
      </div>
    </div>
    <div>
      <div class="doc-type">RECEIPT</div>
      <div class="doc-meta">
        Receipt No: <strong>#${numStr}</strong><br>
        ${rec.invoice_number ? `Invoice Ref: <strong>#${numStr}</strong><br>` : ''}
        Date Paid: <strong>${fmtDate(rec.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
      </div>
    </div>
  </div>

  <div class="section-row">
    <div class="bill-to">
      <h4>Payment From</h4>
      <p>
        <strong>${rec.client_name}</strong><br>
        ${rec.client_address ? rec.client_address + '<br>' : ''}
        ${rec.client_email || ''}
      </p>
    </div>
  </div>

  <div class="paid-box">
    <div>
      <div class="paid-confirm">✓ Payment Received</div>
      <div class="paid-date">Received on ${fmtDate(rec.created_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Amount Paid</div>
      <div class="amount">${fmtMoney(rec.amount)}</div>
    </div>
  </div>

  <table class="items">
    <thead><tr><th>Description</th><th>Amount</th></tr></thead>
    <tbody>
      <tr>
        <td>
          ${rec.invoice_description || 'Dog care services'}
          ${rec.b_date ? `<br><span style="font-size:8.5pt;color:#999">${SVC[rec.b_service] || rec.b_service} &middot; ${fmtDate(rec.b_date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>` : ''}
        </td>
        <td style="text-align:right;font-weight:700">${fmtMoney(rec.amount)}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr><td style="text-align:right;padding-right:4px"><strong>Total Paid</strong></td><td style="text-align:right;font-size:13pt">${fmtMoney(rec.amount)}</td></tr>
    </tfoot>
  </table>

  <p style="font-size:8pt;color:#bbb;font-style:italic;text-align:right;margin-bottom:26px">VAT not applicable — Tails &amp; Trails by Alyssia is not VAT registered</p>

  <div class="footer">
    <div class="ft-left">
      <div class="ty">Thank you — payment confirmed! 🐾</div>
      <p>This receipt confirms payment of ${fmtMoney(rec.amount)} has been received.<br>Please keep this for your records.</p>
    </div>
    <div class="ft-right">
      <p>Tails &amp; Trails by Alyssia<br>Douglas, Isle of Man<br>Alyssia.k.quirk@gmail.com</p>
    </div>
  </div>
</div>
<button class="print-btn no-print" onclick="window.print()">🖨️ Save / Print as PDF</button>
<script>setTimeout(function(){ window.print(); }, 400);</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Receipt download error:', err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(`<html><body style="font-family:sans-serif;padding:2rem"><h2>Error</h2><pre>${err.message}</pre></body></html>`);
  }
};
