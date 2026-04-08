const bcrypt = require('bcryptjs');
const { getDb, ensureTables } = require('../../lib/db');
const { createToken } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await ensureTables();
  const sql = getDb();

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const rows = await sql`SELECT * FROM users WHERE LOWER(username) = LOWER(${username.trim()})`;
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = createToken(user);
  res.json({ token, username: user.username, role: user.role || 'editor' });
};
