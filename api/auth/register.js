const bcrypt = require('bcryptjs');
const { getDb, ensureTables } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await ensureTables();
  const sql = getDb();

  const { username, password, role } = req.body;
  const validRoles = ['admin', 'editor', 'viewer'];
  const userRole = validRoles.includes(role) ? role : 'editor';
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
    INSERT INTO users (username, password_hash, role)
    VALUES (${username.trim().toLowerCase()}, ${passwordHash}, ${userRole})
    RETURNING id, username, role
  `;

  res.status(201).json({ id: rows[0].id, username: rows[0].username, role: rows[0].role });
};
