const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;
const blacklist = new Set();

function getToken(req) {
  const bearer = req.headers.authorization;
  if (bearer && bearer.startsWith('Bearer ')) return bearer.slice(7).trim();
  return req.cookies?.token ?? null;
}

module.exports = {
  verify: (token) => jwt.verify(token, secret),
  getToken,

  authenticate: (req, res, next) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: 'Missing or invalid token' });
    if (blacklist.has(token)) return res.status(401).json({ message: 'Token has been revoked' });
    try {
      req.user = jwt.verify(token, secret);
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  },

  verifyToken: (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/auth/login');
    if (blacklist.has(token)) return res.redirect('/auth/login');
    try {
      req.user = jwt.verify(token, secret);
      next();
    } catch (err) {
      return res.redirect('/auth/login');
    }
  },

  requireRole: (roles) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
      if (!req.user) return res.redirect('/auth/login');
      if (!allowedRoles.includes(req.user.role)) return res.redirect('/auth/login');
      next();
    };
  },

  requireRoleApi: (roles) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
      next();
    };
  },

  revoke: (req, res, next) => {
    const token = getToken(req);
    if (token) blacklist.add(token);
    next();
  },
};
