-- 默认管理员 admin / guardian2026
-- 仅在 admins 表为空时执行

INSERT OR IGNORE INTO admins (id, username, password, created_at)
VALUES ('a_default', 'admin', $password, $created_at);
