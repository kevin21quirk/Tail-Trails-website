const { sql } = require('../lib/db');

async function migrate() {
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ`;
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ`;
  console.log('Migration complete: email_sent_at added to invoices and receipts.');
}

migrate().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
