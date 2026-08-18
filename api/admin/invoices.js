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
        SELECT i.*, u.name AS client_name, u.dog_name
        FROM invoices i
        JOIN users u ON u.id = i.client_id
        ORDER BY i.created_at DESC
      `;
      return res.status(200).json({ invoices: rows });
    }

    if (req.method === 'POST') {
      const { client_id, amount, description, due_date } = req.body || {};
      if (!client_id || !amount) return res.status(400).json({ error: 'Client and amount required.' });
      const result = await sql`
        INSERT INTO invoices (client_id, amount, description, due_date)
        VALUES (${client_id}, ${amount}, ${description || null}, ${due_date || null})
        RETURNING *
      `;
      return res.status(201).json({ invoice: result[0] });
    }

    if (req.method === 'PATCH') {
      const { id, amount, description, due_date, status } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Invoice id required.' });
      const result = await sql`
        UPDATE invoices
        SET amount = ${amount}, description = ${description || null}, due_date = ${due_date || null}, status = ${status}
        WHERE id = ${id}
        RETURNING *
      `;
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
