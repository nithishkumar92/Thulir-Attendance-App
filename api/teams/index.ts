import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
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
                `SELECT * FROM teams WHERE is_active = true ORDER BY name ASC`
            );
            // Map keys to camelCase if needed, but for now we'll stick to DB columns or map in frontend service
            // Ideally backend returns camelCase, but to save time let's map it here
            const teams = result.rows.map(t => ({
                id: t.id,
                name: t.name,
                repId: t.rep_id,
                definedRoles: t.defined_roles,
                permittedSiteIds: t.permitted_site_ids,
                isActive: t.is_active
            }));
            return res.status(200).json(teams);
        } catch (error) {
            console.error('Error fetching teams:', error);
            return res.status(500).json({ error: 'Failed to fetch teams' });
        }
    }

    if (req.method === 'POST') {
        const { name, repId, definedRoles, permittedSiteIds } = req.body;
        try {
            const result = await query(
                `INSERT INTO teams (name, rep_id, defined_roles, permitted_site_ids, is_active)
                 VALUES ($1, $2, $3, $4, true)
                 RETURNING *`,
                [name, repId || null, JSON.stringify(definedRoles || []), JSON.stringify(permittedSiteIds || [])]
            );
            const t = result.rows[0];
            const newTeam = {
                id: t.id,
                name: t.name,
                repId: t.rep_id,
                definedRoles: t.defined_roles,
                permittedSiteIds: t.permitted_site_ids,
                isActive: t.is_active
            };
            return res.status(201).json(newTeam);
        } catch (error) {
            console.error('Error creating team:', error);
            return res.status(500).json({ error: 'Failed to create team' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
