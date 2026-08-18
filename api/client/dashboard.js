const { sql } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

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
    const upcoming = await sql`
      SELECT * FROM bookings
      WHERE client_id = ${auth.userId}
        AND (
          booking_date > CURRENT_DATE
          OR (booking_date = CURRENT_DATE AND (start_time IS NULL OR start_time > CURRENT_TIME))
        )
      ORDER BY booking_date, start_time
      LIMIT 5
    `;
    const media = await sql`
      SELECT id, filename, type, caption, created_at FROM media
      WHERE client_id = ${auth.userId}
      ORDER BY created_at DESC
      LIMIT 6
    `;
    const invoices = await sql`
      SELECT id, amount, status, due_date, description, created_at FROM invoices
      WHERE client_id = ${auth.userId}
      ORDER BY created_at DESC
    `;
    const receipts = await sql`
      SELECT id, amount, created_at FROM receipts
      WHERE client_id = ${auth.userId}
      ORDER BY created_at DESC
    `;
    return res.status(200).json({ upcoming, media, invoices, receipts });
  } catch (err) {
    console.error('Client dashboard error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
