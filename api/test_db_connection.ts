import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const dbUrl = process.env.COCKROACH_DB_URL;

    // Status check object
    const status: any = {
        envVarExists: !!dbUrl,
        envVarLength: dbUrl ? dbUrl.length : 0,
        connectionTest: 'pending'
    };

    if (!dbUrl) {
        return res.status(500).json({
            error: 'COCKROACH_DB_URL is missing from environment variables',
            details: status
        });
    }

    // Try to connect specially for this test, bypassing the shared pool to ensure fresh attempt
    const pool = new Pool({
        connectionString: dbUrl.replace('?sslmode=verify-full', '').replace('&sslmode=verify-full', ''),
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000 // 5s timeout
    });

    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();

        status.connectionTest = 'success';
        status.dbTime = result.rows[0].now;

        await pool.end();

        return res.status(200).json(status);
    } catch (error: any) {
        status.connectionTest = 'failed';
        status.errorMessage = error.message;
        status.errorCode = error.code;

        await pool.end();

        return res.status(500).json(status);
    }
}
