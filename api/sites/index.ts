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

    if (req.method === 'PATCH') {
        const { id, name, location, radius, isActive } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Site ID is required' });
        }

        try {
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (name !== undefined) {
                updates.push(`name = $${paramIndex++}`);
                values.push(name);
            }
            if (location !== undefined) {
                updates.push(`location = $${paramIndex++}`);
                values.push(JSON.stringify(location));
            }
            if (radius !== undefined) {
                updates.push(`radius = $${paramIndex++}`);
                values.push(radius);
            }
            if (isActive !== undefined) {
                updates.push(`is_active = $${paramIndex++}`);
                values.push(isActive);
            }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            const queryText = `UPDATE sites SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

            const result = await query(queryText, values);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Site not found' });
            }

            const s = result.rows[0];
            const updatedSite = {
                id: s.id,
                name: s.name,
                location: s.location,
                radius: s.radius,
                isActive: s.is_active
            };

            return res.status(200).json(updatedSite);
        } catch (error) {
            console.error('Error updating site:', error);
            return res.status(500).json({ error: 'Failed to update site' });
        }
    }

    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ error: 'Site ID is required' });
        }

        try {
            await query('UPDATE sites SET is_active = false WHERE id = $1', [id]);
            return res.status(200).json({ message: 'Site deleted (soft delete)' });
        } catch (error) {
            console.error('Error deleting site:', error);
            return res.status(500).json({ error: 'Failed to delete site' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
