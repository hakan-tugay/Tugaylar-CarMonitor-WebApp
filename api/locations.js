const { getDb, ensureTables } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

module.exports = async function handler(req, res) {
  await ensureTables();
  const sql = getDb();

  if (req.method === 'GET') {
    if (!requireAuth(req, res)) return;
    const locations = await sql`SELECT * FROM locations ORDER BY name`;
    return res.json(locations);
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Location name is required' });
    }

    const existing = await sql`SELECT id FROM locations WHERE LOWER(name) = LOWER(${name.trim()})`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Location already exists' });
    }

    const rows = await sql`
      INSERT INTO locations (name) VALUES (${name.trim()})
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
