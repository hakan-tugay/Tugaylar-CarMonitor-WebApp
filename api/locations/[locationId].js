const { getDb, ensureTables } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  await ensureTables();
  const sql = getDb();
  const { locationId } = req.query;

  if (req.method === 'DELETE') {
    const rows = await sql`SELECT id FROM locations WHERE id = ${locationId}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Location not found' });

    await sql`DELETE FROM locations WHERE id = ${locationId}`;
    return res.json({ message: 'Location deleted' });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
