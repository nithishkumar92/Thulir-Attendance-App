import { Pool } from 'pg';

const connectionString = process.env.COCKROACH_DB_URL;

if (!connectionString) {
    // Only throw in production or when actually trying to connect
    // This allows build time to pass even if env var is missing
    console.warn('COCKROACH_DB_URL is not defined');
}

// Simplified connection for Vercel Serverless
// We simply create the pool at module level. Vercel will freeze/reuse the container,
// so this acts as a pseudo-singleton for the lifetime of the container.
const cleanConnectionString = connectionString ? connectionString.replace('?sslmode=verify-full', '').replace('&sslmode=verify-full', '') : undefined;

if (!cleanConnectionString) {
    console.error('CRITICAL: COCKROACH_DB_URL is missing in _db.ts');
}

const pool = new Pool({
    connectionString: cleanConnectionString,
    ssl: {
        rejectUnauthorized: false
    },
    max: 1, // Keep max connections low for serverless to prevent exhaustion
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;

// Helper to handle query errors
export const query = async (text: string, params?: any[]) => {
    try {
        const start = Date.now();
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        // console.log('executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Error executing query', { text, error });
        throw error;
    }
};
