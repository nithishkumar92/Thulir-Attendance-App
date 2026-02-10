import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_db.js';

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

    if (req.method === 'PATCH') {
        const { id, name, repId, definedRoles, permittedSiteIds, isActive } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Team ID is required' });
        }

        try {
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (name !== undefined) {
                updates.push(`name = $${paramIndex++}`);
                values.push(name);
            }
            if (repId !== undefined) {
                updates.push(`rep_id = $${paramIndex++}`);
                values.push(repId);
            }
            if (definedRoles !== undefined) {
                updates.push(`defined_roles = $${paramIndex++}`);
                values.push(JSON.stringify(definedRoles));
            }
            if (permittedSiteIds !== undefined) {
                updates.push(`permitted_site_ids = $${paramIndex++}`);
                values.push(JSON.stringify(permittedSiteIds));
            }
            if (isActive !== undefined) {
                updates.push(`is_active = $${paramIndex++}`);
                values.push(isActive);
            }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            const queryText = `UPDATE teams SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

            const result = await query(queryText, values);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Team not found' });
            }

            const t = result.rows[0];
            const updatedTeam = {
                id: t.id,
                name: t.name,
                repId: t.rep_id,
                definedRoles: t.defined_roles,
                permittedSiteIds: t.permitted_site_ids,
                isActive: t.is_active
            };

            return res.status(200).json(updatedTeam);
        } catch (error) {
            console.error('Error updating team:', error);
            return res.status(500).json({ error: 'Failed to update team' });
        }
    }

    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ error: 'Team ID is required' });
        }

        try {
            await query('UPDATE teams SET is_active = false WHERE id = $1', [id]);
            return res.status(200).json({ message: 'Team deleted (soft delete)' });
        } catch (error) {
            console.error('Error deleting team:', error);
            return res.status(500).json({ error: 'Failed to delete team' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
