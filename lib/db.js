const { sql } = require('@vercel/postgres');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

function getDb() {
  if (!connectionString) {
    throw new Error('POSTGRES_URL or DATABASE_URL environment variable is not set.');
  }
  return sql;
}

module.exports = { getDb, sql };
