import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Construct the path to the .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log(`Loading .env from: ${envPath}`);

dotenv.config({ path: envPath });

if (!process.env.COCKROACH_DB_URL) {
    console.error('Error: COCKROACH_DB_URL is not defined in .env');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.COCKROACH_DB_URL,
    ssl: { rejectUnauthorized: false }, // CockroachDB Serverless requires SSL
});

async function checkData() {
    try {
        console.log('Connecting to database...');
        const tables = ['users', 'workers', 'teams', 'sites', 'attendance', 'advances'];

        for (const table of tables) {
            try {
                const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`Table '${table}': ${res.rows[0].count} records`);

                if (parseInt(res.rows[0].count) > 0) {
                    const sample = await pool.query(`SELECT * FROM ${table} LIMIT 1`);
                    console.log(`  Sample data (${table}):`, JSON.stringify(sample.rows[0]));
                }

            } catch (err: any) {
                console.log(`Table '${table}': ERROR - ${err.message}`);
            }
        }
    } catch (error) {
        console.error('Database connection error:', error);
    } finally {
        await pool.end();
    }
}

checkData();
