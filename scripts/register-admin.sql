-- Register admin user in `users` table
-- Database: acadify_database (adjust if different)
-- Plain password for this row: admin123 (bcrypt hash below)

USE acadify_database;

INSERT INTO users (
  email,
  password,
  type,
  name,
  phone,
  academy_id,
  is_active,
  last_login_at,
  created_at,
  updated_at
) VALUES (
  'admin@acadify.com',
  '$2b$10$3bMoLx0CqQAvdkfiwmjZLuNrxMRb1T2wIXtBQvm3keTGylGi1S2rm',
  'admin',
  'Platform Admin',
  NULL,
  NULL,
  1,
  NULL,
  NOW(),
  NOW()
);

-- Verify
SELECT id, email, type, name, is_active, created_at FROM users WHERE email = 'admin@acadify.com';
