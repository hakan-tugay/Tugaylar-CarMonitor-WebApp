const bcrypt = require('bcryptjs');
const { getDb, ensureTables } = require('../../lib/db');
const { createToken, requireAuth } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await ensureTables();
  const sql = getDb();

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  const existing = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${username.trim()})`;
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const rows = await sql`
    INSERT INTO users (username, password_hash)
    VALUES (${username.trim().toLowerCase()}, ${passwordHash})
    RETURNING id, username
  `;

  res.status(201).json({ id: rows[0].id, username: rows[0].username });
};
