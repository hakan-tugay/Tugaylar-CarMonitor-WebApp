const { getDb, ensureTables } = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

module.exports = async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  await ensureTables();
  const sql = getDb();
  const { id } = req.query;

  if (req.method === 'POST') {
    const cars = await sql`SELECT id FROM cars WHERE id = ${id}`;
    if (cars.length === 0) return res.status(404).json({ error: 'Car not found' });

    const { url, filename } = req.body;
    if (!url || !filename) {
      return res.status(400).json({ error: 'url and filename are required' });
    }

    const rows = await sql`
      INSERT INTO car_images (car_id, url, filename)
      VALUES (${id}, ${url}, ${filename})
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
