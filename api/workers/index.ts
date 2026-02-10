import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        try {
            // Fetch all active workers
            const result = await query(
                `SELECT * FROM workers WHERE is_active = true ORDER BY name ASC`
            );
            return res.status(200).json(result.rows);
        } catch (error) {
            console.error('Error fetching workers:', error);
            return res.status(500).json({ error: 'Failed to fetch workers' });
        }
    }

    if (req.method === 'POST') {
        const { name, role, teamId, dailyWage, wageType, phoneNumber, photoUrl, aadhaarPhotoUrl, approved, isLocked } = req.body;

        try {
            const result = await query(
                `INSERT INTO workers (
                    name, role, team_id, daily_wage, wage_type, phone_number, 
                    photo_url, aadhaar_photo_url, approved, is_active, is_locked
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
                RETURNING *`,
                [
                    name, role, teamId || null, dailyWage || 0, wageType || 'DAILY', phoneNumber,
                    photoUrl, aadhaarPhotoUrl, approved || false, isLocked || false
                ]
            );
            return res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating worker:', error);
            return res.status(500).json({ error: 'Failed to create worker' });
        }
    }

    if (req.method === 'PATCH') {
        const {
            id, name, role, teamId, dailyWage, wageType,
            phoneNumber, photoUrl, aadhaarPhotoUrl, approved,
            isLocked, isActive
        } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Worker ID is required' });
        }

        try {
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
            if (role !== undefined) { updates.push(`role = $${paramIndex++}`); values.push(role); }
            if (teamId !== undefined) { updates.push(`team_id = $${paramIndex++}`); values.push(teamId); }
            if (dailyWage !== undefined) { updates.push(`daily_wage = $${paramIndex++}`); values.push(dailyWage); }
            if (wageType !== undefined) { updates.push(`wage_type = $${paramIndex++}`); values.push(wageType); }
            if (phoneNumber !== undefined) { updates.push(`phone_number = $${paramIndex++}`); values.push(phoneNumber); }
            if (photoUrl !== undefined) { updates.push(`photo_url = $${paramIndex++}`); values.push(photoUrl); }
            if (aadhaarPhotoUrl !== undefined) { updates.push(`aadhaar_photo_url = $${paramIndex++}`); values.push(aadhaarPhotoUrl); }
            if (approved !== undefined) { updates.push(`approved = $${paramIndex++}`); values.push(approved); }
            if (isLocked !== undefined) { updates.push(`is_locked = $${paramIndex++}`); values.push(isLocked); }
            if (isActive !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(isActive); }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            const queryText = `UPDATE workers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

            const result = await query(queryText, values);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Worker not found' });
            }

            return res.status(200).json(result.rows[0]);
        } catch (error) {
            console.error('Error updating worker:', error);
            return res.status(500).json({ error: 'Failed to update worker' });
        }
    }

    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ error: 'Worker ID is required' });
        }

        try {
            await query('UPDATE workers SET is_active = false WHERE id = $1', [id]);
            return res.status(200).json({ message: 'Worker deleted (soft delete)' });
        } catch (error) {
            console.error('Error deleting worker:', error);
            return res.status(500).json({ error: 'Failed to delete worker' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
