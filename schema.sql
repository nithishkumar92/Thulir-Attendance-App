-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TEAMS TABLE
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    vehicle_number TEXT,
    rep_id UUID, -- Will link to auth.users later if we want strict FK
    defined_roles JSONB DEFAULT '[]', -- Stores [{name, defaultWage}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USERS TABLE (Application logic users, synced with Auth)
-- Note: Supabase handles auth in a separate schema (auth.users). 
-- This table is for app-specific profile data.
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    name TEXT,
    role TEXT CHECK (role IN ('OWNER', 'TEAM_REP', 'CLIENT', 'WORKER')),
    team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SITES TABLE
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location JSONB NOT NULL, -- {lat: number, lng: number}
    radius INTEGER DEFAULT 300,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. WORKERS TABLE
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    team_id UUID REFERENCES teams(id),
    daily_wage NUMERIC DEFAULT 0,
    wage_type TEXT DEFAULT 'DAILY', -- 'DAILY' or 'PIECE'
    phone_number TEXT,
    photo_url TEXT,
    aadhaar_photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ATTENDANCE TABLE
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id),
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('PRESENT', 'ABSENT', 'HALF_DAY')),
    site_id UUID REFERENCES sites(id),
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    location_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(worker_id, date) -- Prevent duplicate attendance for same worker on same day
);

-- 6. ADVANCES TABLE
CREATE TABLE advances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id), -- Changed from worker_id
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS)
-- For development speed, we will enable public access. 
-- IN PRODUCTION, YOU MUST LOCK THIS DOWN.

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;

-- Allow public access (Anon key) for now to mimic current local app behavior
CREATE POLICY "Public Read Access" ON teams FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON teams FOR UPDATE USING (true);

CREATE POLICY "Public Read Access Profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Profiles" ON profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Access Sites" ON sites FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Sites" ON sites FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Sites" ON sites FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access Sites" ON sites FOR DELETE USING (true);

CREATE POLICY "Public Read Access Workers" ON workers FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Workers" ON workers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Workers" ON workers FOR UPDATE USING (true);

CREATE POLICY "Public Read Access Attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Attendance" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Attendance" ON attendance FOR UPDATE USING (true);

CREATE POLICY "Public Read Access Advances" ON advances FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Advances" ON advances FOR INSERT WITH CHECK (true);

-- Insert a default 'Owner' profile if you create a user manually in Supabase Auth
-- Trigger to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', 'OWNER'); -- Default to OWNER for first user for simplicity
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists before creating to avoid errors in repeated runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. CLIENTS TABLE
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. CONTRACTS TABLE
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    site_id UUID REFERENCES sites(id),
    contract_number TEXT UNIQUE NOT NULL,
    total_amount NUMERIC NOT NULL,
    start_date DATE,
    end_date DATE,
    status TEXT CHECK (status IN ('ACTIVE', 'COMPLETED', 'ON_HOLD')) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. ESTIMATE ITEMS TABLE
CREATE TABLE estimate_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    date DATE,
    description TEXT NOT NULL,
    unit TEXT,
    quantity NUMERIC,
    rate NUMERIC,
    amount NUMERIC NOT NULL,
    remarks TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. MILESTONES TABLE
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    budgeted_amount NUMERIC NOT NULL,
    completed_amount NUMERIC DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. CLIENT PAYMENTS TABLE
CREATE TABLE client_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES milestones(id),
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    status TEXT CHECK (status IN ('PENDING', 'RECEIVED', 'REJECTED')) DEFAULT 'PENDING',
    payment_method TEXT,
    transaction_reference TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for Client Portal Tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;

-- Public access policies (for development)
CREATE POLICY "Public Read Access Clients" ON clients FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Clients" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Clients" ON clients FOR UPDATE USING (true);

CREATE POLICY "Public Read Access Contracts" ON contracts FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Contracts" ON contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Contracts" ON contracts FOR UPDATE USING (true);

CREATE POLICY "Public Read Access Estimate Items" ON estimate_items FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Estimate Items" ON estimate_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Estimate Items" ON estimate_items FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access Estimate Items" ON estimate_items FOR DELETE USING (true);

CREATE POLICY "Public Read Access Milestones" ON milestones FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Milestones" ON milestones FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Milestones" ON milestones FOR UPDATE USING (true);

CREATE POLICY "Public Read Access Client Payments" ON client_payments FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Client Payments" ON client_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Client Payments" ON client_payments FOR UPDATE USING (true);
