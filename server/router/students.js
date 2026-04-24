/**
 * CRUD /api/students
 */
const { Router } = require('express');
const { requireAuth } = require('../utils/auth');
const { getStudents, addStudent, updateStudent, deleteStudent } = require('../service/state');

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => res.json({ ok: true, students: getStudents() }));

router.post('/', (req, res) => {
  const { studentName, seatNumber, className } = req.body || {};
  if (!studentName) return res.status(400).json({ ok: false, msg: '缺少学生姓名' });
  res.json({ ok: true, student: addStudent({ studentName, seatNumber, className }) });
});

router.put('/:id', (req, res) => {
  const student = updateStudent(req.params.id, req.body);
  if (!student) return res.status(404).json({ ok: false, msg: '学生不存在' });
  res.json({ ok: true, student });
});

router.delete('/:id', (req, res) => {
  deleteStudent(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
