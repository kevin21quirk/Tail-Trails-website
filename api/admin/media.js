const { sql } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const { uploadToS3, getS3Prefix } = require('../../lib/s3');

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
        SELECT m.*, u.name AS client_name
        FROM media m
        JOIN users u ON u.id = m.client_id
        ORDER BY m.created_at DESC
      `;
      return res.status(200).json({ media: rows });
    }

    if (req.method === 'POST') {
      const { client_id, files, caption } = req.body || {};
      if (!client_id || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Client and base64 file(s) required.' });
      }

      const result = await sql`SELECT id, name FROM users WHERE id = ${client_id} AND role = 'client'`;
      if (!result[0]) return res.status(404).json({ error: 'Client not found.' });

      const inserted = [];
      const prefix = getS3Prefix(client_id);

      for (const file of files) {
        const { name, data, contentType, type } = file;
        const buffer = Buffer.from(data, 'base64');
        const key = `${prefix}${Date.now()}-${name}`;
        await uploadToS3(key, buffer, contentType);

        const media = await sql`
          INSERT INTO media (client_id, s3_key, filename, content_type, type, caption)
          VALUES (${client_id}, ${key}, ${name}, ${contentType}, ${type || 'image'}, ${caption || null})
          RETURNING id, client_id, filename, type, caption, created_at
        `;
        inserted.push(media[0]);
      }

      return res.status(201).json({ media: inserted });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Media id required.' });
      const rows = await sql`SELECT s3_key FROM media WHERE id = ${id}`;
      if (rows[0]) {
        const { deleteFromS3 } = require('../../lib/s3');
        try { await deleteFromS3(rows[0].s3_key); } catch (e) { console.error(e); }
        await sql`DELETE FROM media WHERE id = ${id}`;
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin media error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
