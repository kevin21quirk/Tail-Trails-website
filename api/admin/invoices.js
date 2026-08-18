const { sql } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = requireAuth(req, res);
  if (!auth) return;
  if (auth.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT i.*,
          u.name AS client_name, u.dog_name,
          u.email AS client_email, u.phone AS client_phone, u.address AS client_address,
          b.service AS booking_service, b.booking_date, b.start_time AS booking_start_time, b.end_time AS booking_end_time
        FROM invoices i
        JOIN users u ON u.id = i.client_id
        LEFT JOIN bookings b ON b.id = i.booking_id
        ORDER BY i.invoice_number DESC
      `;
      return res.status(200).json({ invoices: rows });
    }

    if (req.method === 'POST') {
      const { client_id, amount, description, due_date, booking_id } = req.body || {};
      if (!client_id || !amount) return res.status(400).json({ error: 'Client and amount required.' });
      const result = await sql`
        INSERT INTO invoices (client_id, amount, description, due_date, booking_id)
        VALUES (${client_id}, ${amount}, ${description || null}, ${due_date || null}, ${booking_id || null})
        RETURNING *
      `;
      return res.status(201).json({ invoice: result[0] });
    }

    if (req.method === 'PATCH') {
      const { id, amount, description, due_date, status, booking_id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Invoice id required.' });

      const curr = await sql`SELECT * FROM invoices WHERE id = ${id}`;
      if (!curr[0]) return res.status(404).json({ error: 'Invoice not found.' });

      const result = await sql`
        UPDATE invoices SET
          amount       = ${amount       !== undefined ? amount              : curr[0].amount},
          description  = ${description  !== undefined ? description || null : curr[0].description},
          due_date     = ${due_date     !== undefined ? due_date    || null : curr[0].due_date},
          status       = ${status       !== undefined ? status              : curr[0].status},
          booking_id   = ${booking_id   !== undefined ? booking_id  || null : curr[0].booking_id}
        WHERE id = ${id}
        RETURNING *
      `;

      if (status === 'paid' && curr[0].status !== 'paid') {
        await sql`
          INSERT INTO receipts (client_id, invoice_id, amount)
          VALUES (${result[0].client_id}, ${id}, ${result[0].amount})
        `;
      }

      return res.status(200).json({ invoice: result[0] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Invoice id required.' });
      await sql`DELETE FROM invoices WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin invoices error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
