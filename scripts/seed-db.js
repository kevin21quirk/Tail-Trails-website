const bcrypt = require('bcryptjs');
const { sql } = require('../lib/db');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'alyssia.k.quirk@gmail.com').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.error('Set POSTGRES_URL or DATABASE_URL before running this script.');
  process.exit(1);
}

if (!ADMIN_PASSWORD) {
  console.error('Set ADMIN_PASSWORD before running this script.');
  process.exit(1);
}

async function seed() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
      name TEXT NOT NULL,
      dog_name TEXT,
      phone TEXT,
      address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_date DATE NOT NULL,
      start_time TIME,
      end_time TIME,
      service TEXT NOT NULL,
      status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS media (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      s3_key TEXT NOT NULL,
      filename TEXT,
      content_type TEXT,
      type TEXT CHECK (type IN ('image', 'video')),
      caption TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_media_client ON media(client_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
      due_date DATE,
      s3_key TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS receipts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
      amount NUMERIC(10,2) NOT NULL,
      s3_key TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_receipts_client ON receipts(client_id)`;

  const existing = await sql`SELECT id FROM users WHERE email = ${ADMIN_EMAIL} AND role = 'admin' LIMIT 1`;
  if (existing[0]) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await sql`UPDATE users SET password_hash = ${hash}, name = 'Alyssia' WHERE id = ${existing[0].id}`;
    console.log(`Admin user ${ADMIN_EMAIL} updated.`);
  } else {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await sql`
      INSERT INTO users (email, password_hash, role, name)
      VALUES (${ADMIN_EMAIL}, ${hash}, 'admin', 'Alyssia')
    `;
    console.log(`Admin user ${ADMIN_EMAIL} created.`);
  }
}

seed().then(() => { console.log('Database seeded.'); process.exit(0); }).catch((err) => { console.error(err); process.exit(1); });
