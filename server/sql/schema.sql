-- Guardian 持久层 Schema
-- 初始化和迁移由 store/db.js 在启动时自动执行

CREATE TABLE IF NOT EXISTS admins (
    id         TEXT PRIMARY KEY,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teachers (
    id         TEXT PRIMARY KEY,
    staff_id   TEXT UNIQUE NOT NULL,
    name       TEXT NOT NULL,
    password   TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teachers_staff_id ON teachers(staff_id);
