const { getDb, ensureTables } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  await ensureTables();
  const sql = getDb();

  if (req.method === 'GET') {
    const users = await sql`SELECT id, username, created_at FROM users ORDER BY created_at DESC`;
    return res.json(users);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
