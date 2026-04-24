/**
 * 共享状态：教师端 students + 在线子机 clients
 */
const crypto = require('crypto');
const path = require('path');
const { loadJSON, saveJSON } = require('../utils/storage');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

let students = loadJSON(STUDENTS_FILE, []);
let sessions = loadJSON(SESSIONS_FILE, {});

const clients = new Map();

// ---- Students ----
function getStudents() { return students; }

function addStudent({ studentName, seatNumber, className }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const joinCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  const student = { id, studentName, seatNumber: seatNumber || '', className: className || '', joinCode, createdAt: new Date().toISOString() };
  students.push(student);
  saveJSON(STUDENTS_FILE, students);
  return student;
}

function updateStudent(id, data) {
  const idx = students.findIndex(s => s.id === id);
  if (idx < 0) return null;
  students[idx] = { ...students[idx], ...data, id };
  saveJSON(STUDENTS_FILE, students);
  return students[idx];
}

function deleteStudent(id) {
  students = students.filter(s => s.id !== id);
  saveJSON(STUDENTS_FILE, students);
}

function findStudentByJoinCode(code) {
  return students.find(s => s.joinCode === code);
}

// ---- Clients ----
function getClient(clientId) { return clients.get(clientId); }
function forEachClient(fn) { clients.forEach(fn); }

module.exports = {
  getStudents, addStudent, updateStudent, deleteStudent, findStudentByJoinCode,
  getClient, forEachClient,
  clients
};
