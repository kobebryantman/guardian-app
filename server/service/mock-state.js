const crypto = require('crypto');

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'guardian2026'
};

const teachers = [];
const rooms = [];
const clients = new Map();

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

function newJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getOnline(client) {
  return Boolean(client && client.ws && client.ws.readyState === 1);
}

function safeTeacher(teacher) {
  if (!teacher) return null;
  const { password, ...rest } = teacher;
  return rest;
}

function defaultRoomConfig() {
  return {
    guard: {
      checkInterval: 3000,
      notifyOnly: false,
      autoStartGuard: true
    },
    schedule: {
      autoMode: false,
      gracePeriod: 15,
      allowLateJoin: true
    },
    whitelist: {
      processes: [],
      browsers: [],
      urls: []
    },
    violations: {
      maxAllowed: 0
    }
  };
}

function mergeRoomConfig(payload = {}) {
  const defaults = defaultRoomConfig();
  return {
    guard: { ...defaults.guard, ...(payload.guard || {}) },
    schedule: { ...defaults.schedule, ...(payload.schedule || {}) },
    whitelist: {
      processes: Array.isArray(payload.whitelist?.processes) ? payload.whitelist.processes : defaults.whitelist.processes,
      browsers: Array.isArray(payload.whitelist?.browsers) ? payload.whitelist.browsers : defaults.whitelist.browsers,
      urls: Array.isArray(payload.whitelist?.urls) ? payload.whitelist.urls : defaults.whitelist.urls
    },
    violations: { ...defaults.violations, ...(payload.violations || {}) }
  };
}

function verifyAdmin(username, password) {
  return username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password;
}

function listTeachers() {
  return teachers.map(safeTeacher);
}

function findTeacherByStaffId(staffId) {
  return teachers.find(teacher => teacher.staffId === staffId) || null;
}

function getTeacherById(id) {
  const teacher = teachers.find(item => item.id === id) || null;
  return safeTeacher(teacher);
}

function createTeacher(payload = {}) {
  const staffId = String(payload.staffId || '').trim();
  const name = String(payload.name || '').trim();
  const password = String(payload.password || '');

  if (!staffId || !name || !password) {
    return { ok: false, msg: '缺少必要字段' };
  }

  if (findTeacherByStaffId(staffId)) {
    return { ok: false, msg: '工号已存在' };
  }

  const teacher = {
    id: randomId('t'),
    staffId,
    name,
    password,
    createdAt: nowIso()
  };
  teachers.push(teacher);
  return { ok: true, teacher: safeTeacher(teacher) };
}

function updateTeacher(id, payload = {}) {
  const teacher = teachers.find(item => item.id === id);
  if (!teacher) {
    return { ok: false, status: 404, msg: '教师不存在' };
  }

  if (payload.staffId !== undefined) {
    const staffId = String(payload.staffId || '').trim();
    if (!staffId) {
      return { ok: false, msg: '工号不能为空' };
    }
    const duplicate = findTeacherByStaffId(staffId);
    if (duplicate && duplicate.id !== id) {
      return { ok: false, msg: '工号已存在' };
    }
    teacher.staffId = staffId;
  }

  if (payload.name !== undefined) {
    const name = String(payload.name || '').trim();
    if (!name) {
      return { ok: false, msg: '姓名不能为空' };
    }
    teacher.name = name;
  }

  if (payload.password !== undefined) {
    teacher.password = String(payload.password || '');
  }

  return { ok: true, teacher: safeTeacher(teacher) };
}

function deleteTeacher(id) {
  const idx = teachers.findIndex(teacher => teacher.id === id);
  if (idx < 0) {
    return { ok: false, status: 404, msg: '教师不存在' };
  }
  teachers.splice(idx, 1);
  return { ok: true };
}

function verifyTeacher(staffId, password) {
  const teacher = findTeacherByStaffId(staffId);
  if (!teacher || teacher.password !== password) {
    return null;
  }
  return teacher;
}

