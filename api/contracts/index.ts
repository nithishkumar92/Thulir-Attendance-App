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
        const { clientId } = req.query;

        try {
            let queryText = 'SELECT * FROM contracts';
            const params: any[] = [];

            if (clientId) {
                queryText += ' WHERE client_id = $1';
                params.push(clientId);
            }

            queryText += ' ORDER BY created_at DESC';

            const result = await query(queryText, params);
            const contracts = result.rows.map(c => ({
                id: c.id,
                clientId: c.client_id,
                siteId: c.site_id,
                contractNumber: c.contract_number,
                totalAmount: Number(c.total_amount),
                startDate: c.start_date,
                endDate: c.end_date,
                status: c.status
            }));
            return res.status(200).json(contracts);
        } catch (error) {
            console.error('Error fetching contracts:', error);
            return res.status(500).json({ error: 'Failed to fetch contracts' });
        }
    }

    if (req.method === 'POST') {
        const { clientId, siteId, contractNumber, totalAmount, startDate, endDate, status } = req.body;

        if (!clientId || !siteId || !contractNumber || !totalAmount) {
            return res.status(400).json({ error: 'ClientId, siteId, contractNumber, and totalAmount are required' });
        }

        try {
            const result = await query(
                `INSERT INTO contracts (client_id, site_id, contract_number, total_amount, start_date, end_date, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [clientId, siteId, contractNumber, totalAmount, startDate || null, endDate || null, status || 'ACTIVE']
            );
            const c = result.rows[0];
            return res.status(201).json({
                id: c.id,
                clientId: c.client_id,
                siteId: c.site_id,
                contractNumber: c.contract_number,
                totalAmount: Number(c.total_amount),
                startDate: c.start_date,
                endDate: c.end_date,
                status: c.status
            });
        } catch (error: any) {
            console.error('Error creating contract:', error);
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Contract number already exists' });
            }
            return res.status(500).json({ error: 'Failed to create contract' });
        }
    }

    if (req.method === 'PATCH') {
        const { id, clientId, siteId, contractNumber, totalAmount, startDate, endDate, status } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Contract ID is required' });
        }

        try {
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (clientId !== undefined) { updates.push(`client_id = $${paramIndex++}`); values.push(clientId); }
            if (siteId !== undefined) { updates.push(`site_id = $${paramIndex++}`); values.push(siteId); }
            if (contractNumber !== undefined) { updates.push(`contract_number = $${paramIndex++}`); values.push(contractNumber); }
            if (totalAmount !== undefined) { updates.push(`total_amount = $${paramIndex++}`); values.push(totalAmount); }
            if (startDate !== undefined) { updates.push(`start_date = $${paramIndex++}`); values.push(startDate); }
            if (endDate !== undefined) { updates.push(`end_date = $${paramIndex++}`); values.push(endDate); }
            if (status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(status); }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            const queryText = `UPDATE contracts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

            const result = await query(queryText, values);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Contract not found' });
            }

            const c = result.rows[0];
            return res.status(200).json({
                id: c.id,
                clientId: c.client_id,
                siteId: c.site_id,
                contractNumber: c.contract_number,
                totalAmount: Number(c.total_amount),
                startDate: c.start_date,
                endDate: c.end_date,
                status: c.status
            });
        } catch (error) {
            console.error('Error updating contract:', error);
            return res.status(500).json({ error: 'Failed to update contract' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
