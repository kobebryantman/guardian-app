const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'guardian.db');
const SQL_DIR = __dirname;

let db;

function loadSQL(filename) {
  return fs.readFileSync(path.join(SQL_DIR, filename), 'utf-8');
}

function initDB() {
  if (db) return db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(loadSQL('schema.sql'));
  seedDefaultAdmin();

  return db;
}

function seedDefaultAdmin() {
  const row = db.prepare('SELECT COUNT(*) AS cnt FROM admins').get();
  if (row.cnt > 0) return;

  const password = crypto.createHash('sha256').update('guardian2026').digest('hex');
  const createdAt = new Date().toISOString();
  const sqlSeed = loadSQL('seed.sql');

  db.prepare(sqlSeed).run({ password, created_at: createdAt });
}

const STMT_GET_ADMIN = () =>
  db.prepare('SELECT id, username, password, created_at AS createdAt FROM admins WHERE username = ?');

const STMT_INSERT_ADMIN = () =>
  db.prepare('INSERT INTO admins (id, username, password, created_at) VALUES (?, ?, ?, ?)');

function getAdmin(username) {
  return STMT_GET_ADMIN().get(username) || null;
}

function insertAdmin({ id, username, password, createdAt }) {
  STMT_INSERT_ADMIN().run(id, username, password, createdAt);
}

const STMT_GET_TEACHER_BY_STAFF_ID = () =>
  db.prepare('SELECT id, staff_id AS staffId, name, password, created_at AS createdAt FROM teachers WHERE staff_id = ?');

const STMT_GET_TEACHER = () =>
  db.prepare('SELECT id, staff_id AS staffId, name, password, created_at AS createdAt FROM teachers WHERE id = ?');

const STMT_LIST_TEACHERS = () =>
  db.prepare('SELECT id, staff_id AS staffId, name, created_at AS createdAt FROM teachers ORDER BY created_at ASC');

const STMT_INSERT_TEACHER = () =>
  db.prepare('INSERT INTO teachers (id, staff_id, name, password, created_at) VALUES (?, ?, ?, ?, ?)');

const STMT_DELETE_TEACHER = () =>
  db.prepare('DELETE FROM teachers WHERE id = ?');

function updateTeacher(id, fields = {}) {
  const sets = [];
  const params = [];

  if (fields.staffId !== undefined) {
    sets.push('staff_id = ?');
    params.push(fields.staffId);
  }
  if (fields.name !== undefined) {
    sets.push('name = ?');
    params.push(fields.name);
  }
  if (fields.password !== undefined) {
    sets.push('password = ?');
    params.push(fields.password);
  }

  if (sets.length === 0) return false;

  params.push(id);
  const sql = `UPDATE teachers SET ${sets.join(', ')} WHERE id = ?`;
  const result = db.prepare(sql).run(...params);
  return result.changes > 0;
}

function getTeacherByStaffId(staffId) {
  return STMT_GET_TEACHER_BY_STAFF_ID().get(staffId) || null;
}

function getTeacher(id) {
  return STMT_GET_TEACHER().get(id) || null;
}

function listTeachers() {
  return STMT_LIST_TEACHERS().all();
}

function insertTeacher({ id, staffId, name, password, createdAt }) {
  STMT_INSERT_TEACHER().run(id, staffId, name, password, createdAt);
}

function deleteTeacher(id) {
  const result = STMT_DELETE_TEACHER().run(id);
  return result.changes > 0;
}

module.exports = {
  initDB,
  getAdmin,
  insertAdmin,
  getTeacherByStaffId,
  getTeacher,
  listTeachers,
  insertTeacher,
  updateTeacher,
  deleteTeacher
};

