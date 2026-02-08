-- NEW TABLE FOR SIMPLE CREDENTIAL MANAGEMENT
CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- Storing as text for simple management by Owner
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('OWNER', 'TEAM_REP')),
    team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Allow public access for this internal tool (to allow login before auth)
CREATE POLICY "Public Access App Users" ON app_users FOR ALL USING (true);

-- SEED INITIAL OWNER USER (So you are not locked out)
INSERT INTO app_users (username, password, name, role)
VALUES ('owner', 'password', 'Owner', 'OWNER')
ON CONFLICT (username) DO NOTHING;
