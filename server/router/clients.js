/**
 * 子机状态 & 远程管控
 */
const { Router } = require('express');
const { requireAuth } = require('../utils/auth');
const { getStudents, getClient, forEachClient } = require('../service/state');

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const students = getStudents();
  const clientList = [];
  forEachClient((info, clientId) => {
    const s = students.find(st => st.id === info.studentId);
    clientList.push({
      clientId, studentId: info.studentId,
      studentName: s ? s.studentName : '未知',
      seatNumber: s ? s.seatNumber : '',
      className: s ? s.className : '',
      ip: info.ip, hostname: info.hostname,
      guardActive: info.guardActive, online: info.ws.readyState === 1,
      lastSeen: info.lastSeen, violations: info.violations, processCount: info.processCount || 0
    });
  });
  res.json({ ok: true, clients: clientList });
});

router.post('/:clientId/kill', (req, res) => {
  const c = getClient(req.params.clientId);
  if (!c) return res.status(404).json({ ok: false, msg: '子机不在线' });
  c.ws.send(JSON.stringify({ type: 'force-kill-process', pid: req.body.pid }));
  res.json({ ok: true });
});

router.post('/:clientId/toggle-guard', (req, res) => {
  const c = getClient(req.params.clientId);
  if (!c) return res.status(404).json({ ok: false, msg: '子机不在线' });
  c.ws.send(JSON.stringify({ type: 'toggle-guard', enabled: req.body.enabled === undefined ? !c.guardActive : req.body.enabled }));
  res.json({ ok: true });
});

router.post('/:clientId/update-whitelist', (req, res) => {
  const c = getClient(req.params.clientId);
  if (!c) return res.status(404).json({ ok: false, msg: '子机不在线' });
  c.ws.send(JSON.stringify({ type: 'update-whitelist', whitelist: req.body.whitelist }));
  res.json({ ok: true });
});

module.exports = router;
