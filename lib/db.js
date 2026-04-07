const { neon } = require('@neondatabase/serverless');

let sql;

function getDb() {
  if (!sql) {
    sql = neon(process.env.POSTGRES_URL);
  }
  return sql;
}

let initialized = false;

async function ensureTables() {
  if (initialized) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS cars (
      id SERIAL PRIMARY KEY,
      location TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS car_images (
      id SERIAL PRIMARY KEY,
      car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      filename TEXT NOT NULL
    )
  `;
  initialized = true;
}

module.exports = { getDb, ensureTables };
