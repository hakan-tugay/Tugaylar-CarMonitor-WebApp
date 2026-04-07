const { getDb, ensureTables } = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

module.exports = async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  await ensureTables();
  const sql = getDb();
  const { userId } = req.query;

  if (req.method === 'DELETE') {
    if (Number(userId) === user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const rows = await sql`SELECT id FROM users WHERE id = ${userId}`;
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    await sql`DELETE FROM users WHERE id = ${userId}`;
    return res.json({ message: 'User deleted' });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
