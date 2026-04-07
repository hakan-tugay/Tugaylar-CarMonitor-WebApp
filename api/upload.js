const { put } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const filename = req.query.filename;
  if (!filename) {
    return res.status(400).json({ error: 'filename query parameter is required' });
  }

  const blob = await put(filename, req.body, {
    access: 'public',
  });

  return res.json({ url: blob.url, filename: filename });
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
