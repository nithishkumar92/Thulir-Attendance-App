
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const cockroachUrl = process.env.COCKROACH_DB_URL;

if (!supabaseUrl || !supabaseKey || !cockroachUrl) {
    console.error('Missing credentials in .env');
    process.exit(1);
}

// Initialize Supabase (Use Service Role Key for full access if possible, otherwise checks RLS)
const supabase = createClient(supabaseUrl, supabaseKey);

const pool = new Pool({
    connectionString: cockroachUrl,
    ssl: { rejectUnauthorized: false }
});

async function importData() {
    const client = await pool.connect();
    try {
        console.log('Starting data import...');

        // 1. Teams
        console.log('Fetching Teams...');
        const { data: teams, error: teamsError } = await supabase.from('teams').select('*');
        if (teamsError) throw teamsError;

        for (const team of teams || []) {
            await client.query(`
                INSERT INTO teams (id, name, vehicle_number, defined_roles, is_active)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE SET 
                    name = EXCLUDED.name, 
                    vehicle_number = EXCLUDED.vehicle_number,
                    defined_roles = EXCLUDED.defined_roles
            `, [team.id, team.name, team.vehicle_number, JSON.stringify(team.defined_roles || []), team.is_active]);
        }
        console.log(`Imported ${teams?.length} teams.`);

        // 2. Sites
        console.log('Fetching Sites...');
        const { data: sites, error: sitesError } = await supabase.from('sites').select('*');
        if (sitesError) throw sitesError;

        for (const site of sites || []) {
            await client.query(`
                INSERT INTO sites (id, name, location, radius, is_active)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    location = EXCLUDED.location
            `, [site.id, site.name, site.location, site.radius, site.is_active]);
        }
        console.log(`Imported ${sites?.length} sites.`);

        // 3. Workers
        console.log('Fetching Workers...');
        const { data: workers, error: workersError } = await supabase.from('workers').select('*');
        if (workersError) throw workersError;

        for (const worker of workers || []) {
            await client.query(`
                INSERT INTO workers (id, name, role, team_id, daily_wage, wage_type, phone_number, photo_url, aadhaar_photo_url, is_active, is_locked, approved)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    daily_wage = EXCLUDED.daily_wage
            `, [
                worker.id, worker.name, worker.role, worker.team_id,
                worker.daily_wage, worker.wage_type, worker.phone_number,
                worker.photo_url, worker.aadhaar_photo_url,
                worker.is_active, worker.is_locked, worker.approved
            ]);
        }
        console.log(`Imported ${workers?.length} workers.`);

        // 4. Attendance
        console.log('Fetching Attendance...');
        const { data: attendance, error: attError } = await supabase.from('attendance').select('*');
        if (attError) throw attError;

        for (const record of attendance || []) {
            await client.query(`
                INSERT INTO attendance (id, worker_id, date, status, site_id, check_in_time, check_out_time, location_verified, duty_points)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO NOTHING
            `, [
                record.id, record.worker_id, record.date, record.status,
                record.site_id, record.check_in_time, record.check_out_time,
                record.location_verified, record.duty_points
            ]);
        }
        console.log(`Imported ${attendance?.length} attendance records.`);

        // 5. Advances
        console.log('Fetching Advances...');
        const { data: advances, error: advError } = await supabase.from('advances').select('*');
        if (advError) throw advError;

        for (const adv of advances || []) {
            await client.query(`
                INSERT INTO advances (id, team_id, amount, date, notes, site_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO NOTHING
            `, [adv.id, adv.team_id, adv.amount, adv.date, adv.notes, adv.site_id]);
        }
        console.log(`Imported ${advances?.length} advances.`);

        console.log('Data Import Completed Successfully!');

    } catch (err) {
        console.error('Import failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

importData();
