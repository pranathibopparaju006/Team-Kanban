const jwt = require('jsonwebtoken');

const DEVELOPMENT_SECRET = 'dev-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || DEVELOPMENT_SECRET;
const INSECURE_SECRETS = new Set([DEVELOPMENT_SECRET, 'change-this-in-production']);

if (process.env.NODE_ENV === 'production' && INSECURE_SECRETS.has(JWT_SECRET)) {
  throw new Error('JWT_SECRET must be configured with a strong value in production.');
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function roles(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

module.exports = { auth, roles, JWT_SECRET };
