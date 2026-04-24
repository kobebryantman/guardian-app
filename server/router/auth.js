/**
 * POST /api/admin/login
 */
const { Router } = require('express');
const crypto = require('crypto');
const path = require('path');
const { loadJSON } = require('../utils/storage');
const { makeToken } = require('../utils/auth');

const router = Router();
const ADMIN_FILE = path.join(__dirname, '..', 'data', 'admin.json');

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const admins = loadJSON(ADMIN_FILE, []);
  const hash = crypto.createHash('sha256').update(password || '').digest('hex');
  const admin = admins.find(a => a.username === username && a.passwordHash === hash);
  if (!admin) return res.status(401).json({ ok: false, msg: '用户名或密码错误' });
  res.json({ ok: true, token: makeToken('admin:' + username), username, role: 'admin' });
});

module.exports = router;
