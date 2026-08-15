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
      const { date } = req.query || {};
      const rows = date
        ? await sql`
            SELECT b.*, u.name AS client_name, u.dog_name
            FROM bookings b
            JOIN users u ON u.id = b.client_id
            WHERE b.booking_date = ${date}
            ORDER BY b.start_time NULLS LAST
          `
        : await sql`
            SELECT b.*, u.name AS client_name, u.dog_name
            FROM bookings b
            JOIN users u ON u.id = b.client_id
            ORDER BY b.booking_date DESC, b.start_time NULLS LAST
          `;
      return res.status(200).json({ bookings: rows });
    }

    if (req.method === 'POST') {
      const { client_id, booking_date, start_time, end_time, service, status, notes } = req.body || {};
      if (!client_id || !booking_date || !service) {
        return res.status(400).json({ error: 'Client, date and service required.' });
      }
      const result = await sql`
        INSERT INTO bookings (client_id, booking_date, start_time, end_time, service, status, notes)
        VALUES (${client_id}, ${booking_date}, ${start_time || null}, ${end_time || null}, ${service}, ${status || 'confirmed'}, ${notes || null})
        RETURNING *
      `;
      return res.status(201).json({ booking: result[0] });
    }

    if (req.method === 'PATCH') {
      const { id, client_id, booking_date, start_time, end_time, service, status, notes } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Booking id required.' });
      const result = await sql`
        UPDATE bookings
        SET
          client_id = ${client_id},
          booking_date = ${booking_date},
          start_time = ${start_time || null},
          end_time = ${end_time || null},
          service = ${service},
          status = ${status},
          notes = ${notes || null}
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json({ booking: result[0] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Booking id required.' });
      await sql`DELETE FROM bookings WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin bookings error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
