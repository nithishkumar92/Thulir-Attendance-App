import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_db.js';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,DELETE');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // GET: List users
    if (req.method === 'GET') {
        try {
            const result = await query(
                `SELECT id, username, name, role, team_id, is_locked, created_at FROM users ORDER BY name ASC`
            );
            // Map to User type
            const users = result.rows.map(u => ({
                id: u.id,
                username: u.username,
                password: '', // security
                name: u.name,
                role: u.role,
                teamId: u.team_id,
                isLocked: u.is_locked
            }));
            return res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    // POST: Create user
    if (req.method === 'POST') {
        const { username, password, name, role, teamId } = req.body;

        if (!username || !password || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await query(
                `INSERT INTO users (username, password_hash, name, role, team_id, is_locked)
                 VALUES ($1, $2, $3, $4, $5, false)
                 RETURNING id, username, name, role, team_id, is_locked`,
                [username, hashedPassword, name, role || 'TEAM_REP', teamId || null]
            );

            const u = result.rows[0];
            return res.status(201).json({
                id: u.id,
                username: u.username,
                password: '',
                name: u.name,
                role: u.role,
                teamId: u.team_id,
                isLocked: u.is_locked
            });
        } catch (error: any) {
            console.error('Error creating user:', error);
            if (error.code === '23505') { // Unique violation
                return res.status(409).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: 'Failed to create user' });
        }
    }

    // PATCH: Update user (password or status)
    if (req.method === 'PATCH') {
        const { id, password, isLocked, name, teamId, role } = req.body;
        if (!id) return res.status(400).json({ error: 'User ID required' });

        try {
            // Build dynamic query
            const fields: string[] = [];
            const values: any[] = [];
            let idx = 1;

            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                fields.push(`password_hash = $${idx++}`);
                values.push(hashedPassword);
            }
            if (isLocked !== undefined) {
                fields.push(`is_locked = $${idx++}`);
                values.push(isLocked);
            }
            if (name) {
                fields.push(`name = $${idx++}`);
                values.push(name);
            }
            if (role) {
                fields.push(`role = $${idx++}`);
                values.push(role);
            }
            if (teamId !== undefined) {
                fields.push(`team_id = $${idx++}`);
                values.push(teamId);
            }

            if (fields.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            const result = await query(
                `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id`,
                values
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error updating user:', error);
            return res.status(500).json({ error: 'Failed to update user' });
        }
    }

    // DELETE: Delete user
    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'User ID required' });

        try {
            await query(`DELETE FROM users WHERE id = $1`, [id]);
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error deleting user:', error);
            return res.status(500).json({ error: 'Failed to delete user' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
