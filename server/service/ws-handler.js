const { WebSocketServer } = require('ws');
const store = require('./mock-state');

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/guardian-ws' });

  wss.on('connection', (ws, req) => {
    const ip = String(req.socket.remoteAddress || '').replace('::ffff:', '');
    const client = store.createClient(ws, ip);

    ws.send(JSON.stringify({ type: 'welcome', clientId: client.clientId }));

    const bindTimeout = setTimeout(() => {
      const current = store.getClient(client.clientId);
      if (current && !current.roomId) {
        ws.close(4000, 'bind timeout');
      }
    }, 30000);

    ws.on('message', raw => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (_) {
        return;
      }

      store.touchClient(client.clientId);

      switch (msg.type) {
        case 'bind': {
          const joinCode = msg.roomCode || msg.joinCode;
          const room = store.findRoomByJoinCode(joinCode);
          if (!room) {
            ws.send(JSON.stringify({ type: 'bind-ack', ok: false, msg: '房间码无效' }));
            return;
          }

          const student = store.findStudentInRoom(room, msg.studentId);
          if (!student) {
            ws.send(JSON.stringify({ type: 'bind-ack', ok: false, msg: '该学号未在本房间注册' }));
            return;
          }

          store.bindClient(client.clientId, {
            roomId: room.id,
            studentId: student.studentId,
            studentName: msg.name || student.name,
            hostname: msg.hostname || ''
          });

          ws.send(JSON.stringify({
            type: 'bind-ack',
            ok: true,
            roomId: room.id,
            roomName: room.roomName
          }));
          break;
        }

        case 'heartbeat':
          store.updateClientHeartbeat(client.clientId, msg);
          ws.send(JSON.stringify({ type: 'heartbeat-ack' }));
          break;

        case 'violation-log':
          store.appendClientViolations(client.clientId, msg.violations || []);
          break;

        default:
          break;
      }
    });

    ws.on('close', () => {
      clearTimeout(bindTimeout);
      store.deleteClient(client.clientId);
    });

    ws.on('error', () => {
      clearTimeout(bindTimeout);
      store.deleteClient(client.clientId);
    });
  });

  setInterval(() => {
    store.pruneInactiveClients(120000);
  }, 30000);
}

module.exports = { setupWebSocket };
