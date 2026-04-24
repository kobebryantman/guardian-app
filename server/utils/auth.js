/**
 * Token 生成/验证 + 认证中间件
 */
const crypto = require('crypto');
const path = require('path');
const { loadJSON, saveJSON } = require('./storage');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const SECRET = 'guardian-secret-2026';

function makeToken(id) {
  const data = `${id}:${Date.now()}`;
  return Buffer.from(`${data}:${crypto.createHmac('sha1', SECRET).update(data).digest('hex')}`).toString('base64');
}

function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 3) return null;
    return parts[0];
  } catch { return null; }
}

/** Express 中间件：验证 x-token header */
function requireAuth(req, res, next) {
  const id = verifyToken(req.headers['x-token']);
  if (!id) return res.status(401).json({ ok: false, msg: '未登录或 token 无效' });
  req.authId = id;
  next();
}

/** 首次启动时创建默认管理员 */
function ensureAdmin() {
  const admins = loadJSON(ADMIN_FILE, []);
  if (admins.length === 0) {
    admins.push({
      username: 'admin',
      passwordHash: crypto.createHash('sha256').update('guardian2026').digest('hex'),
      role: 'admin'
    });
    saveJSON(ADMIN_FILE, admins);
  }
}

module.exports = { makeToken, verifyToken, requireAuth, ensureAdmin };
