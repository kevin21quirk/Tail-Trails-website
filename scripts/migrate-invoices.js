const { sql } = require('../lib/db');

async function migrate() {
  await sql`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1500 MINVALUE 1500`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number INTEGER UNIQUE DEFAULT nextval('invoice_number_seq')`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL`;
  await sql`UPDATE invoices SET invoice_number = nextval('invoice_number_seq') WHERE invoice_number IS NULL`;
  console.log('Migration complete: invoice_number sequence (start 1500) and booking_id added to invoices.');
}

migrate().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
