-- CockroachDB Schema Migration Script

-- 1. DROP EXISTING TABLES (IF ANY) TO START FRESH
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS advances;
DROP TABLE IF EXISTS workers;
DROP TABLE IF EXISTS team_members; 
DROP TABLE IF EXISTS users; 
DROP TABLE IF EXISTS sites;
DROP TABLE IF EXISTS teams;

-- 2. TEAMS TABLE
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    vehicle_number TEXT,
    rep_id UUID, -- Will link to users table
    defined_roles JSONB DEFAULT '[]',
    permitted_site_ids JSONB DEFAULT '[]', -- Added to match usage
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp()
);

-- 3. USERS TABLE (Replaces Supabase auth.users + profiles)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL, -- Login ID (e.g., email or phone)
    password_hash TEXT NOT NULL, -- We will store hashed passwords here
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('OWNER', 'TEAM_REP', 'ADMIN')),
    team_id UUID REFERENCES teams(id),
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp()
);

-- 4. SITES TABLE
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location JSONB NOT NULL, -- {lat: number, lng: number}
    radius INTEGER DEFAULT 300,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp()
);

-- 5. WORKERS TABLE
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    team_id UUID REFERENCES teams(id),
    daily_wage NUMERIC DEFAULT 0,
    wage_type TEXT DEFAULT 'DAILY', -- 'DAILY' or 'PIECE'
    phone_number TEXT,
    photo_url TEXT,
    aadhaar_photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp()
);

-- 6. ATTENDANCE TABLE
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id),
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('PRESENT', 'ABSENT', 'HALF_DAY')),
    site_id UUID REFERENCES sites(id),
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_in_location JSONB,
    check_out_location JSONB,
    location_verified BOOLEAN DEFAULT FALSE,
    duty_points NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp(),
    UNIQUE(worker_id, date) -- Prevent duplicate attendance
);

-- 7. ADVANCES TABLE
CREATE TABLE advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id),
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    site_id UUID REFERENCES sites(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp()
);

-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX idx_attendance_worker_date ON attendance(worker_id, date);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_workers_team ON workers(team_id);
