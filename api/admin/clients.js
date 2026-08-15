const bcrypt = require('bcryptjs');
const { sql } = require('@vercel/postgres');
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
      const clients = await sql`
        SELECT id, email, name, dog_name, phone, address, created_at
        FROM users WHERE role = 'client' ORDER BY name
      `;
      return res.status(200).json({ clients });
    }

    if (req.method === 'POST') {
      const { email, name, dog_name, phone, address, password } = req.body || {};
      if (!email || !name || !password) return res.status(400).json({ error: 'Email, name and password required.' });
      const hash = await bcrypt.hash(password, 10);
      const result = await sql`
        INSERT INTO users (email, password_hash, role, name, dog_name, phone, address)
        VALUES (${email.toLowerCase().trim()}, ${hash}, 'client', ${name}, ${dog_name || null}, ${phone || null}, ${address || null})
        RETURNING id, email, name, dog_name, phone, address, created_at
      `;
      return res.status(201).json({ client: result[0] });
    }

    if (req.method === 'PATCH') {
      const { id, email, name, dog_name, phone, address, password } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Client id required.' });
      const hash = password ? await bcrypt.hash(password, 10) : null;
      const result = await sql`
        UPDATE users
        SET
          email = ${email.toLowerCase().trim()},
          name = ${name},
          dog_name = ${dog_name || null},
          phone = ${phone || null},
          address = ${address || null},
          password_hash = COALESCE(${hash}, password_hash)
        WHERE id = ${id} AND role = 'client'
        RETURNING id, email, name, dog_name, phone, address
      `;
      return res.status(200).json({ client: result[0] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Client id required.' });
      await sql`DELETE FROM users WHERE id = ${id} AND role = 'client'`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin clients error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
