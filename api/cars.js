const { getDb, ensureTables } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  await ensureTables();
  const sql = getDb();

  if (req.method === 'GET') {
    const cars = await sql`SELECT * FROM cars ORDER BY created_at DESC`;
    const images = await sql`SELECT * FROM car_images`;

    const imagesByCar = {};
    for (const img of images) {
      if (!imagesByCar[img.car_id]) imagesByCar[img.car_id] = [];
      imagesByCar[img.car_id].push({ id: img.id, url: img.url, filename: img.filename });
    }

    const result = cars.map(car => ({
      ...car,
      images: imagesByCar[car.id] || []
    }));

    return res.json(result);
  }

  if (req.method === 'POST') {
    const { location, chassis } = req.body;
    if (!location || !location.trim()) {
      return res.status(400).json({ error: 'Location is required' });
    }
    if (!chassis || !chassis.trim()) {
      return res.status(400).json({ error: 'Chassis number is required' });
    }

    const rows = await sql`
      INSERT INTO cars (location, chassis) VALUES (${location.trim()}, ${chassis.trim()})
      RETURNING *
    `;
    return res.status(201).json({ ...rows[0], images: [] });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
