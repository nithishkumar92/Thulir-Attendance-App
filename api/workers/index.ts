import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_db';

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

    return res.status(405).json({ error: 'Method not allowed' });
}
