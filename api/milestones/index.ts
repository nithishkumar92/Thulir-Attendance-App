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
        const { contractId } = req.query;

        if (!contractId) {
            return res.status(400).json({ error: 'Contract ID is required' });
        }

        try {
            const result = await query(
                'SELECT * FROM milestones WHERE contract_id = $1 ORDER BY order_index ASC, created_at ASC',
                [contractId]
            );
            const milestones = result.rows.map(m => ({
                id: m.id,
                contractId: m.contract_id,
                name: m.name,
                description: m.description,
                budgetedAmount: Number(m.budgeted_amount),
                completedAmount: Number(m.completed_amount),
                orderIndex: m.order_index,
                status: m.status
            }));
            return res.status(200).json(milestones);
        } catch (error) {
            console.error('Error fetching milestones:', error);
            return res.status(500).json({ error: 'Failed to fetch milestones' });
        }
    }

    if (req.method === 'POST') {
        const { contractId, name, description, budgetedAmount, completedAmount, orderIndex, status } = req.body;

        if (!contractId || !name || budgetedAmount === undefined) {
            return res.status(400).json({ error: 'ContractId, name, and budgetedAmount are required' });
        }

        try {
            const result = await query(
                `INSERT INTO milestones (contract_id, name, description, budgeted_amount, completed_amount, order_index, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [contractId, name, description || null, budgetedAmount, completedAmount || 0, orderIndex || 0, status || 'PENDING']
            );
            const m = result.rows[0];
            return res.status(201).json({
                id: m.id,
                contractId: m.contract_id,
                name: m.name,
                description: m.description,
                budgetedAmount: Number(m.budgeted_amount),
                completedAmount: Number(m.completed_amount),
                orderIndex: m.order_index,
                status: m.status
            });
        } catch (error) {
            console.error('Error creating milestone:', error);
            return res.status(500).json({ error: 'Failed to create milestone' });
        }
    }

    if (req.method === 'PATCH') {
        const { id, name, description, budgetedAmount, completedAmount, orderIndex, status } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Milestone ID is required' });
        }

        try {
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
            if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
            if (budgetedAmount !== undefined) { updates.push(`budgeted_amount = $${paramIndex++}`); values.push(budgetedAmount); }
            if (completedAmount !== undefined) { updates.push(`completed_amount = $${paramIndex++}`); values.push(completedAmount); }
            if (orderIndex !== undefined) { updates.push(`order_index = $${paramIndex++}`); values.push(orderIndex); }
            if (status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(status); }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            const queryText = `UPDATE milestones SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

            const result = await query(queryText, values);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Milestone not found' });
            }

            const m = result.rows[0];
            return res.status(200).json({
                id: m.id,
                contractId: m.contract_id,
                name: m.name,
                description: m.description,
                budgetedAmount: Number(m.budgeted_amount),
                completedAmount: Number(m.completed_amount),
                orderIndex: m.order_index,
                status: m.status
            });
        } catch (error) {
            console.error('Error updating milestone:', error);
            return res.status(500).json({ error: 'Failed to update milestone' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
