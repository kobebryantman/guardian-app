/**
 * WebSocket 子机接入处理
 */
const { WebSocketServer } = require('ws');
const os = require('os');

function setupWebSocket(server, clients) {
  const wss = new WebSocketServer({ server, path: '/guardian-ws' });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress.replace('::ffff:', '');
    const clientId = `${ip}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    clients.set(clientId, { ws, ip, clientId, studentId: null, hostname: os.hostname(), lastSeen: Date.now(), guardActive: false, violations: [], processCount: 0 });
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
          info.studentId = msg.studentId || null;
          info.hostname = msg.hostname || os.hostname();
          console.log(`[WS] ${clientId} 绑定学生: ${msg.studentId}`);
          break;
        case 'heartbeat':
          info.guardActive = msg.guardActive;
          info.processCount = msg.processCount || 0;
          if (msg.violations) info.violations = [...msg.violations, ...info.violations].slice(0, 50);
          ws.send(JSON.stringify({ type: 'heartbeat-ack' }));
          break;
        case 'violation-log':
          info.violations = [...(msg.violations || []), ...info.violations].slice(0, 50);
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

  setInterval(() => {
    const now = Date.now();
    clients.forEach((info, clientId) => {
      if (now - info.lastSeen > 120000) { info.ws.terminate(); clients.delete(clientId); }
    });
  }, 30000);
}

module.exports = { setupWebSocket };
