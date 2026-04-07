const jwt = require('jsonwebtoken');

const SECRET = process.env.AUTH_SECRET || 'dev-secret-change-me';

function createToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role || 'user' }, SECRET, { expiresIn: '30d' });
}

function authenticate(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  try {
    return jwt.verify(header.slice(7), SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res) {
  const user = authenticate(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  return user;
}

function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return user;
}

module.exports = { createToken, authenticate, requireAuth, requireAdmin };
