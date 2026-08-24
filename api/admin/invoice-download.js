const { sql } = require('../../lib/db');
const { getTokenFromReq, verifyToken } = require('../../lib/auth');

const SVC = { walk: 'Dog Walking', daycare: 'Day Care', feeding: 'Feeding / Home Visit', combined: 'Combined Day Care & Walk' };
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
  if (!id) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.status(400).send('<html><body>Missing invoice id.</body></html>'); }

  try {
    const rows = await sql`
      SELECT i.*,
        u.name AS client_name, u.email AS client_email, u.phone AS client_phone, u.address AS client_address,
        b.service AS b_service, b.booking_date AS b_date, b.start_time AS b_start, b.end_time AS b_end
      FROM invoices i
      JOIN users u ON u.id = i.client_id
      LEFT JOIN bookings b ON b.id = i.booking_id
      WHERE i.id = ${id}
    `;
    if (!rows[0]) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.status(404).send('<html><body>Invoice not found.</body></html>'); }

    const inv = rows[0];
    const numStr = pad(inv.invoice_number);
    const isPaid = inv.status === 'paid';

    const bookingBlock = inv.b_date ? `
      <div class="bill-to">
        <h4>Booking Reference</h4>
        <p>
          <strong>${SVC[inv.b_service] || inv.b_service || '—'}</strong><br>
          ${fmtDate(inv.b_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}<br>
          ${inv.b_start ? String(inv.b_start).slice(0, 5) : ''}${inv.b_end ? ' – ' + String(inv.b_end).slice(0, 5) : ''}
        </p>
      </div>` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Invoice #${numStr} – Tails &amp; Trails by Alyssia</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#1a1a1a;background:#e8e8e8;}
    .page{max-width:794px;margin:24px auto;background:#fff;padding:42px 48px;min-height:1060px;position:relative;box-shadow:0 3px 28px rgba(0,0,0,.2);}
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
    .s-paid{color:#2d5a27;font-weight:800;}
    .s-unpaid{color:#856404;font-weight:800;}
    .section-row{display:flex;justify-content:flex-start;gap:48px;margin-bottom:28px;flex-wrap:wrap;}
    .bill-to h4{font-size:7.5pt;text-transform:uppercase;letter-spacing:1.3px;color:#2d5a27;margin-bottom:7px;font-weight:800;}
    .bill-to p{font-size:10.5pt;line-height:1.8;color:#333;}
    table.items{width:100%;border-collapse:collapse;margin-bottom:18px;}
    table.items thead tr{background:#2d5a27;}
    table.items thead th{color:#fff;padding:10px 14px;text-align:left;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.6px;}
    table.items thead th:last-child{text-align:right;}
    table.items tbody td{padding:14px 14px;border-bottom:1px solid #e8f0e6;font-size:10.5pt;vertical-align:top;}
    table.items tbody td:last-child{text-align:right;font-weight:700;white-space:nowrap;}
    table.items tfoot td{padding:8px 14px;font-size:10pt;}
    .item-sub{font-size:8.5pt;color:#999;margin-top:3px;}
    .totals{margin-left:auto;width:260px;margin-bottom:5px;}
    .tot-row{display:flex;justify-content:space-between;padding:6px 0;font-size:10pt;color:#666;border-bottom:1px dashed #e0e0e0;}
    .tot-final{display:flex;justify-content:space-between;padding:10px 0;font-size:15pt;font-weight:900;color:#2d5a27;border-top:2px solid #2d5a27;margin-top:4px;}
    .vat-note{text-align:right;font-size:8pt;color:#bbb;font-style:italic;margin-bottom:26px;}
    .paid-stamp{position:absolute;top:108px;right:48px;width:115px;height:115px;border:5px solid #2d5a27;border-radius:50%;display:flex;align-items:center;justify-content:center;transform:rotate(-18deg);opacity:.15;font-size:14pt;font-weight:900;letter-spacing:3px;color:#2d5a27;pointer-events:none;}
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
  ${isPaid ? '<div class="paid-stamp">PAID</div>' : ''}
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
      <div class="doc-type">INVOICE</div>
      <div class="doc-meta">
        Invoice No: <strong>#${numStr}</strong><br>
        Date: <strong>${fmtDate(inv.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</strong><br>
        ${inv.due_date ? `Due: <strong>${fmtDate(inv.due_date, { day: 'numeric', month: 'short', year: 'numeric' })}</strong><br>` : ''}
        Status: <span class="${isPaid ? 's-paid' : 's-unpaid'}">${isPaid ? 'PAID' : 'OUTSTANDING'}</span>
      </div>
    </div>
  </div>

  <div class="section-row">
    <div class="bill-to">
      <h4>Bill To</h4>
      <p>
        <strong>${inv.client_name}</strong><br>
        ${inv.client_address ? inv.client_address + '<br>' : ''}
        ${inv.client_email || ''}<br>
        ${inv.client_phone || ''}
      </p>
    </div>
    ${bookingBlock}
  </div>

  <table class="items">
    <thead><tr><th>Description</th><th>Amount</th></tr></thead>
    <tbody>
      <tr>
        <td>
          ${inv.description || 'Dog care services'}
          ${inv.b_date ? `<div class="item-sub">${SVC[inv.b_service] || inv.b_service} &nbsp;&middot;&nbsp; ${fmtDate(inv.b_date, { day: 'numeric', month: 'short', year: 'numeric' })}</div>` : ''}
        </td>
        <td>${fmtMoney(inv.amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="tot-row"><span>Subtotal</span><span>${fmtMoney(inv.amount)}</span></div>
    <div class="tot-final"><span>Total</span><span>${fmtMoney(inv.amount)}</span></div>
  </div>
  <div class="vat-note">VAT not applicable — Tails &amp; Trails by Alyssia is not VAT registered</div>

  <div class="footer">
    <div class="ft-left">
      <div class="ty">Thank you for choosing Tails &amp; Trails by Alyssia! 🐾</div>
      <p>Please make payment by bank transfer by the due date shown above.<br>Use payment reference: <strong>Invoice #${numStr}</strong></p>
    </div>
    <div class="ft-right">
      <p>Questions? Contact us:<br>Alyssia.k.quirk@gmail.com</p>
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
    console.error('Invoice download error:', err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(`<html><body style="font-family:sans-serif;padding:2rem"><h2>Error</h2><pre>${err.message}</pre></body></html>`);
  }
};
