const { getDb, ensureTables } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  await ensureTables();
  const sql = getDb();

  if (req.method === 'GET') {
    const users = await sql`SELECT id, username, role, created_at FROM users ORDER BY created_at DESC`;
    return res.json(users);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