function updateTeacherPassword(id, oldPassword, newPassword) {
  const teacher = teachers.find(item => item.id === id);
  if (!teacher) {
    return { ok: false, status: 404, msg: '教师不存在' };
  }
  if (teacher.password !== oldPassword) {
    return { ok: false, status: 401, msg: '旧密码错误' };
  }
  teacher.password = String(newPassword || '');
  return { ok: true };
}

function listRooms() {
  return rooms;
}

function listRoomsByTeacher(teacherId) {
  return rooms.filter(room => room.teacherId === teacherId);
}

function getRoomById(id) {
  return rooms.find(room => room.id === id) || null;
}

function createRoom(teacherId, payload = {}) {
  const roomName = String(payload.roomName || '').trim();
  if (!roomName) {
    return { ok: false, msg: '房间名称不能为空' };
  }

  let joinCode = newJoinCode();
  while (rooms.some(room => room.joinCode === joinCode)) {
    joinCode = newJoinCode();
  }

  const config = mergeRoomConfig(payload);
  const room = {
    id: randomId('r'),
    roomName,
    joinCode,
    teacherId,
    createdAt: nowIso(),
    guard: config.guard,
    schedule: config.schedule,
    whitelist: config.whitelist,
    violations: config.violations,
    students: Array.isArray(payload.students)
      ? payload.students
          .filter(student => student && student.studentId)
          .map(student => ({ studentId: String(student.studentId), name: String(student.name || '') }))
      : []
  };

  rooms.push(room);
  return { ok: true, room };
}

function updateRoom(id, payload = {}) {
  const room = getRoomById(id);
  if (!room) {
    return { ok: false, status: 404, msg: '房间不存在' };
  }

  if (payload.roomName !== undefined) {
    const roomName = String(payload.roomName || '').trim();
    if (!roomName) {
      return { ok: false, msg: '房间名称不能为空' };
    }
    room.roomName = roomName;
  }

  if (payload.guard) {
    room.guard = { ...room.guard, ...payload.guard };
  }
  if (payload.schedule) {
    room.schedule = { ...room.schedule, ...payload.schedule };
  }
  if (payload.whitelist) {
    room.whitelist = { ...room.whitelist, ...payload.whitelist };
  }
  if (payload.violations) {
    room.violations = { ...room.violations, ...payload.violations };
  }

  return { ok: true, room };
}

function deleteRoom(id) {
  const idx = rooms.findIndex(room => room.id === id);
  if (idx < 0) {
    return { ok: false, status: 404, msg: '房间不存在' };
  }
  rooms.splice(idx, 1);
  return { ok: true };
}

function listRoomStudents(roomId) {
  const room = getRoomById(roomId);
  return room ? room.students : null;
}

function addRoomStudent(roomId, payload = {}) {
  const room = getRoomById(roomId);
  if (!room) {
    return { ok: false, status: 404, msg: '房间不存在' };
  }

  const studentId = String(payload.studentId || '').trim();
  const name = String(payload.name || '').trim();
  if (!studentId || !name) {
    return { ok: false, msg: '缺少学号或姓名' };
  }

  if (room.students.some(student => student.studentId === studentId)) {
    return { ok: false, msg: '该学号已在本房间中' };
  }

  const student = { studentId, name };
  room.students.push(student);
  return { ok: true, student };
}

function deleteRoomStudent(roomId, studentId) {
  const room = getRoomById(roomId);
  if (!room) {
    return { ok: false, status: 404, msg: '房间不存在' };
  }

  const before = room.students.length;
  room.students = room.students.filter(student => student.studentId !== studentId);
  if (before === room.students.length) {
    return { ok: false, status: 404, msg: '学生不存在' };
  }

  return { ok: true };
}

function findRoomByJoinCode(joinCode) {
  return rooms.find(room => room.joinCode === String(joinCode || '').trim().toUpperCase()) || null;
}

function findStudentInRoom(room, studentId) {
  if (!room) return null;
  return room.students.find(student => student.studentId === String(studentId || '').trim()) || null;
}

