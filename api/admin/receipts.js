const { sql } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
        SELECT r.*, u.name AS client_name
        FROM receipts r
        JOIN users u ON u.id = r.client_id
        ORDER BY r.created_at DESC
      `;
      return res.status(200).json({ receipts: rows });
    }

    if (req.method === 'POST') {
      const { client_id, invoice_id, amount } = req.body || {};
      if (!client_id || !amount) return res.status(400).json({ error: 'Client and amount required.' });
      const result = await sql`
        INSERT INTO receipts (client_id, invoice_id, amount)
        VALUES (${client_id}, ${invoice_id || null}, ${amount})
        RETURNING *
      `;
      if (invoice_id) {
        await sql`UPDATE invoices SET status = 'paid' WHERE id = ${invoice_id}`;
      }
      return res.status(201).json({ receipt: result[0] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Receipt id required.' });
      await sql`DELETE FROM receipts WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin receipts error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
