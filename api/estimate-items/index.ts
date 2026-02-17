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
        const { contractId } = req.query;

        if (!contractId) {
            return res.status(400).json({ error: 'Contract ID is required' });
        }

        try {
            const result = await query(
                'SELECT * FROM estimate_items WHERE contract_id = $1 ORDER BY order_index ASC, created_at ASC',
                [contractId]
            );
            const items = result.rows.map(i => ({
                id: i.id,
                contractId: i.contract_id,
                date: i.date,
                description: i.description,
                unit: i.unit,
                quantity: i.quantity ? Number(i.quantity) : undefined,
                rate: i.rate ? Number(i.rate) : undefined,
                amount: Number(i.amount),
                remarks: i.remarks,
                orderIndex: i.order_index
            }));
            return res.status(200).json(items);
        } catch (error) {
            console.error('Error fetching estimate items:', error);
            return res.status(500).json({ error: 'Failed to fetch estimate items' });
        }
    }

    if (req.method === 'POST') {
        const { contractId, date, description, unit, quantity, rate, amount, remarks, orderIndex } = req.body;

        if (!contractId || !description || amount === undefined) {
            return res.status(400).json({ error: 'ContractId, description, and amount are required' });
        }

        try {
            const result = await query(
                `INSERT INTO estimate_items (contract_id, date, description, unit, quantity, rate, amount, remarks, order_index)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [contractId, date || null, description, unit || null, quantity || null, rate || null, amount, remarks || null, orderIndex || 0]
            );
            const i = result.rows[0];
            return res.status(201).json({
                id: i.id,
                contractId: i.contract_id,
                date: i.date,
                description: i.description,
                unit: i.unit,
                quantity: i.quantity ? Number(i.quantity) : undefined,
                rate: i.rate ? Number(i.rate) : undefined,
                amount: Number(i.amount),
                remarks: i.remarks,
                orderIndex: i.order_index
            });
        } catch (error) {
            console.error('Error creating estimate item:', error);
            return res.status(500).json({ error: 'Failed to create estimate item' });
        }
    }

    if (req.method === 'PATCH') {
        const { id, date, description, unit, quantity, rate, amount, remarks, orderIndex } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Estimate item ID is required' });
        }

        try {
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (date !== undefined) { updates.push(`date = $${paramIndex++}`); values.push(date); }
            if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
            if (unit !== undefined) { updates.push(`unit = $${paramIndex++}`); values.push(unit); }
            if (quantity !== undefined) { updates.push(`quantity = $${paramIndex++}`); values.push(quantity); }
            if (rate !== undefined) { updates.push(`rate = $${paramIndex++}`); values.push(rate); }
            if (amount !== undefined) { updates.push(`amount = $${paramIndex++}`); values.push(amount); }
            if (remarks !== undefined) { updates.push(`remarks = $${paramIndex++}`); values.push(remarks); }
            if (orderIndex !== undefined) { updates.push(`order_index = $${paramIndex++}`); values.push(orderIndex); }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            const queryText = `UPDATE estimate_items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

            const result = await query(queryText, values);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Estimate item not found' });
            }

            const i = result.rows[0];
            return res.status(200).json({
                id: i.id,
                contractId: i.contract_id,
                date: i.date,
                description: i.description,
                unit: i.unit,
                quantity: i.quantity ? Number(i.quantity) : undefined,
                rate: i.rate ? Number(i.rate) : undefined,
                amount: Number(i.amount),
                remarks: i.remarks,
                orderIndex: i.order_index
            });
        } catch (error) {
            console.error('Error updating estimate item:', error);
            return res.status(500).json({ error: 'Failed to update estimate item' });
        }
    }

    if (req.method === 'DELETE') {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Estimate item ID is required' });
        }

        try {
            await query('DELETE FROM estimate_items WHERE id = $1', [id]);
            return res.status(200).json({ message: 'Estimate item deleted' });
        } catch (error) {
            console.error('Error deleting estimate item:', error);
            return res.status(500).json({ error: 'Failed to delete estimate item' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
