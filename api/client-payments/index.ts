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
        const { contractId, status } = req.query;

        if (!contractId) {
            return res.status(400).json({ error: 'Contract ID is required' });
        }

        try {
            let queryText = 'SELECT * FROM client_payments WHERE contract_id = $1';
            const params: any[] = [contractId];

            // Client view: only show RECEIVED payments
            if (status === 'RECEIVED') {
                queryText += ' AND status = $2';
                params.push('RECEIVED');
            }

            queryText += ' ORDER BY payment_date DESC, created_at DESC';

            const result = await query(queryText, params);
            const payments = result.rows.map(p => ({
                id: p.id,
                contractId: p.contract_id,
                milestoneId: p.milestone_id,
                amount: Number(p.amount),
                paymentDate: p.payment_date,
                status: p.status,
                paymentMethod: p.payment_method,
                transactionReference: p.transaction_reference,
                notes: p.notes
            }));
            return res.status(200).json(payments);
        } catch (error) {
            console.error('Error fetching client payments:', error);
            return res.status(500).json({ error: 'Failed to fetch client payments' });
        }
    }

    if (req.method === 'POST') {
        const { contractId, milestoneId, amount, paymentDate, status, paymentMethod, transactionReference, notes } = req.body;

        if (!contractId || amount === undefined || !paymentDate) {
            return res.status(400).json({ error: 'ContractId, amount, and paymentDate are required' });
        }

        try {
            const result = await query(
                `INSERT INTO client_payments (contract_id, milestone_id, amount, payment_date, status, payment_method, transaction_reference, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [contractId, milestoneId || null, amount, paymentDate, status || 'PENDING', paymentMethod || null, transactionReference || null, notes || null]
            );
            const p = result.rows[0];
            return res.status(201).json({
                id: p.id,
                contractId: p.contract_id,
                milestoneId: p.milestone_id,
                amount: Number(p.amount),
                paymentDate: p.payment_date,
                status: p.status,
                paymentMethod: p.payment_method,
                transactionReference: p.transaction_reference,
                notes: p.notes
            });
        } catch (error) {
            console.error('Error creating client payment:', error);
            return res.status(500).json({ error: 'Failed to create client payment' });
        }
    }

    if (req.method === 'PATCH') {
        const { id, amount, paymentDate, status, paymentMethod, transactionReference, notes } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Payment ID is required' });
        }

        try {
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (amount !== undefined) { updates.push(`amount = $${paramIndex++}`); values.push(amount); }
            if (paymentDate !== undefined) { updates.push(`payment_date = $${paramIndex++}`); values.push(paymentDate); }
            if (status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(status); }
            if (paymentMethod !== undefined) { updates.push(`payment_method = $${paramIndex++}`); values.push(paymentMethod); }
            if (transactionReference !== undefined) { updates.push(`transaction_reference = $${paramIndex++}`); values.push(transactionReference); }
            if (notes !== undefined) { updates.push(`notes = $${paramIndex++}`); values.push(notes); }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            const queryText = `UPDATE client_payments SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

            const result = await query(queryText, values);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            const p = result.rows[0];
            return res.status(200).json({
                id: p.id,
                contractId: p.contract_id,
                milestoneId: p.milestone_id,
                amount: Number(p.amount),
                paymentDate: p.payment_date,
                status: p.status,
                paymentMethod: p.payment_method,
                transactionReference: p.transaction_reference,
                notes: p.notes
            });
        } catch (error) {
            console.error('Error updating client payment:', error);
            return res.status(500).json({ error: 'Failed to update client payment' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
