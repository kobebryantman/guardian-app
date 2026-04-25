const crypto = require('crypto');

const SECRET = 'guardian-api-secret';

function makeToken(payload = {}) {
  const content = {
    ...payload,
    iat: Date.now()
  };
  const body = Buffer.from(JSON.stringify(content)).toString('base64url');
  const sign = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sign}`;
}

function verifyToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const [body, sign] = token.split('.');
    if (!body || !sign) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
    if (expected !== sign) return null;
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
  } catch (_) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const claims = verifyToken(req.headers['x-token']);
  if (!claims) {
    return res.status(401).json({ ok: false, msg: '未登录或 token 无效' });
  }
  req.auth = claims;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.auth || req.auth.role !== role) {
      return res.status(403).json({ ok: false, msg: '无权限' });
    }
    next();
  };
}

const requireAdmin = [requireAuth, requireRole('admin')];
const requireTeacher = [requireAuth, requireRole('teacher')];

module.exports = {
  makeToken,
  verifyToken,
  requireAuth,
  requireAdmin,
  requireTeacher
};
