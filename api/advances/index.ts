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
        const { startDate, endDate } = req.query;

        try {
            // Cache for 10 seconds to handle bursts
            res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=60');

            let queryText = `SELECT * FROM advances`;
            const values: any[] = [];

            if (startDate && typeof startDate === 'string' && endDate && typeof endDate === 'string') {
                queryText += ` WHERE date >= $1 AND date <= $2`;
                values.push(startDate, endDate);
            }

            queryText += ` ORDER BY date DESC`;

            const result = await query(queryText, values);
            const advances = result.rows.map(a => ({
                id: a.id,
                teamId: a.team_id,
                amount: a.amount,
                date: a.date,
                notes: a.notes,
                siteId: a.site_id
            }));
            return res.status(200).json(advances);
        } catch (error) {
            console.error('Error fetching advances:', error);
            return res.status(500).json({ error: 'Failed to fetch advances' });
        }
    }

    if (req.method === 'POST') {
        const { teamId, amount, date, notes, siteId } = req.body;
        try {
            const result = await query(
                `INSERT INTO advances (team_id, amount, date, notes, site_id)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [teamId, amount, date, notes, siteId]
            );
            const a = result.rows[0];
            const newAdvance = {
                id: a.id,
                teamId: a.team_id,
                amount: a.amount,
                date: a.date,
                notes: a.notes,
                siteId: a.site_id
            };
            return res.status(201).json(newAdvance);
        } catch (error) {
            console.error('Error creating advance:', error);
            return res.status(500).json({ error: 'Failed to create advance' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