function createClient(ws, ip) {
  const clientId = randomId('c');
  const client = {
    clientId,
    ws,
    ip: String(ip || ''),
    hostname: '',
    roomId: null,
    studentId: null,
    studentName: null,
    guardActive: false,
    processCount: 0,
    violations: [],
    lastSeen: Date.now(),
    bindAt: null
  };
  clients.set(clientId, client);
  return client;
}

function getClient(clientId) {
  return clients.get(clientId) || null;
}

function deleteClient(clientId) {
  clients.delete(clientId);
}

function touchClient(clientId) {
  const client = getClient(clientId);
  if (!client) return;
  client.lastSeen = Date.now();
}

function bindClient(clientId, payload = {}) {
  const client = getClient(clientId);
  if (!client) {
    return null;
  }

  client.roomId = payload.roomId || client.roomId;
  client.studentId = payload.studentId || client.studentId;
  client.studentName = payload.studentName || client.studentName;
  client.hostname = payload.hostname || client.hostname;
  client.bindAt = Date.now();
  client.lastSeen = Date.now();
  return client;
}

function updateClientHeartbeat(clientId, payload = {}) {
  const client = getClient(clientId);
  if (!client) return;

  client.lastSeen = Date.now();
  if (payload.guardActive !== undefined) {
    client.guardActive = Boolean(payload.guardActive);
  }
  if (payload.processCount !== undefined) {
    client.processCount = Number(payload.processCount) || 0;
  }
  if (Array.isArray(payload.violations)) {
    client.violations = [...payload.violations, ...client.violations].slice(0, 100);
  }
}

function appendClientViolations(clientId, violations = []) {
  const client = getClient(clientId);
  if (!client || !Array.isArray(violations)) return;
  client.violations = [...violations, ...client.violations].slice(0, 100);
  client.lastSeen = Date.now();
}

function listClients(filter = {}) {
  const roomId = filter.roomId || null;
  const result = [];
  clients.forEach(client => {
    if (roomId && client.roomId !== roomId) return;
    result.push(client);
  });
  return result;
}

function countOnlineClients(roomId) {
  return listClients({ roomId }).filter(getOnline).length;
}

function listRoomClientsView(roomId) {
  return listClients({ roomId }).map(client => ({
    clientId: client.clientId,
    studentId: client.studentId,
    studentName: client.studentName,
    ip: client.ip,
    hostname: client.hostname,
    online: getOnline(client),
    guardActive: client.guardActive,
    processCount: client.processCount,
    lastSeen: client.lastSeen,
    violations: client.violations
  }));
}

function sendToRoom(roomId, payload) {
  const message = JSON.stringify(payload);
  let sent = 0;

  listClients({ roomId }).forEach(client => {
    if (!getOnline(client)) return;
    client.ws.send(message);
    sent += 1;
  });

  return sent;
}

function sendToClient(roomId, clientId, payload) {
  const client = getClient(clientId);
  if (!client || client.roomId !== roomId || !getOnline(client)) {
    return false;
  }
  client.ws.send(JSON.stringify(payload));
  return true;
}

function pruneInactiveClients(timeoutMs = 120000) {
  const now = Date.now();
  clients.forEach((client, clientId) => {
    if (now - client.lastSeen <= timeoutMs) return;
    try {
      client.ws.terminate();
    } catch (_) {
      // ignore close error
    }
    clients.delete(clientId);
  });
}

module.exports = {
  verifyAdmin,
  listTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  verifyTeacher,
  updateTeacherPassword,
  listRooms,
  listRoomsByTeacher,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  listRoomStudents,
  addRoomStudent,
  deleteRoomStudent,
  findRoomByJoinCode,
  findStudentInRoom,
  createClient,
  getClient,
  deleteClient,
  touchClient,
  bindClient,
  updateClientHeartbeat,
  appendClientViolations,
  countOnlineClients,
  listRoomClientsView,
  sendToRoom,
  sendToClient,
  pruneInactiveClients
};
