const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

const CHROMIUM_PACK = 'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar';
const SITE = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.SITE_URL || 'https://tailsandtrails.im');

const SVC = { walk: 'Dog Walking', daycare: 'Day Care', feeding: 'Feeding / Home Visit', combined: 'Combined Day Care & Walk' };
function pad(n) { return String(n).padStart(5, '0'); }
function fmtMoney(n) { return '\u00a3' + Number(n).toFixed(2); }
function fmtDate(val, opts) {
  if (!val) return '\u2014';
  const s = typeof val === 'string' ? val.slice(0, 10) : new Date(val).toISOString().slice(0, 10);
  return new Date(s + 'T00:00').toLocaleDateString('en-GB', opts || { day: 'numeric', month: 'long', year: 'numeric' });
}

async function htmlToPdf(html) {
  const executablePath = await chromium.executablePath(CHROMIUM_PACK);
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  } finally {
    await browser.close();
  }
}

function invoiceHtml(inv) {
  const numStr = pad(inv.invoice_number);
  const isPaid = inv.status === 'paid';
  const bookingBlock = inv.b_date ? `
    <div class="bill-to">
      <h4>Booking Reference</h4>
      <p><strong>${SVC[inv.b_service] || inv.b_service || '\u2014'}</strong><br>
      ${fmtDate(inv.b_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}<br>
      ${inv.b_start ? String(inv.b_start).slice(0, 5) : ''}${inv.b_end ? ' \u2013 ' + String(inv.b_end).slice(0, 5) : ''}</p>
    </div>` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#1a1a1a;background:#fff;}
    .page{max-width:794px;margin:0 auto;background:#fff;padding:42px 48px;min-height:1060px;position:relative;}
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
    .item-sub{font-size:8.5pt;color:#999;margin-top:3px;}
    .totals{margin-left:auto;width:260px;margin-bottom:5px;}
    .tot-row{display:flex;justify-content:space-between;padding:6px 0;font-size:10pt;color:#666;border-bottom:1px dashed #e0e0e0;}
    .tot-final{display:flex;justify-content:space-between;padding:10px 0;font-size:15pt;font-weight:900;color:#2d5a27;border-top:2px solid #2d5a27;margin-top:4px;}
    .vat-note{text-align:right;font-size:8pt;color:#bbb;font-style:italic;margin-bottom:26px;}
    .paid-stamp{position:absolute;top:108px;right:48px;width:115px;height:115px;border:5px solid #2d5a27;border-radius:50%;display:flex;align-items:center;justify-content:center;transform:rotate(-18deg);opacity:.15;font-size:14pt;font-weight:900;letter-spacing:3px;color:#2d5a27;}
    .footer{border-top:1px solid #e8f0e6;padding-top:18px;margin-top:32px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;}
    .ft-left .ty{font-size:11pt;font-weight:700;color:#2d5a27;margin-bottom:5px;}
    .ft-left p,.ft-right p{font-size:8.5pt;color:#999;line-height:1.7;}
    .ft-right{text-align:right;}
  </style></head><body>
  <div class="page">
    ${isPaid ? '<div class="paid-stamp">PAID</div>' : ''}
    <div class="hdr">
      <div style="display:flex;align-items:flex-start;gap:14px">
        <img src="${SITE}/Public/logo.png" class="logo" alt="" onerror="this.style.display='none'"/>
        <div>
          <div class="co-name">Tails &amp; Trails</div>
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
        <p><strong>${inv.client_name}</strong><br>
        ${inv.client_address ? inv.client_address + '<br>' : ''}
        ${inv.client_email || ''}<br>${inv.client_phone || ''}</p>
      </div>
      ${bookingBlock}
    </div>
    <table class="items">
      <thead><tr><th>Description</th><th>Amount</th></tr></thead>
      <tbody><tr>
        <td>${inv.description || 'Dog care services'}
          ${inv.b_date ? `<div class="item-sub">${SVC[inv.b_service] || inv.b_service} &nbsp;&middot;&nbsp; ${fmtDate(inv.b_date, { day: 'numeric', month: 'short', year: 'numeric' })}</div>` : ''}
        </td>
        <td>${fmtMoney(inv.amount)}</td>
      </tr></tbody>
    </table>
    <div class="totals">
      <div class="tot-row"><span>Subtotal</span><span>${fmtMoney(inv.amount)}</span></div>
      <div class="tot-final"><span>Total</span><span>${fmtMoney(inv.amount)}</span></div>
    </div>
    <div class="vat-note">VAT not applicable \u2014 Tails &amp; Trails is not VAT registered</div>
    <div class="footer">
      <div class="ft-left">
        <div class="ty">Thank you for choosing Tails &amp; Trails! \ud83d\udc3e</div>
        <p>Please make payment by bank transfer by the due date shown above.<br>Use payment reference: <strong>Invoice #${numStr}</strong></p>
      </div>
      <div class="ft-right"><p>Questions? Contact us:<br>Alyssia.k.quirk@gmail.com</p></div>
    </div>
  </div>
  </body></html>`;
}

function receiptHtml(rec) {
  const numStr = rec.invoice_number ? pad(rec.invoice_number) : 'N/A';
  const SVC_R = { walk: 'Dog Walking', daycare: 'Day Care', feeding: 'Feeding / Home Visit', combined: 'Combined Day Care & Walk' };
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#1a1a1a;background:#fff;}
    .page{max-width:794px;margin:0 auto;background:#fff;padding:42px 48px;min-height:820px;position:relative;}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:22px;border-bottom:3px solid #2d5a27;margin-bottom:30px;}
    .logo{width:62px;height:62px;object-fit:contain;border-radius:8px;}
    .co-name{font-size:19pt;font-weight:900;color:#2d5a27;letter-spacing:-.5px;line-height:1.1;}
    .co-tag{font-size:9pt;color:#5a7a5a;margin-top:3px;}
    .co-info{font-size:8.5pt;color:#666;margin-top:8px;line-height:1.7;}
    .doc-type{font-size:30pt;font-weight:900;color:#2d5a27;letter-spacing:5px;text-align:right;}
    .doc-meta{font-size:9.5pt;color:#555;margin-top:8px;text-align:right;line-height:1.85;}
    .doc-meta strong{color:#1a1a1a;}
    .section-row{display:flex;justify-content:flex-start;gap:48px;margin-bottom:28px;}
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
    table.items tfoot tr{border-top:2px solid #2d5a27;}
    table.items tfoot td{padding:10px 14px;font-size:12pt;font-weight:900;color:#2d5a27;}
    .footer{border-top:1px solid #e8f0e6;padding-top:18px;margin-top:32px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;}
    .ft-left .ty{font-size:11pt;font-weight:700;color:#2d5a27;margin-bottom:5px;}
    .ft-left p,.ft-right p{font-size:8.5pt;color:#999;line-height:1.7;}
    .ft-right{text-align:right;}
  </style></head><body>
  <div class="page">
    <div class="hdr">
      <div style="display:flex;align-items:flex-start;gap:14px">
        <img src="${SITE}/Public/logo.png" class="logo" alt="" onerror="this.style.display='none'"/>
        <div>
          <div class="co-name">Tails &amp; Trails</div>
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
        <p><strong>${rec.client_name}</strong><br>
        ${rec.client_address ? rec.client_address + '<br>' : ''}
        ${rec.client_email || ''}</p>
      </div>
    </div>
    <div class="paid-box">
      <div>
        <div class="paid-confirm">\u2713 Payment Received</div>
        <div class="paid-date">Received on ${fmtDate(rec.created_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
      <div style="text-align:right">
        <div class="label">Amount Paid</div>
        <div class="amount">${fmtMoney(rec.amount)}</div>
      </div>
    </div>
    <table class="items">
      <thead><tr><th>Description</th><th>Amount</th></tr></thead>
      <tbody><tr>
        <td>${rec.invoice_description || 'Dog care services'}
          ${rec.b_date ? `<br><span style="font-size:8.5pt;color:#999">${SVC_R[rec.b_service] || rec.b_service} &middot; ${fmtDate(rec.b_date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>` : ''}
        </td>
        <td style="text-align:right;font-weight:700">${fmtMoney(rec.amount)}</td>
      </tr></tbody>
      <tfoot><tr>
        <td style="text-align:right;padding-right:4px"><strong>Total Paid</strong></td>
        <td style="text-align:right;font-size:13pt">${fmtMoney(rec.amount)}</td>
      </tr></tfoot>
    </table>
    <p style="font-size:8pt;color:#bbb;font-style:italic;text-align:right;margin-bottom:26px">VAT not applicable \u2014 Tails &amp; Trails is not VAT registered</p>
    <div class="footer">
      <div class="ft-left">
        <div class="ty">Thank you \u2014 payment confirmed! \ud83d\udc3e</div>
        <p>This receipt confirms payment of ${fmtMoney(rec.amount)} has been received.<br>Please keep this for your records.</p>
      </div>
      <div class="ft-right"><p>Tails &amp; Trails<br>Douglas, Isle of Man<br>Alyssia.k.quirk@gmail.com</p></div>
    </div>
  </div>
  </body></html>`;
}

async function generateInvoicePdf(inv) {
  return htmlToPdf(invoiceHtml(inv));
}

async function generateReceiptPdf(rec) {
  return htmlToPdf(receiptHtml(rec));
}

module.exports = { generateInvoicePdf, generateReceiptPdf };
