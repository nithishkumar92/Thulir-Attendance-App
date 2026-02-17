import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH');
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
            const result = await query('SELECT * FROM clients ORDER BY name ASC');
            const clients = result.rows.map(c => ({
                id: c.id,
                name: c.name,
                companyName: c.company_name,
                email: c.email,
                phone: c.phone
            }));
            return res.status(200).json(clients);
        } catch (error) {
            console.error('Error fetching clients:', error);
            return res.status(500).json({ error: 'Failed to fetch clients' });
        }
    }

    if (req.method === 'POST') {
        const { name, companyName, email, phone } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        try {
            const result = await query(
                `INSERT INTO clients (name, company_name, email, phone)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [name, companyName || null, email, phone || null]
            );
            const c = result.rows[0];
            return res.status(201).json({
                id: c.id,
                name: c.name,
                companyName: c.company_name,
                email: c.email,
                phone: c.phone
            });
        } catch (error: any) {
            console.error('Error creating client:', error);
            if (error.code === '23505') { // Unique violation
                return res.status(409).json({ error: 'Client with this email already exists' });
            }
            return res.status(500).json({ error: 'Failed to create client' });
        }
    }

    if (req.method === 'PATCH') {
        const { id, name, companyName, email, phone } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Client ID is required' });
        }

        try {
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
            if (companyName !== undefined) { updates.push(`company_name = $${paramIndex++}`); values.push(companyName); }
            if (email !== undefined) { updates.push(`email = $${paramIndex++}`); values.push(email); }
            if (phone !== undefined) { updates.push(`phone = $${paramIndex++}`); values.push(phone); }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            const queryText = `UPDATE clients SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

            const result = await query(queryText, values);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Client not found' });
            }

            const c = result.rows[0];
            return res.status(200).json({
                id: c.id,
                name: c.name,
                companyName: c.company_name,
                email: c.email,
                phone: c.phone
            });
        } catch (error) {
            console.error('Error updating client:', error);
            return res.status(500).json({ error: 'Failed to update client' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
