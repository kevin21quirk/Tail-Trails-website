const PDFDocument = require('pdfkit');

const TEAL      = '#2d5a27';
const TEAL_LIGHT = '#b8d4b5';
const BG_LIGHT  = '#f5f5f0';
const GREY      = '#666666';
const TEXT      = '#333333';

function padNum(n) { return String(n).padStart(5, '0'); }
function fmtMoney(v) { return '\u00a3' + Number(v).toFixed(2); }
function fmtDate(v) {
  if (!v) return '\u2014';
  return new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildPdf({ isReceipt, number, clientName, description, amount, dateIssued, dueDate }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const M = 50;
    const CW = W - M * 2;

    // ── Header bar ──────────────────────────────────────────────────
    doc.rect(0, 0, W, 88).fill(TEAL);

    doc.font('Helvetica-Bold').fontSize(22).fillColor('white')
       .text('Tails & Trails', M, 26);

    const titleLabel = isReceipt ? 'RECEIPT' : 'INVOICE';
    doc.font('Helvetica-Bold').fontSize(9).fillColor(TEAL_LIGHT)
       .text(titleLabel, W - M - 130, 26, { width: 130, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(16).fillColor('white')
       .text(number, W - M - 130, 40, { width: 130, align: 'right' });

    // ── Billed to / date block ───────────────────────────────────────
    let y = 110;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(GREY)
       .text('BILLED TO', M, y)
       .text('DATE ISSUED', W - M - 160, y, { width: 160, align: 'right' });

    y += 13;
    doc.font('Helvetica-Bold').fontSize(13).fillColor(TEXT)
       .text(clientName, M, y);
    doc.font('Helvetica').fontSize(11).fillColor(TEXT)
       .text(dateIssued, W - M - 160, y, { width: 160, align: 'right' });

    if (!isReceipt && dueDate) {
      y += 18;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(GREY)
         .text('DUE DATE', W - M - 160, y, { width: 160, align: 'right' });
      y += 13;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(TEAL)
         .text(dueDate, W - M - 160, y, { width: 160, align: 'right' });
    }

    // ── Divider ──────────────────────────────────────────────────────
    y += 32;
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor('#dddddd').lineWidth(1).stroke();
    y += 18;

    // ── Table header ─────────────────────────────────────────────────
    doc.rect(M, y, CW, 26).fill(BG_LIGHT);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GREY)
       .text('DESCRIPTION', M + 10, y + 9)
       .text('AMOUNT', W - M - 80, y + 9, { width: 68, align: 'right' });
    y += 26;

    // ── Table row ─────────────────────────────────────────────────────
    doc.rect(M, y, CW, 38).fill('white');
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor('#eeeeee').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(11).fillColor(TEXT)
       .text(description || 'Dog care services', M + 10, y + 12, { width: CW - 100 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT)
       .text(fmtMoney(amount), W - M - 80, y + 12, { width: 68, align: 'right' });
    y += 38;

    doc.moveTo(M, y).lineTo(W - M, y).strokeColor('#dddddd').lineWidth(1).stroke();
    y += 22;

    // ── Total box ────────────────────────────────────────────────────
    const boxW = 220;
    const boxX = W - M - boxW;
    doc.rect(boxX, y, boxW, 62).fill(TEAL);
    const totalLabel = isReceipt ? 'AMOUNT PAID' : 'AMOUNT DUE';
    doc.font('Helvetica').fontSize(8).fillColor(TEAL_LIGHT)
       .text(totalLabel, boxX, y + 12, { width: boxW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(26).fillColor('white')
       .text(fmtMoney(amount), boxX, y + 24, { width: boxW, align: 'center' });
    y += 82;

    // ── Notes ────────────────────────────────────────────────────────
    const note = isReceipt
      ? 'Thank you for your payment! Please keep this receipt for your records.'
      : 'To pay, please bank transfer to the details provided separately, or get in touch to arrange payment.';
    doc.font('Helvetica').fontSize(10).fillColor(GREY)
       .text(note, M, y, { width: CW });
    y += doc.heightOfString(note, { width: CW }) + 10;

    doc.font('Helvetica').fontSize(10).fillColor(GREY)
       .text(`Please quote ${number} as your payment reference.`, M, y, { width: CW });
    y += 20;

    doc.font('Helvetica').fontSize(10).fillColor(GREY)
       .text('Questions? Call or WhatsApp: +44 76 2435 4396', M, y, { width: CW });

    // ── Footer ───────────────────────────────────────────────────────
    const fY = doc.page.height - 44;
    doc.rect(0, fY, W, 44).fill(BG_LIGHT);
    doc.font('Helvetica').fontSize(8).fillColor(GREY)
       .text('VAT not applicable \u2014 Tails & Trails is not VAT registered', M, fY + 16, { width: CW, align: 'center' });

    doc.end();
  });
}

function generateInvoicePdf(inv) {
  return buildPdf({
    isReceipt:   false,
    number:      '#' + padNum(inv.invoice_number),
    clientName:  inv.client_name,
    description: inv.description || 'Dog care services',
    amount:      inv.amount,
    dateIssued:  fmtDate(inv.created_at),
    dueDate:     inv.due_date ? fmtDate(inv.due_date) : null,
  });
}

function generateReceiptPdf(rec) {
  return buildPdf({
    isReceipt:   true,
    number:      rec.invoice_number ? '#' + padNum(rec.invoice_number) : 'Receipt',
    clientName:  rec.client_name,
    description: rec.invoice_description || 'Dog care services',
    amount:      rec.amount,
    dateIssued:  fmtDate(rec.created_at),
    dueDate:     null,
  });
}

module.exports = { generateInvoicePdf, generateReceiptPdf };
