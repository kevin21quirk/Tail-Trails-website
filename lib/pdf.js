const PDFDocument = require('pdfkit');
const https = require('https');

const GREEN      = '#2d5a27';
const GREEN_LIGHT = '#e8f0e6';
const GREEN_MID  = '#5a7a5a';
const GOLD       = '#856404';
const GREY       = '#666666';
const GREY_LIGHT = '#999999';
const GREY_PALE  = '#bbbbbb';
const BLACK      = '#1a1a1a';
const WHITE      = '#ffffff';

const SVC = { walk: 'Dog Walking', daycare: 'Day Care', feeding: 'Feeding / Home Visit', combined: 'Combined Day Care & Walk' };
function pad(n) { return String(n).padStart(5, '0'); }
function fmtMoney(n) { return '\u00a3' + Number(n).toFixed(2); }
function fmtDate(val, opts) {
  if (!val) return '\u2014';
  const s = typeof val === 'string' ? val.slice(0, 10) : new Date(val).toISOString().slice(0, 10);
  return new Date(s + 'T00:00').toLocaleDateString('en-GB', opts || { day: 'numeric', month: 'long', year: 'numeric' });
}

function fetchImageBuffer(url) {
  return new Promise((resolve) => {
    const req = (url.startsWith('https') ? https : require('http')).get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(4000, () => { req.destroy(); resolve(null); });
  });
}

function buildDoc(drawFn) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Creator: 'Tails & Trails by Alyssia' } });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try { await drawFn(doc); } catch (e) { reject(e); return; }
    doc.end();
  });
}

const M = 50;
const PW = 595.28;
const CW = PW - M * 2;

function sectionLabel(doc, text, x, y) {
  doc.font('Helvetica-Bold').fontSize(7).fillColor(GREEN).text(text.toUpperCase(), x, y, { characterSpacing: 1.2 });
}

