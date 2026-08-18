const { sql } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const { getPresignedDownloadUrl } = require('../../lib/s3');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = requireAuth(req, res);
  if (!auth) return;
  if (auth.role !== 'client') return res.status(403).json({ error: 'Forbidden' });

  try {
    const rows = await sql`
      SELECT id, s3_key, filename, content_type, type, caption, created_at
      FROM media WHERE client_id = ${auth.userId}
      ORDER BY created_at DESC
    `;
    const media = await Promise.all(
      rows.map(async (m) => ({
        ...m,
        url:         await getPresignedDownloadUrl(m.s3_key, m.filename, 3600, 'inline'),
        downloadUrl: await getPresignedDownloadUrl(m.s3_key, m.filename, 3600, 'attachment'),
      }))
    );
    return res.status(200).json({ media });
  } catch (err) {
    console.error('Client media error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
