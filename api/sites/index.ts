import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_db.js';

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

    if (req.method === 'GET') {
        try {
            const result = await query(
                `SELECT * FROM sites WHERE is_active = true ORDER BY name ASC`
            );
            const sites = result.rows.map(s => ({
                id: s.id,
                name: s.name,
                location: s.location,
                radius: s.radius,
                isActive: s.is_active
            }));
            return res.status(200).json(sites);
        } catch (error) {
            console.error('Error fetching sites:', error);
            return res.status(500).json({ error: 'Failed to fetch sites' });
        }
    }

    if (req.method === 'POST') {
        const { name, location, radius } = req.body;
        try {
            const result = await query(
                `INSERT INTO sites (name, location, radius, is_active)
                 VALUES ($1, $2, $3, true)
                 RETURNING *`,
                [name, JSON.stringify(location), radius || 300]
            );
            const s = result.rows[0];
            const newSite = {
                id: s.id,
                name: s.name,
                location: s.location,
                radius: s.radius,
                isActive: s.is_active
            };
            return res.status(201).json(newSite);
        } catch (error) {
            console.error('Error creating site:', error);
            return res.status(500).json({ error: 'Failed to create site' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
