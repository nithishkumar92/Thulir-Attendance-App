import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({
    connectionString: process.env.COCKROACH_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function createUser() {
    const client = await pool.connect();
    try {
        const username = 'owner';
        const password = 'password';
        const name = 'Owner';
        const role = 'OWNER';

        console.log(`Creating user: ${username}...`);

        const hashedPassword = await bcrypt.hash(password, 10);

        const res = await client.query(
            `INSERT INTO users (username, password_hash, name, role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (username) DO UPDATE SET 
                password_hash = EXCLUDED.password_hash 
             RETURNING id, username`,
            [username, hashedPassword, name, role]
        );

        console.log(`User created/updated successfully:`, res.rows[0]);

    } catch (err) {
        console.error('Failed to create user:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

createUser();
