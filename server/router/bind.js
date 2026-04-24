/**
 * POST /api/student/bind — 子机用接入码绑定
 */
const { Router } = require('express');
const os = require('os');
const { findStudentByJoinCode, getClient } = require('../service/state');

const router = Router();

router.post('/bind', (req, res) => {
  const { joinCode, clientId, hostname } = req.body || {};
  const student = findStudentByJoinCode(joinCode);
  if (!student) return res.status(404).json({ ok: false, msg: '无效的接入码' });
  if (clientId) {
    const info = getClient(clientId);
    if (info) { info.studentId = student.id; info.hostname = hostname || os.hostname(); info.ip = req.ip || ''; }
  }
  res.json({ ok: true, studentId: student.id, studentName: student.studentName });
});

module.exports = router;
