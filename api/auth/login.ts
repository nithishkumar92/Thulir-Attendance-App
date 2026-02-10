import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool, { query } from '../_db.js';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const result = await query('SELECT * FROM users WHERE username = $1', [username]);

        if (result.rowCount === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        if (user.is_locked) {
            return res.status(403).json({ error: 'Account is locked. Contact Admin.' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Return user info (excluding password)
        const { password_hash, ...safeUser } = user;

        // Map to frontend User type if needed, or just return as is
        // Our frontend expects specific fields, let's map them
        const appUser = {
            id: safeUser.id,
            username: safeUser.username,
            name: safeUser.name,
            role: safeUser.role,
            teamId: safeUser.team_id,
            isLocked: safeUser.is_locked
        };

        return res.status(200).json(appUser);
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
