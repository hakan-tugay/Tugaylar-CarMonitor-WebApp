const { getDb, ensureTables } = require('../../lib/db');
const { del } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  await ensureTables();
  const sql = getDb();
  const { id } = req.query;

  if (req.method === 'GET') {
    const cars = await sql`SELECT * FROM cars WHERE id = ${id}`;
    if (cars.length === 0) return res.status(404).json({ error: 'Car not found' });

    const images = await sql`SELECT id, url, filename FROM car_images WHERE car_id = ${id}`;
    return res.json({ ...cars[0], images });
  }

  if (req.method === 'DELETE') {
    const cars = await sql`SELECT * FROM cars WHERE id = ${id}`;
    if (cars.length === 0) return res.status(404).json({ error: 'Car not found' });

    // Delete blobs from Vercel Blob storage
    const images = await sql`SELECT url FROM car_images WHERE car_id = ${id}`;
    for (const img of images) {
      try {
        await del(img.url);
      } catch (e) {
        // Blob may already be deleted
      }
    }

    await sql`DELETE FROM cars WHERE id = ${id}`;
    return res.json({ message: 'Car deleted' });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
