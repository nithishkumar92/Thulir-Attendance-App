import { Pool } from 'pg';

const connectionString = process.env.COCKROACH_DB_URL;

if (!connectionString) {
    // Only throw in production or when actually trying to connect
    // This allows build time to pass even if env var is missing
    console.warn('COCKROACH_DB_URL is not defined');
}

// Use a singleton pattern to prevent exhausting the connection pool
// in a serverless environment (though Vercel isolates executions, 
// container reuse means globals persist).
let pool: Pool;

if (!global.pgPool) {
    global.pgPool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false // Allow connection without explicit local cert path for now
        },
        max: 3, // Limit connections per serverless function instance to avoid saturating the DB
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
}

pool = global.pgPool;

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
