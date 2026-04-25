const { Router } = require('express');
const store = require('../service/mock-state');
const { requireTeacher } = require('../utils/auth');

const router = Router();

router.use(...requireTeacher);

function getOwnedRoom(req, res) {
  const room = store.getRoomById(req.params.id);
  if (!room) {
    res.status(404).json({ ok: false, msg: '房间不存在' });
    return null;
  }
  if (room.teacherId !== req.auth.teacherId) {
    res.status(403).json({ ok: false, msg: '无权限' });
    return null;
  }
  return room;
}

router.get('/', (req, res) => {
  const rooms = store.listRoomsByTeacher(req.auth.teacherId).map(room => ({
    ...room,
    studentCount: Array.isArray(room.students) ? room.students.length : 0,
    onlineCount: store.countOnlineClients(room.id)
  }));

  res.json({ ok: true, rooms });
});

router.post('/', (req, res) => {
  const result = store.createRoom(req.auth.teacherId, req.body || {});
  if (!result.ok) {
    return res.status(400).json({ ok: false, msg: result.msg });
  }
  return res.json({ ok: true, room: result.room });
});

router.get('/:id', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;
  res.json({
    ok: true,
    room: {
      ...room,
      clients: store.listRoomClientsView(room.id)
    }
  });
});

router.put('/:id', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;

  const result = store.updateRoom(room.id, req.body || {});
  if (!result.ok) {
    return res.status(result.status || 400).json({ ok: false, msg: result.msg });
  }
  return res.json({ ok: true, room: result.room });
});

router.delete('/:id', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;

  if (store.countOnlineClients(room.id) > 0) {
    return res.status(400).json({ ok: false, msg: '房间内还有在线子机，无法删除' });
  }

  const result = store.deleteRoom(room.id);
  if (!result.ok) {
    return res.status(result.status || 400).json({ ok: false, msg: result.msg });
  }

  return res.json({ ok: true });
});

router.post('/:id/start', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;
  const sent = store.sendToRoom(room.id, { type: 'toggle-guard', enabled: true });
  return res.json({ ok: true, sent });
});

router.post('/:id/stop', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;
  const sent = store.sendToRoom(room.id, { type: 'toggle-guard', enabled: false });
  return res.json({ ok: true, sent });
});

router.post('/:id/broadcast', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;

  const message = String(req.body?.message || '').trim();
  if (!message) {
    return res.status(400).json({ ok: false, msg: '消息内容不能为空' });
  }

  const sent = store.sendToRoom(room.id, { type: 'broadcast', message });
  return res.json({ ok: true, sent });
});

router.get('/:id/students', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;

  const students = store.listRoomStudents(room.id) || [];
  return res.json({ ok: true, students });
});

router.post('/:id/students', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;

  const result = store.addRoomStudent(room.id, req.body || {});
  if (!result.ok) {
    return res.status(result.status || 400).json({ ok: false, msg: result.msg });
  }

  return res.json({ ok: true, student: result.student });
});

router.delete('/:id/students/:studentId', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;

  const result = store.deleteRoomStudent(room.id, req.params.studentId);
  if (!result.ok) {
    return res.status(result.status || 400).json({ ok: false, msg: result.msg });
  }

  return res.json({ ok: true });
});

router.get('/:id/clients', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;

  return res.json({ ok: true, clients: store.listRoomClientsView(room.id) });
});

router.post('/:id/clients/:cid/toggle-guard', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;

  const client = store.getClient(req.params.cid);
  if (!client || client.roomId !== room.id || !client.ws || client.ws.readyState !== 1) {
    return res.status(404).json({ ok: false, msg: '子机不在线' });
  }

  const enabled = req.body?.enabled === undefined ? !client.guardActive : Boolean(req.body.enabled);
  const ok = store.sendToClient(room.id, client.clientId, { type: 'toggle-guard', enabled });
  if (!ok) {
    return res.status(404).json({ ok: false, msg: '子机不在线' });
  }

  client.guardActive = enabled;
  return res.json({ ok: true });
});

router.post('/:id/clients/:cid/kill', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;

  const client = store.getClient(req.params.cid);
  if (!client || client.roomId !== room.id || !client.ws || client.ws.readyState !== 1) {
    return res.status(404).json({ ok: false, msg: '子机不在线' });
  }

  const pid = Number(req.body?.pid);
  const ok = store.sendToClient(room.id, client.clientId, { type: 'force-kill-process', pid });
  if (!ok) {
    return res.status(404).json({ ok: false, msg: '子机不在线' });
  }

  return res.json({ ok: true });
});

router.post('/:id/clients/:cid/update-whitelist', (req, res) => {
  const room = getOwnedRoom(req, res);
  if (!room) return;

  const client = store.getClient(req.params.cid);
  if (!client || client.roomId !== room.id || !client.ws || client.ws.readyState !== 1) {
    return res.status(404).json({ ok: false, msg: '子机不在线' });
  }

  const ok = store.sendToClient(room.id, client.clientId, {
    type: 'update-whitelist',
    whitelist: req.body?.whitelist || {}
  });

  if (!ok) {
    return res.status(404).json({ ok: false, msg: '子机不在线' });
  }

  return res.json({ ok: true });
});

module.exports = router;
