import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.COCKROACH_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    const client = await pool.connect();
    try {
        console.log('Seeding initial owner user...');

        const username = 'owner@thulir.com'; // Default email
        const password = 'password123'; // Default password
        const hashedPassword = await bcrypt.hash(password, 10);

        const res = await client.query(
            `INSERT INTO users (username, password_hash, name, role)
             VALUES ($1, $2, $3, 'OWNER')
             ON CONFLICT (username) DO NOTHING
             RETURNING *`,
            [username, hashedPassword, 'Thulir Owner']
        );

        if (res.rowCount > 0) {
            console.log(`User created: ${username} / ${password}`);
        } else {
            console.log('User already exists.');
        }

    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
