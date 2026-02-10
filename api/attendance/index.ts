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
            const result = await query(`SELECT * FROM attendance ORDER BY date DESC, check_in_time DESC LIMIT 500`);
            const attendance = result.rows.map(a => ({
                id: a.id,
                workerId: a.worker_id,
                date: a.date, // might need formatting depending on DB return type
                status: a.status,
                siteId: a.site_id,
                punchInTime: a.check_in_time,
                punchOutTime: a.check_out_time,
                punchInLocation: a.check_in_location,
                punchOutLocation: a.check_out_location,
                dutyPoints: a.duty_points,
                verified: a.location_verified
            }));
            return res.status(200).json(attendance);
        } catch (error) {
            console.error('Error fetching attendance:', error);
            return res.status(500).json({ error: 'Failed to fetch attendance' });
        }
    }

    if (req.method === 'POST') {
        const { workerId, date, status, siteId, punchInTime, punchOutTime, punchInLocation, punchOutLocation, dutyPoints, verified } = req.body;

        try {
            // Upsert logic using ON CONFLICT
            const result = await query(
                `INSERT INTO attendance (
                    worker_id, date, status, site_id, check_in_time, check_out_time,
                    check_in_location, check_out_location, duty_points, location_verified
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (worker_id, date) DO UPDATE SET
                    status = EXCLUDED.status,
                    check_in_time = EXCLUDED.check_in_time,
                    check_out_time = EXCLUDED.check_out_time,
                    duty_points = EXCLUDED.duty_points,
                    location_verified = EXCLUDED.location_verified
                RETURNING *`,
                [
                    workerId, date, status, siteId, punchInTime, punchOutTime,
                    JSON.stringify(punchInLocation || {}), JSON.stringify(punchOutLocation || {}),
                    dutyPoints || 0, verified || false
                ]
            );

            const a = result.rows[0];
            const savedRecord = {
                id: a.id,
                workerId: a.worker_id,
                date: a.date,
                status: a.status,
                siteId: a.site_id,
                punchInTime: a.check_in_time,
                punchOutTime: a.check_out_time,
                punchInLocation: a.check_in_location,
                punchOutLocation: a.check_out_location,
                dutyPoints: a.duty_points,
                verified: a.location_verified
            };
            return res.status(200).json(savedRecord);
        } catch (error) {
            console.error('Error recording attendance:', error);
            return res.status(500).json({ error: 'Failed to record attendance' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
