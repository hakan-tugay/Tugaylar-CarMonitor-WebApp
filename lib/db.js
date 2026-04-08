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
  await sql`ALTER TABLE cars ADD COLUMN IF NOT EXISTS chassis TEXT`;
  await sql`ALTER TABLE cars ADD COLUMN IF NOT EXISTS created_by TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'editor'`;
  await sql`UPDATE users SET role = 'admin' WHERE LOWER(username) LIKE '%tugay%' AND role = 'user'`;
  await sql`
    CREATE TABLE IF NOT EXISTS car_images (
      id SERIAL PRIMARY KEY,
      car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      filename TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    )
  `;
  initialized = true;
}

module.exports = { getDb, ensureTables };
