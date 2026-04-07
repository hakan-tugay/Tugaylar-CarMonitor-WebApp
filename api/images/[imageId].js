const { getDb, ensureTables } = require('../../lib/db');
const { del } = require('@vercel/blob');
const { requireAuth } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  await ensureTables();
  const sql = getDb();
  const { imageId } = req.query;

  if (req.method === 'DELETE') {
    const images = await sql`SELECT * FROM car_images WHERE id = ${imageId}`;
    if (images.length === 0) return res.status(404).json({ error: 'Image not found' });

    try {
      await del(images[0].url);
    } catch (e) {
      // Blob may already be deleted
    }

    await sql`DELETE FROM car_images WHERE id = ${imageId}`;
    return res.json({ message: 'Image deleted' });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
