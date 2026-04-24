/**
 * Guardian 管控服务器 — 入口
 */
const http = require('http');
const app = require('./app');
const { setupWebSocket } = require('../service/ws-handler');
const { clients } = require('../service/state');

const PORT = 3847;

const server = http.createServer(app);
setupWebSocket(server, clients);

server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Guardian 管控服务器 启动成功               ║');
  console.log(`║   教师端 UI:  http://localhost:${PORT}         ║`);
  console.log(`║   子机 WebSocket: ws://localhost:${PORT}/guardian-ws  ║`);
  console.log(`║   默认账号: admin / guardian2026             ║`);
  console.log('╚════════════════════════════════════════════╝');
});
