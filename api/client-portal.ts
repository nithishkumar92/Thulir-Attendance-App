import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_db.js'; // Assuming _db.ts is in the same directory (api/_db.ts)

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

    const { resource } = req.query;

    if (!resource) {
        return res.status(400).json({ error: 'Resource parameter is required' });
    }

    try {
        switch (resource) {
            case 'clients':
                return await handleClients(req, res);
            case 'contracts':
                return await handleContracts(req, res);
            case 'milestones':
                return await handleMilestones(req, res);
            case 'estimate-items':
                return await handleEstimateItems(req, res);
            case 'client-payments':
                return await handleClientPayments(req, res);
            default:
                return res.status(400).json({ error: 'Invalid resource' });
        }
    } catch (error) {
        console.error(`Error handling resource ${resource}:`, error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// --- CLIENTS ---
async function handleClients(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const result = await query('SELECT * FROM clients ORDER BY name ASC');
        const clients = result.rows.map(c => ({
            id: c.id,
            name: c.name,
            companyName: c.company_name,
            email: c.email,
            phone: c.phone
        }));
        return res.status(200).json(clients);
    }

    if (req.method === 'POST') {
        const { name, companyName, email, phone } = req.body;
        if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

        const result = await query(
            `INSERT INTO clients (name, company_name, email, phone) VALUES ($1, $2, $3, $4) RETURNING *`,
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
    }

    if (req.method === 'PATCH') {
        const { id, name, companyName, email, phone } = req.body;
        if (!id) return res.status(400).json({ error: 'Client ID is required' });

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
        if (companyName !== undefined) { updates.push(`company_name = $${paramIndex++}`); values.push(companyName); }
        if (email !== undefined) { updates.push(`email = $${paramIndex++}`); values.push(email); }
        if (phone !== undefined) { updates.push(`phone = $${paramIndex++}`); values.push(phone); }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        values.push(id);
        const queryText = `UPDATE clients SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await query(queryText, values);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Client not found' });
        const c = result.rows[0];
        return res.status(200).json({
            id: c.id,
            name: c.name,
            companyName: c.company_name,
            email: c.email,
            phone: c.phone
        });
    }
    return res.status(405).json({ error: 'Method not allowed' });
}

// --- CONTRACTS ---
async function handleContracts(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const { clientId } = req.query;
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
    }

    if (req.method === 'POST') {
        const { clientId, siteId, contractNumber, totalAmount, startDate, endDate, status } = req.body;
        if (!clientId || !siteId || !contractNumber || !totalAmount) {
            return res.status(400).json({ error: 'ClientId, siteId, contractNumber, and totalAmount are required' });
        }

        const result = await query(
            `INSERT INTO contracts (client_id, site_id, contract_number, total_amount, start_date, end_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
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
    }

    if (req.method === 'PATCH') {
        const { id, clientId, siteId, contractNumber, totalAmount, startDate, endDate, status } = req.body;
        if (!id) return res.status(400).json({ error: 'Contract ID is required' });

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

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        values.push(id);
        const queryText = `UPDATE contracts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await query(queryText, values);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Contract not found' });
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
    }
    return res.status(405).json({ error: 'Method not allowed' });
}

// --- MILESTONES ---
async function handleMilestones(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const { contractId } = req.query;
        if (!contractId) return res.status(400).json({ error: 'Contract ID is required' });

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
    }

    if (req.method === 'POST') {
        const { contractId, name, description, budgetedAmount, completedAmount, orderIndex, status } = req.body;
        if (!contractId || !name || budgetedAmount === undefined) {
            return res.status(400).json({ error: 'ContractId, name, and budgetedAmount are required' });
        }

        const result = await query(
            `INSERT INTO milestones (contract_id, name, description, budgeted_amount, completed_amount, order_index, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
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
    }

    if (req.method === 'PATCH') {
        const { id, name, description, budgetedAmount, completedAmount, orderIndex, status } = req.body;
        if (!id) return res.status(400).json({ error: 'Milestone ID is required' });

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
        if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
        if (budgetedAmount !== undefined) { updates.push(`budgeted_amount = $${paramIndex++}`); values.push(budgetedAmount); }
        if (completedAmount !== undefined) { updates.push(`completed_amount = $${paramIndex++}`); values.push(completedAmount); }
        if (orderIndex !== undefined) { updates.push(`order_index = $${paramIndex++}`); values.push(orderIndex); }
        if (status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(status); }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        values.push(id);
        const queryText = `UPDATE milestones SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await query(queryText, values);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Milestone not found' });
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
    }
    return res.status(405).json({ error: 'Method not allowed' });
}

// --- ESTIMATE ITEMS ---
async function handleEstimateItems(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const { contractId } = req.query;
        if (!contractId) return res.status(400).json({ error: 'Contract ID is required' });

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
    }

    if (req.method === 'POST') {
        const { contractId, date, description, unit, quantity, rate, amount, remarks, orderIndex } = req.body;
        if (!contractId || !description || amount === undefined) {
            return res.status(400).json({ error: 'ContractId, description, and amount are required' });
        }

        const result = await query(
            `INSERT INTO estimate_items (contract_id, date, description, unit, quantity, rate, amount, remarks, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
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
    }

    if (req.method === 'PATCH') {
        const { id, date, description, unit, quantity, rate, amount, remarks, orderIndex } = req.body;
        if (!id) return res.status(400).json({ error: 'Estimate item ID is required' });

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

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        values.push(id);
        const queryText = `UPDATE estimate_items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await query(queryText, values);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Estimate item not found' });
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
    }

    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'Estimate item ID is required' });

        await query('DELETE FROM estimate_items WHERE id = $1', [id]);
        return res.status(200).json({ message: 'Estimate item deleted' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
}

// --- CLIENT PAYMENTS ---
async function handleClientPayments(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const { contractId, status } = req.query;
        if (!contractId) return res.status(400).json({ error: 'Contract ID is required' });

        let queryText = 'SELECT * FROM client_payments WHERE contract_id = $1';
        const params: any[] = [contractId];

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
    }

    if (req.method === 'POST') {
        const { contractId, milestoneId, amount, paymentDate, status, paymentMethod, transactionReference, notes } = req.body;
        if (!contractId || amount === undefined || !paymentDate) {
            return res.status(400).json({ error: 'ContractId, amount, and paymentDate are required' });
        }

        const result = await query(
            `INSERT INTO client_payments (contract_id, milestone_id, amount, payment_date, status, payment_method, transaction_reference, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
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
    }

    if (req.method === 'PATCH') {
        const { id, amount, paymentDate, status, paymentMethod, transactionReference, notes } = req.body;
        if (!id) return res.status(400).json({ error: 'Payment ID is required' });

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (amount !== undefined) { updates.push(`amount = $${paramIndex++}`); values.push(amount); }
        if (paymentDate !== undefined) { updates.push(`payment_date = $${paramIndex++}`); values.push(paymentDate); }
        if (status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(status); }
        if (paymentMethod !== undefined) { updates.push(`payment_method = $${paramIndex++}`); values.push(paymentMethod); }
        if (transactionReference !== undefined) { updates.push(`transaction_reference = $${paramIndex++}`); values.push(transactionReference); }
        if (notes !== undefined) { updates.push(`notes = $${paramIndex++}`); values.push(notes); }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        values.push(id);
        const queryText = `UPDATE client_payments SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await query(queryText, values);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Payment not found' });
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
    }
    return res.status(405).json({ error: 'Method not allowed' });
}
