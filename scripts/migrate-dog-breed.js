const { sql } = require('../lib/db');

async function migrate() {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS dog_breed TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT`;
  console.log('Migration complete: dog_breed and notes columns added to users table.');
}

migrate().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
