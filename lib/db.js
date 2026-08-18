const { Pool } = require('pg');

let pool;

function sanitiseConnectionString(cs) {
  try {
    const url = new URL(cs);
    url.searchParams.delete('channel_binding');
    return url.toString();
  } catch {
    return cs;
  }
}

function getPool() {
  if (!pool) {
    const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!raw) throw new Error('DATABASE_URL environment variable is not set.');
    pool = new Pool({
      connectionString: sanitiseConnectionString(raw),
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

function sql(strings, ...values) {
  let text = '';
  strings.forEach((str, i) => {
    text += str;
    if (i < values.length) text += `$${i + 1}`;
  });
  return getPool().query(text, values).then((r) => r.rows);
}

module.exports = { sql, getPool };
