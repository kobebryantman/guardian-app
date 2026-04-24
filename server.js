/**
 * Guardian 远程管控服务器
 * 教师端运行：管理所有学生子机、查看违规记录、下发策略
 *
 * 启动：node server.js
 * 默认端口：3847（教师端 UI + WebSocket 子机接入）
 */

const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// ============ 配置 ============
const PORT = 3847;
const DATA_DIR = path.join(__dirname, 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// 简单的 JWT-like token（无外部依赖）
function makeToken(studentId) {
  const secret = 'guardian-secret-2026';
  const data = `${studentId}:${Date.now()}`;
  return Buffer.from(`${data}:${crypto.createHmac('sha1', secret).update(data).digest('hex')}`).toString('base64');
}
function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 3) return null;
    return parts[0]; // studentId
  } catch { return null; }
}

// ============ 数据存储（JSON 文件） ============
function loadJSON(file, defaults) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch(e) { console.error('loadJSON error', file, e.message); }
  return defaults;
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

let students = loadJSON(STUDENTS_FILE, []);
let sessions = loadJSON(SESSIONS_FILE, {});

// 默认管理员密码 admin/guardian2026（首次启动自动创建）
function ensureAdmin() {
  const admins = loadJSON(ADMIN_FILE, []);
  if (admins.length === 0) {
    admins.push({ username: 'admin', passwordHash: crypto.createHash('sha256').update('guardian2026').digest('hex'), role: 'admin' });
    saveJSON(ADMIN_FILE, admins);
  }
}
ensureAdmin();

// ============ WebSocket 在线子机 ============
let clients = new Map(); // clientId -> { ws, studentId, ip, hostname, lastSeen, guardActive, violations }

// ============ Express App ============
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 根路径直接打开管控中心
app.get('/', (req, res) => res.redirect('/control.html'));

// ---- REST API：教师认证 ----
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const admins = loadJSON(ADMIN_FILE, []);
  const hash = crypto.createHash('sha256').update(password || '').digest('hex');
  const admin = admins.find(a => a.username === username && a.passwordHash === hash);
  if (!admin) return res.status(401).json({ ok: false, msg: '用户名或密码错误' });
  const token = makeToken('admin:' + username);
  res.json({ ok: true, token, username, role: 'admin' });
});

// ---- REST API：学生管理 ----
app.get('/api/students', (req, res) => {
  const token = req.headers['x-token'];
  if (!verifyToken(token)) return res.status(401).json({ ok: false });
  res.json({ ok: true, students });
});

app.post('/api/students', (req, res) => {
  const token = req.headers['x-token'];
  if (!verifyToken(token)) return res.status(401).json({ ok: false });
  const { studentName, seatNumber, className } = req.body || {};
  if (!studentName) return res.status(400).json({ ok: false, msg: '缺少学生姓名' });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  // 生成子机接入码（6位字母数字）
  const joinCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  const student = { id, studentName, seatNumber: seatNumber || '', className: className || '', joinCode, createdAt: new Date().toISOString() };
  students.push(student);
  saveJSON(STUDENTS_FILE, students);
  res.json({ ok: true, student });
});

app.put('/api/students/:id', (req, res) => {
  const token = req.headers['x-token'];
  if (!verifyToken(token)) return res.status(401).json({ ok: false });
  const idx = students.findIndex(s => s.id === req.params.id);
  if (idx < 0) return res.status(404).json({ ok: false, msg: '学生不存在' });
  students[idx] = { ...students[idx], ...req.body, id: req.params.id };
  saveJSON(STUDENTS_FILE, students);
  res.json({ ok: true, student: students[idx] });
});

app.delete('/api/students/:id', (req, res) => {
  const token = req.headers['x-token'];
  if (!verifyToken(token)) return res.status(401).json({ ok: false });
  students = students.filter(s => s.id !== req.params.id);
  saveJSON(STUDENTS_FILE, students);
  res.json({ ok: true });
});

// ---- REST API：查询子机状态 ----
app.get('/api/clients', (req, res) => {
  const token = req.headers['x-token'];
  if (!verifyToken(token)) return res.status(401).json({ ok: false });
  const clientList = [];
  clients.forEach((info, clientId) => {
    const student = students.find(s => s.id === info.studentId);
    clientList.push({
      clientId,
      studentId: info.studentId,
      studentName: student ? student.studentName : '未知',
      seatNumber: student ? student.seatNumber : '',
      className: student ? student.className : '',
      ip: info.ip,
      hostname: info.hostname,
      guardActive: info.guardActive,
      online: info.ws.readyState === 1,
      lastSeen: info.lastSeen,
      violations: info.violations,
      processCount: info.processCount || 0
    });
  });
  res.json({ ok: true, clients: clientList });
});

