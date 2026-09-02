-- =============================================================
-- Seed RBAC (UAR_*) — idempotent, aman dijalankan berulang.
-- Jalankan SETELAH migrasi TypeORM diterapkan (npm run migration:run):
--   psql -U <user> -d <db> -f src/database/seed/seed.sql
--
-- Akun bootstrap admin (GANTI PASSWORD SETELAH LOGIN PERTAMA):
--   email    : admin@example.com
--   password : Admin123!
--
-- Developer Mode: aktifkan via
--   UPDATE "UAR_USERS" SET "DEVELOPER_MODE" = true WHERE "EMAIL" = 'admin@example.com';
-- =============================================================

BEGIN;

-- ===== Roles =====
INSERT INTO "UAR_ROLES" ("CODE", "NAME", "DESCRIPTION") VALUES
  ('ADMIN', 'Administrator', 'Akses penuh ke seluruh fitur'),
  ('USER',  'User',          'Role default user terdaftar')
ON CONFLICT ("CODE") DO NOTHING;

-- ===== Permissions =====
INSERT INTO "UAR_PERMISSIONS" ("CODE", "NAME", "DESCRIPTION") VALUES
  ('user:create',   'Create User',   'Mendaftarkan user baru'),
  ('user:read',     'Read Users',    'Melihat daftar/detail user'),
  ('user:update',   'Update User',   'Mengubah data user'),
  ('user:delete',   'Delete User',   'Menghapus user'),
  ('role:read',     'Read Roles',    'Melihat daftar role & permission'),
  ('role:assign',   'Assign Role',   'Memberi/melepas role pada user'),
  ('permission:create', 'Create Permission', 'Menambah permission baru')
ON CONFLICT ("CODE") DO NOTHING;

-- ===== ADMIN mendapat semua permission =====
INSERT INTO "UAR_ROLE_PERMISSION_MAP" ("ROLE_ID", "PERMISSION_ID")
SELECT r."ID", p."ID"
FROM "UAR_ROLES" r
CROSS JOIN "UAR_PERMISSIONS" p
WHERE r."CODE" = 'ADMIN'
ON CONFLICT ("ROLE_ID", "PERMISSION_ID") DO NOTHING;

-- ===== Bootstrap admin account =====
INSERT INTO "UAR_USERS" ("EMAIL", "NAME", "PASSWORD_HASH")
VALUES (
  'admin@example.com',
  'Administrator',
  '$2b$10$X9psXeOgUDbgSoj8UicW/Otn.tPK0V3iK1wLiP2VxJw/GFnn.PXve' -- Admin123!
)
ON CONFLICT ("EMAIL") DO NOTHING;

INSERT INTO "UAR_USER_ROLE_MAP" ("USER_ID", "ROLE_ID")
SELECT u."ID", r."ID"
FROM "UAR_USERS" u
JOIN "UAR_ROLES" r ON r."CODE" = 'ADMIN'
WHERE u."EMAIL" = 'admin@example.com'
ON CONFLICT ("USER_ID", "ROLE_ID") DO NOTHING;

COMMIT;