function drawHeader(doc, logoImg, docType, metaLines) {
  const logoSize = 58;
  let textX = M;
  if (logoImg) {
    doc.image(logoImg, M, M, { width: logoSize, height: logoSize });
    textX = M + logoSize + 12;
  }
  doc.font('Helvetica-Bold').fontSize(19).fillColor(GREEN).text('Tails & Trails by Alyssia', textX, M + 2);
  doc.font('Helvetica').fontSize(9).fillColor(GREEN_MID).text('Professional Dog Care', textX, M + 24);
  doc.font('Helvetica').fontSize(8.5).fillColor(GREY).text('Douglas, Isle of Man', textX, M + 38, { lineGap: 2 });
  doc.font('Helvetica').fontSize(8.5).fillColor(GREY).text('Alyssia.k.quirk@gmail.com', textX, M + 50);

  doc.font('Helvetica-Bold').fontSize(28).fillColor(GREEN)
     .text(docType, 0, M + 2, { width: PW - M, align: 'right', characterSpacing: 4 });

  let my = M + 38;
  for (const { label, value, color } of metaLines) {
    const lineY = my;
    doc.font('Helvetica').fontSize(9).fillColor(GREY).text(label, 0, lineY, { width: PW - M - 80, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(color || BLACK).text(value, 0, lineY, { width: PW - M, align: 'right' });
    my += 15;
  }

  const afterLogo  = M + logoSize + 16;
  const afterMeta  = my + 10;
  const lineY = Math.max(afterLogo, afterMeta);
  doc.moveTo(M, lineY).lineTo(PW - M, lineY).lineWidth(2.5).strokeColor(GREEN).stroke();
  return lineY + 20;
}

function drawBillSection(doc, y, leftLines, rightCol) {
  const startY = y;
  sectionLabel(doc, leftLines.label, M, startY);
  let ly = startY + 13;
  for (const { text, bold, color, small } of leftLines.lines) {
    if (!text) { ly += 4; continue; }
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(small ? 8.5 : 10.5)
       .fillColor(color || '#333333')
       .text(text, M, ly, { width: 240 });
    ly += doc.currentLineHeight() + 3;
  }

  if (rightCol) {
    sectionLabel(doc, rightCol.label, M + 280, startY);
    let ry = startY + 13;
    for (const { text, bold, color, small } of rightCol.lines) {
      if (!text) { ry += 4; continue; }
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(small ? 8.5 : 10.5)
         .fillColor(color || '#333333')
         .text(text, M + 280, ry, { width: 240 });
      ry += doc.currentLineHeight() + 3;
    }
  }

  return Math.max(ly, rightCol ? (startY + 13 + rightCol.lines.length * 15) : 0) + 16;
}

function drawTable(doc, y, rows) {
  const hdrH = 28;
  doc.rect(M, y, CW, hdrH).fill(GREEN);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(WHITE)
     .text('DESCRIPTION', M + 12, y + 9)
     .text('AMOUNT', 0, y + 9, { width: PW - M - 12, align: 'right' });
  y += hdrH;

  for (const row of rows) {
    const rowH = row.sub ? 46 : 34;
    doc.rect(M, y, CW, rowH).fill('#ffffff').stroke();
    doc.moveTo(M, y).lineTo(PW - M, y).lineWidth(0.5).strokeColor(GREEN_LIGHT).stroke();
    doc.font('Helvetica').fontSize(10.5).fillColor(BLACK).text(row.desc, M + 12, y + 10, { width: CW - 120 });
    if (row.sub) {
      doc.font('Helvetica').fontSize(8).fillColor(GREY_LIGHT).text(row.sub, M + 12, y + 25, { width: CW - 120 });
    }
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(BLACK)
       .text(row.amount, 0, y + 10, { width: PW - M - 12, align: 'right' });
    y += rowH;
  }
  doc.moveTo(M, y).lineTo(PW - M, y).lineWidth(1).strokeColor(GREEN_LIGHT).stroke();
  return y + 18;
}

function drawTotals(doc, y, subtotal, total) {
  const totW = 220;
  const totX = PW - M - totW;
  doc.font('Helvetica').fontSize(10).fillColor(GREY)
     .text('Subtotal', totX, y)
     .text(subtotal, 0, y, { width: PW - M, align: 'right' });
  y += 18;
  doc.moveTo(totX, y).lineTo(PW - M, y).lineWidth(1.5).strokeColor(GREEN).stroke();
  y += 6;
  doc.font('Helvetica-Bold').fontSize(14).fillColor(GREEN)
     .text('Total', totX, y)
     .text(total, 0, y, { width: PW - M, align: 'right' });
  y += 24;
  doc.font('Helvetica').fontSize(7.5).fillColor(GREY_PALE)
     .text('VAT not applicable \u2014 Tails & Trails by Alyssia is not VAT registered', 0, y, { width: PW - M, align: 'right' });
  return y + 20;
}

function drawFooter(doc, y, leftTitle, leftBody, rightBody) {
  y += 10;
  doc.moveTo(M, y).lineTo(PW - M, y).lineWidth(0.5).strokeColor(GREEN_LIGHT).stroke();
  y += 14;
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(GREEN).text(leftTitle, M, y, { width: 340 });
  y += 16;
  doc.font('Helvetica').fontSize(8.5).fillColor(GREY_LIGHT).text(leftBody, M, y, { width: 320, lineGap: 3 });
  doc.font('Helvetica').fontSize(8.5).fillColor(GREY_LIGHT)
     .text(rightBody, 0, y, { width: PW - M, align: 'right', lineGap: 3 });
}

async function generateInvoicePdf(inv) {
  const numStr = pad(inv.invoice_number);
  const isPaid = inv.status === 'paid';
  const logoImg = await fetchImageBuffer('https://tailsandtrails.im/Public/tailsandtrailslogo%20(2).png');

  return buildDoc(async (doc) => {
    let y = drawHeader(doc, logoImg, 'INVOICE', [
      { label: 'Invoice No:  ', value: '#' + numStr },
      { label: 'Date:  ', value: fmtDate(inv.created_at, { day: 'numeric', month: 'short', year: 'numeric' }) },
      ...(inv.due_date ? [{ label: 'Due:  ', value: fmtDate(inv.due_date, { day: 'numeric', month: 'short', year: 'numeric' }) }] : []),
      { label: 'Status:  ', value: isPaid ? 'PAID' : 'OUTSTANDING', color: isPaid ? GREEN : GOLD },
    ]);

    const billLines = [
      { text: inv.client_name, bold: true },
      ...(inv.client_address ? inv.client_address.split(',').map(s => ({ text: s.trim() })) : []),
      { text: inv.client_email || '' },
      { text: inv.client_phone || '' },
    ].filter(l => l.text);

    const bookingCol = inv.b_date ? {
      label: 'Booking Reference',
      lines: [
        { text: SVC[inv.b_service] || inv.b_service || '', bold: true },
        { text: fmtDate(inv.b_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
        { text: (inv.b_start ? String(inv.b_start).slice(0, 5) : '') + (inv.b_end ? ' \u2013 ' + String(inv.b_end).slice(0, 5) : '') },
      ],
    } : null;

    y = drawBillSection(doc, y, { label: 'Bill To', lines: billLines }, bookingCol);

    const sub = inv.b_date ? `${SVC[inv.b_service] || inv.b_service} \u00b7 ${fmtDate(inv.b_date, { day: 'numeric', month: 'short', year: 'numeric' })}` : null;
    y = drawTable(doc, y, [{ desc: inv.description || 'Dog care services', sub, amount: fmtMoney(inv.amount) }]);
    y = drawTotals(doc, y, fmtMoney(inv.amount), fmtMoney(inv.amount));

    drawFooter(doc, y,
      'Thank you for choosing Tails & Trails by Alyssia!',
      `Please make payment by bank transfer by the due date shown above.\nUse payment reference: Invoice #${numStr}`,
      'Questions? Contact us:\nAlyssia.k.quirk@gmail.com'
    );
  });
}

async function generateReceiptPdf(rec) {
  const numStr = rec.invoice_number ? pad(rec.invoice_number) : 'N/A';
  const logoImg = await fetchImageBuffer('https://tailsandtrails.im/Public/tailsandtrailslogo%20(2).png');

  return buildDoc(async (doc) => {
    let y = drawHeader(doc, logoImg, 'RECEIPT', [
      { label: 'Receipt No:  ', value: '#' + numStr },
      ...(rec.invoice_number ? [{ label: 'Invoice Ref:  ', value: '#' + numStr }] : []),
      { label: 'Date Paid:  ', value: fmtDate(rec.created_at, { day: 'numeric', month: 'short', year: 'numeric' }) },
    ]);

    const fromLines = [
      { text: rec.client_name, bold: true },
      ...(rec.client_address ? rec.client_address.split(',').map(s => ({ text: s.trim() })) : []),
      { text: rec.client_email || '' },
    ].filter(l => l.text);

    y = drawBillSection(doc, y, { label: 'Payment From', lines: fromLines }, null);

    const boxH = 68;
    doc.roundedRect(M, y, CW, boxH, 8).fill(GREEN_LIGHT);
    doc.rect(M, y, CW, boxH).stroke(GREEN).lineWidth(1.5);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(GREEN).text('\u2713 Payment Received', M + 16, y + 14);
    doc.font('Helvetica').fontSize(8.5).fillColor(GREEN_MID)
       .text('Received on ' + fmtDate(rec.created_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), M + 16, y + 32);
    doc.font('Helvetica').fontSize(8.5).fillColor(GREEN).text('AMOUNT PAID', 0, y + 12, { width: PW - M - 16, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(24).fillColor(GREEN)
       .text(fmtMoney(rec.amount), 0, y + 26, { width: PW - M - 16, align: 'right' });
    y += boxH + 20;

    const sub = rec.b_date ? `${SVC[rec.b_service] || rec.b_service} \u00b7 ${fmtDate(rec.b_date, { day: 'numeric', month: 'short', year: 'numeric' })}` : null;
    y = drawTable(doc, y, [{ desc: rec.invoice_description || 'Dog care services', sub, amount: fmtMoney(rec.amount) }]);

    const totW = 220;
    const totX = PW - M - totW;
    doc.moveTo(totX, y).lineTo(PW - M, y).lineWidth(1.5).strokeColor(GREEN).stroke();
    y += 6;
    doc.font('Helvetica-Bold').fontSize(13).fillColor(GREEN)
       .text('Total Paid', totX, y)
       .text(fmtMoney(rec.amount), 0, y, { width: PW - M, align: 'right' });
    y += 26;
    doc.font('Helvetica').fontSize(7.5).fillColor(GREY_PALE)
       .text('VAT not applicable \u2014 Tails & Trails by Alyssia is not VAT registered', 0, y, { width: PW - M, align: 'right' });
    y += 18;

    drawFooter(doc, y,
      'Thank you \u2014 payment confirmed!',
      `This receipt confirms payment of ${fmtMoney(rec.amount)} has been received.\nPlease keep this for your records.`,
      'Tails & Trails by Alyssia\nDouglas, Isle of Man\nAlyssia.k.quirk@gmail.com'
    );
  });
}

module.exports = { generateInvoicePdf, generateReceiptPdf };
