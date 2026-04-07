const { put } = require('@vercel/blob');
const { requireAuth } = require('../lib/auth');

async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const filename = req.query.filename;
  if (!filename) {
    return res.status(400).json({ error: 'filename query parameter is required' });
  }

  try {
    const blob = await put(filename, req, {
      access: 'public',
    });

    return res.json({ url: blob.url, filename: filename });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
