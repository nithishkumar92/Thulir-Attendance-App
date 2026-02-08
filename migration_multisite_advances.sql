-- Add permitted_site_ids to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS permitted_site_ids JSONB DEFAULT '[]';

-- Add site_id to advances table
ALTER TABLE advances ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Update RLS policies if needed (Public access is currently enabled so this is fine for now)
