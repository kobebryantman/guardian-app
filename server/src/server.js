const http = require('http');
const app = require('./app');
const { setupWebSocket } = require('../service/ws-handler');

const PORT = 3847;

const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Guardian server listening on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/guardian-ws`);
  console.log('Default admin: admin / guardian2026');
});
