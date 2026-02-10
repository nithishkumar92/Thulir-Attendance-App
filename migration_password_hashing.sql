-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Migrate existing plain-text passwords to bcrypt hashes
-- We check if the password already looks like a bcrypt hash (starts with $2a$, $2b$, or $2y$)
-- If not, we hash it.
UPDATE app_users 
SET password = crypt(password, gen_salt('bf')) 
WHERE password !~ '^\$2[aby]\$';

-- 2. Create a trigger to automatically hash passwords on INSERT or UPDATE
-- This ensures that even if the frontend sends a plain text password, it gets hashed before storage.
CREATE OR REPLACE FUNCTION hash_app_user_password() 
RETURNS TRIGGER AS $$
BEGIN
    -- If password is being inserted or updated
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.password IS DISTINCT FROM OLD.password) THEN
        -- Only hash if it's not already a hash
        IF NEW.password IS NOT NULL AND NEW.password !~ '^\$2[aby]\$' THEN
            NEW.password := crypt(NEW.password, gen_salt('bf'));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind the trigger to the app_users table
DROP TRIGGER IF EXISTS trigger_hash_app_user_password ON app_users;
CREATE TRIGGER trigger_hash_app_user_password
BEFORE INSERT OR UPDATE ON app_users
FOR EACH ROW
EXECUTE FUNCTION hash_app_user_password();

-- 4. Update the verification RPC to compare using crypt()
-- This function is used by the Login page.
DROP FUNCTION IF EXISTS verify_user_credentials(text, text);

CREATE OR REPLACE FUNCTION verify_user_credentials(username_input TEXT, password_input TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  name TEXT,
  role TEXT,
  team_id UUID,
  is_locked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id, 
    au.username, 
    au.name, 
    au.role, 
    au.team_id, 
    au.is_locked
  FROM app_users au
  WHERE au.username = username_input 
    -- crypt(input, stored_hash) returns the hash. If it matches stored_hash, password is correct.
    AND (au.password = crypt(password_input, au.password));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
