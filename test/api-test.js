const http = require('http');
const { WebSocket } = require('../server/node_modules/ws');

// ── Colors ──
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', GRAY = '\x1b[2m', RESET = '\x1b[0m';

// ── Stats ──
let passed = 0, failed = 0;

function debug(msg) { console.log(`  ${CYAN}::${RESET} ${msg}`); }

function suite(name, fn) {
  console.log(`\n${YELLOW}▶ ${name}${RESET}`);
  return fn();
}

function check(okMsg, cond, errMsg, err) {
  if (cond) { passed++; console.log(`  ${GREEN}✓${RESET} ${okMsg} ${GRAY}(${errMsg})${RESET}`); }
  else {
    failed++;
    console.log(`  ${RED}✗${RESET} ${okMsg}${RED} — ${errMsg}${RESET}`);
    if (err) console.error(err);
  }
}

// ── HTTP helper ──
let PORT;
function req(method, path, body, token) {
  return new Promise((resolve) => {
    const opts = { hostname: '127.0.0.1', port: PORT, path, method, headers: {} };
    if (body) opts.headers['Content-Type'] = 'application/json';
    if (token) opts.headers['X-Token'] = token;
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let b;
        try { b = JSON.parse(data); } catch { b = data; }
        resolve({ status: res.statusCode, body: b });
      });
    });
    r.on('error', e => resolve({ error: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

// ── WebSocket helper ──
function wsConnect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/guardian-ws`);
    const buf = [];
    ws.on('message', data => buf.push(data));
    ws.on('open', () => { ws._buf = buf; resolve(ws); });
    ws.on('error', reject);
    setTimeout(() => reject(new Error('WS connect timeout')), 3000);
  });
}

function wsSend(ws, msg) { ws.send(JSON.stringify(msg)); }
function wsWait(ws, type, timeout = 3000) {
  return new Promise((resolve, reject) => {
    // check buffer first
    for (let i = 0; i < ws._buf.length; i++) {
      try {
        const m = JSON.parse(ws._buf[i].toString());
        if (m.type === type) { ws._buf.splice(i, 1); return resolve(m); }
      } catch {}
    }
    const t = setTimeout(() => reject(new Error(`WS wait "${type}" timeout`)), timeout);
    function handler(data) {
      let m;
      try { m = JSON.parse(data.toString()); } catch { return; }
      if (m.type === type) { clearTimeout(t); resolve(m); }
    }
    ws.on('message', handler);
  });
}

// ══════════════════════════════════════════
//  Main
// ══════════════════════════════════════════
async function main() {
  const httpServer = http.createServer(require('../server/src/app'));
  require('../server/service/ws-handler').setupWebSocket(httpServer);

  await new Promise(resolve => httpServer.listen(0, () => {
    PORT = httpServer.address().port;
    console.log(`${GREEN}✓${RESET} Server started on :${PORT}\n${GRAY}${'─'.repeat(50)}${RESET}`);
    resolve();
  }));

  let adminToken, teacherToken, teacherId, roomId, joinCode, clientId, ws;

  // ──────────────────────────────────────────
  //  Admin
  // ──────────────────────────────────────────
  await suite('Admin /api/admin', async () => {
    let r = await req('POST', '/api/admin/login', { username: 'admin', password: 'guardian2026' });
    check('POST /login → 200 + token', r.status === 200 && r.body.ok && r.body.token,
      r.status + ' ' + JSON.stringify(r.body));
    adminToken = r.body.token;

    r = await req('POST', '/api/admin/login', { username: 'admin', password: 'wrong' });
    check('POST /login bad password → 401', r.status === 401,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('POST', '/api/admin/teachers', { staffId: 'T001', name: '张三', password: '123456' }, adminToken);
    check('POST /teachers → 200 + teacher', r.status === 200 && r.body.ok && r.body.teacher.staffId === 'T001',
      r.status + ' ' + JSON.stringify(r.body));
    teacherId = r.body.teacher.id;

    r = await req('POST', '/api/admin/teachers', { staffId: 'T001', name: '李四', password: '123456' }, adminToken);
    check('POST /teachers dup → 400', r.status === 400,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('GET', '/api/admin/teachers', null, adminToken);
    check('GET /teachers → list has T001', r.status === 200 && r.body.teachers.some(t => t.staffId === 'T001'),
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('GET', `/api/admin/teachers/${teacherId}`, null, adminToken);
    check('GET /teachers/:id → found', r.status === 200 && r.body.ok,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('PUT', `/api/admin/teachers/${teacherId}`, { name: '张三丰' }, adminToken);
    check('PUT /teachers/:id → name updated', r.status === 200 && r.body.teacher.name === '张三丰',
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('GET', '/api/admin/teachers', null);
    check('GET /teachers no token → 401', r.status === 401,
      r.status + ' ' + JSON.stringify(r.body));
  });

  // ──────────────────────────────────────────
  //  Teacher
  // ──────────────────────────────────────────
  await suite('Teacher /api/teacher', async () => {
    let r = await req('POST', '/api/teacher/login', { staffId: 'T001', password: '123456' });
    check('POST /login → 200 + token', r.status === 200 && r.body.ok && r.body.token,
      r.status + ' ' + JSON.stringify(r.body));
    teacherToken = r.body.token;

    r = await req('POST', '/api/teacher/login', { staffId: 'T001', password: 'wrong' });
    check('POST /login bad password → 401', r.status === 401,
      r.status + ' ' + JSON.stringify(r.body));
  });

  // ──────────────────────────────────────────
  //  Rooms (teacher)
  // ──────────────────────────────────────────
  await suite('Rooms /api/rooms', async () => {
    let r = await req('POST', '/api/rooms', { roomName: '101教室' }, teacherToken);
    check('POST / → 200 + room', r.status === 200 && r.body.ok && r.body.room.roomName === '101教室',
      r.status + ' ' + JSON.stringify(r.body));
    roomId = r.body.room.id;
    joinCode = r.body.room.joinCode;
    debug(`roomId=${roomId} joinCode=${joinCode}`);

    r = await req('GET', '/api/rooms', null, teacherToken);
    check('GET / → list has room', r.status === 200 && r.body.rooms.some(rm => rm.id === roomId),
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('GET', `/api/rooms/${roomId}`, null, teacherToken);
    check('GET /:id → 200', r.status === 200 && r.body.ok,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('PUT', `/api/rooms/${roomId}`, { roomName: '102教室' }, teacherToken);
    check('PUT /:id → renamed', r.status === 200 && r.body.room.roomName === '102教室',
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('POST', `/api/rooms/${roomId}/start`, null, teacherToken);
    check('POST /:id/start → sent', r.status === 200 && r.body.ok,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('POST', `/api/rooms/${roomId}/stop`, null, teacherToken);
    check('POST /:id/stop → sent', r.status === 200 && r.body.ok,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('POST', `/api/rooms/${roomId}/broadcast`, { message: '' }, teacherToken);
    check('POST /:id/broadcast empty → 400', r.status === 400,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('POST', `/api/rooms/${roomId}/students`, { studentId: 'S001', name: '王小明' }, teacherToken);
    check('POST /:id/students → added', r.status === 200 && r.body.ok,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('POST', `/api/rooms/${roomId}/students`, { studentId: 'S001', name: '王小明' }, teacherToken);
    check('POST /:id/students dup → 400', r.status === 400,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('POST', `/api/rooms/${roomId}/students`, { studentId: 'S002', name: '李小华' }, teacherToken);
    check('POST /:id/students second → added', r.status === 200 && r.body.ok,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('GET', `/api/rooms/${roomId}/students`, null, teacherToken);
    check('GET /:id/students → count 2', r.status === 200 && r.body.students.length === 2,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('DELETE', `/api/rooms/${roomId}/students/S002`, null, teacherToken);
    check('DELETE /:id/students/:sid → done', r.status === 200 && r.body.ok,
      r.status + ' ' + JSON.stringify(r.body));
  });

  // ──────────────────────────────────────────
  //  Student bind (HTTP)
  // ──────────────────────────────────────────
  await suite('Student /api/student', async () => {
    let r = await req('POST', '/api/student/bind', {});
    check('POST /bind empty → 400', r.status === 400,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('POST', '/api/student/bind', { joinCode: 'XXXXXX', studentId: 'S001' });
    check('POST /bind bad code → 404', r.status === 404,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('POST', '/api/student/bind', { joinCode, studentId: 'S001', name: '王小明' });
    check('POST /bind valid → 200', r.status === 200 && r.body.ok && r.body.studentId === 'S001',
      r.status + ' ' + JSON.stringify(r.body));
  });

  // ──────────────────────────────────────────
  //  WebSocket
  // ──────────────────────────────────────────
  await suite('WebSocket /guardian-ws', async () => {
    ws = await wsConnect();
    check('connect → success', !!ws, 'connect failed');

    const welcome = await wsWait(ws, 'welcome');
    check('welcome message received', welcome && welcome.clientId,
      JSON.stringify(welcome));
    clientId = welcome.clientId;

    // Bind via WS
    wsSend(ws, { type: 'bind', roomCode: joinCode, studentId: 'S001', name: '王小明', hostname: 'PC-01' });
    const bindAck = await wsWait(ws, 'bind-ack');
    check('WS bind → ok', bindAck && bindAck.ok,
      JSON.stringify(bindAck));

    // Heartbeat
    wsSend(ws, { type: 'heartbeat', guardActive: true, processCount: 3, violations: [] });
    const hbAck = await wsWait(ws, 'heartbeat-ack');
    check('WS heartbeat → ack', hbAck && hbAck.type === 'heartbeat-ack',
      JSON.stringify(hbAck));

    // Broadcast (teacher → room → WS)
    let r = await req('POST', `/api/rooms/${roomId}/broadcast`, { message: '测试消息' }, teacherToken);
    check('Teacher broadcast → sent', r.status === 200 && r.body.ok && r.body.sent > 0,
      r.status + ' ' + JSON.stringify(r.body));

    const bcMsg = await wsWait(ws, 'broadcast');
    check('WS received broadcast', bcMsg && bcMsg.message === '测试消息',
      JSON.stringify(bcMsg));

    // Clients list should show the client
    r = await req('GET', `/api/rooms/${roomId}/clients`, null, teacherToken);
    check('GET /:id/clients → client listed',
      r.status === 200 && r.body.clients.some(c => c.clientId === clientId),
      r.status + ' ' + JSON.stringify(r.body));
  });

  // ──────────────────────────────────────────
  //  Admin — room listing
  // ──────────────────────────────────────────
  await suite('Admin rooms', async () => {
    let r = await req('GET', '/api/admin/rooms', null, adminToken);
    check('GET /api/admin/rooms → list', r.status === 200 && r.body.rooms.length > 0,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('GET', `/api/admin/rooms/${roomId}`, null, adminToken);
    check('GET /api/admin/rooms/:id → detail', r.status === 200 && r.body.ok,
      r.status + ' ' + JSON.stringify(r.body));
  });

  // ──────────────────────────────────────────
  //  Teacher — password change
  // ──────────────────────────────────────────
  await suite('Teacher password', async () => {
    let r = await req('PUT', '/api/teacher/password', { oldPassword: 'wrong', newPassword: '654321' }, teacherToken);
    check('PUT /password bad old → 401', r.status === 401,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('PUT', '/api/teacher/password', { oldPassword: '123456', newPassword: '654321' }, teacherToken);
    check('PUT /password correct → ok', r.status === 200 && r.body.ok,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('POST', '/api/teacher/login', { staffId: 'T001', password: '654321' });
    check('POST /login with new password → ok', r.status === 200 && r.body.ok,
      r.status + ' ' + JSON.stringify(r.body));

    // restore
    await req('PUT', '/api/teacher/password', { oldPassword: '654321', newPassword: '123456' }, teacherToken);
  });

  // ──────────────────────────────────────────
  //  Cleanup
  // ──────────────────────────────────────────
  await suite('Cleanup', async () => {
    if (ws) ws.close();
    let r = await req('DELETE', `/api/admin/rooms/${roomId}`, null, adminToken);
    check('DELETE /api/admin/rooms/:id → done', r.status === 200 && r.body.ok,
      r.status + ' ' + JSON.stringify(r.body));

    r = await req('DELETE', `/api/admin/teachers/${teacherId}`, null, adminToken);
    check('DELETE /api/admin/teachers/:id → done', r.status === 200 && r.body.ok,
      r.status + ' ' + JSON.stringify(r.body));
  });

  // ──────────────────────────────────────────
  //  Summary
  // ──────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${GRAY}${'─'.repeat(50)}${RESET}`);
  console.log(`${GREEN}${passed}${RESET} passed, ${RED}${failed}${RESET} failed, ${total} total`);

  httpServer.close(() => process.exit(failed ? 1 : 0));
}

main().catch(err => { console.error(err); process.exit(1); });