// ---- REST API：强制某台子机下线 ----
app.post('/api/clients/:clientId/kill', (req, res) => {
  const token = req.headers['x-token'];
  if (!verifyToken(token)) return res.status(401).json({ ok: false });
  const client = clients.get(req.params.clientId);
  if (!client) return res.status(404).json({ ok: false, msg: '子机不在线' });
  client.ws.send(JSON.stringify({ type: 'force-kill-process', pid: req.body.pid }));
  res.json({ ok: true });
});

app.post('/api/clients/:clientId/toggle-guard', (req, res) => {
  const token = req.headers['x-token'];
  if (!verifyToken(token)) return res.status(401).json({ ok: false });
  const client = clients.get(req.params.clientId);
  if (!client) return res.status(404).json({ ok: false, msg: '子机不在线' });
  const action = req.body.enabled === undefined ? !client.guardActive : req.body.enabled;
  client.ws.send(JSON.stringify({ type: 'toggle-guard', enabled: action }));
  res.json({ ok: true });
});

app.post('/api/clients/:clientId/update-whitelist', (req, res) => {
  const token = req.headers['x-token'];
  if (!verifyToken(token)) return res.status(401).json({ ok: false });
  const client = clients.get(req.params.clientId);
  if (!client) return res.status(404).json({ ok: false, msg: '子机不在线' });
  client.ws.send(JSON.stringify({ type: 'update-whitelist', whitelist: req.body.whitelist }));
  res.json({ ok: true });
});

// ---- REST API：广播策略给所有子机 ----
app.post('/api/broadcast', (req, res) => {
  const token = req.headers['x-token'];
  if (!verifyToken(token)) return res.status(401).json({ ok: false });
  let sent = 0;
  clients.forEach((info) => {
    if (info.ws.readyState === 1) {
      info.ws.send(JSON.stringify({ type: 'broadcast', ...req.body }));
      sent++;
    }
  });
  res.json({ ok: true, sent });
});

// ---- REST API：学生端扫码/登录 ----
// 子机用 joinCode 关联学生身份
app.post('/api/student/bind', (req, res) => {
  const { joinCode, clientId, hostname } = req.body || {};
  const student = students.find(s => s.joinCode === joinCode);
  if (!student) return res.status(404).json({ ok: false, msg: '无效的接入码' });
  if (clientId && clients.has(clientId)) {
    const info = clients.get(clientId);
    info.studentId = student.id;
    info.hostname = hostname || os.hostname();
    info.ip = req.ip || '';
  }
  res.json({ ok: true, studentId: student.id, studentName: student.studentName });
});

// ============ HTTP Server ============
const server = http.createServer(app);

// ============ WebSocket Server（子机接入） ============
const wss = new WebSocketServer({ server, path: '/guardian-ws' });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress.replace('::ffff:', '');
  const clientId = `${ip}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  clients.set(clientId, {
    ws, ip, clientId,
    studentId: null,       // 绑定学生后才设置
    hostname: os.hostname(),
    lastSeen: Date.now(),
    guardActive: false,
    violations: [],
    processCount: 0
  });

  console.log(`[WS] 子机接入: ${clientId} (${ip})，当前在线: ${clients.size}`);

  ws.send(JSON.stringify({ type: 'welcome', clientId }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const info = clients.get(clientId);
    if (!info) return;
    info.lastSeen = Date.now();

    switch (msg.type) {
      case 'bind':
        // 子机用学生ID绑定
        info.studentId = msg.studentId || null;
        info.hostname = msg.hostname || os.hostname();
        console.log(`[WS] ${clientId} 绑定学生: ${msg.studentId}`);
        break;

      case 'heartbeat':
        info.guardActive = msg.guardActive;
        info.processCount = msg.processCount || 0;
        if (msg.violations) {
          info.violations = [...msg.violations, ...info.violations].slice(0, 50);
        }
        ws.send(JSON.stringify({ type: 'heartbeat-ack' }));
        break;

      case 'violation-log':
        info.violations = [...(msg.violations || []), ...info.violations].slice(0, 50);
        break;

      default:
        break;
    }
  });

  ws.on('close', () => {
    console.log(`[WS] 子机断开: ${clientId}，当前在线: ${clients.size}`);
    clients.delete(clientId);
  });

  ws.on('error', (err) => {
    console.error(`[WS] ${clientId} 错误:`, err.message);
    clients.delete(clientId);
  });
});

// ============ 清理超时子机（超过 2 分钟无心跳） ============
setInterval(() => {
  const now = Date.now();
  clients.forEach((info, clientId) => {
    if (now - info.lastSeen > 120000) {
      console.log(`[WS] 子机超时断开: ${clientId}`);
      info.ws.terminate();
      clients.delete(clientId);
    }
  });
}, 30000);

// ============ 启动 ============
server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Guardian 管控服务器 启动成功               ║');
  console.log(`║   教师端 UI:  http://localhost:${PORT}         ║`);
  console.log(`║   子机 WebSocket: ws://localhost:${PORT}/guardian-ws  ║`);
  console.log(`║   默认账号: admin / guardian2026             ║`);
  console.log('╚════════════════════════════════════════════╝');
});
