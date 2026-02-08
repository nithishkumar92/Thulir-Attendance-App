-- Add is_locked column to app_users table
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Add is_locked column to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
