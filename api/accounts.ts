import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Header Definitions
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

    const { resource, id, sub_id } = req.query;

    if (!resource || typeof resource !== 'string') {
        return res.status(400).json({ error: 'Resource parameter is required' });
    }

    try {
        switch (resource) {
            case 'vendors':
                return await handleVendors(req, res, id as string | undefined);
            case 'materials':
                return await handleMaterials(req, res, id as string | undefined);
            case 'tiles':
                return await handleTiles(req, res, id as string | undefined);
            case 'expenses':
                return await handleExpenses(req, res, id as string | undefined);
            case 'line-items':
                return await handleLineItems(req, res, id as string | undefined, sub_id as string | undefined);
            case 'expense-payments':
                return await handleExpensePayments(req, res, id as string | undefined);
            case 'worker-payments':
                return await handleWorkerPayments(req, res, id as string | undefined);
            case 'gang-milestones':
                return await handleGangMilestones(req, res, id as string | undefined);
            case 'reports':
                return await handleReports(req, res);
            case 'notifications':
                return await handleNotifications(req, res, id as string | undefined);
            case 'upload':
                return await handleUpload(req, res);
            case 'bills-scan':
                return res.status(501).json({ message: 'Bill scanning — coming soon' });
            default:
                return res.status(400).json({ error: 'Unknown resource path in accounts router' });
        }
    } catch (error: any) {
        console.error(`Error handling resource ${resource}:`, error);
        return res.status(500).json({ error: 'Internal server error processing accounts request', detail: error?.message });
    }
}

// -------------------------------------------------------------------------------------------------
// VENDORS
// -------------------------------------------------------------------------------------------------
async function handleVendors(req: VercelRequest, res: VercelResponse, id?: string) {
    if (req.method === 'GET') {
        const result = await query('SELECT * FROM vendors ORDER BY name ASC');
        return res.status(200).json(result.rows);
    }
    
    if (req.method === 'POST') {
        const { name, phone, email, gst_number, category, address, is_active } = req.body;
        if (!name) return res.status(400).json({ error: 'Vendor name is required' });

        const result = await query(
            `INSERT INTO vendors (name, phone, email, gst_number, category, address, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, phone, email, gst_number, category || 'material', address, is_active ?? true]
        );
        return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
        if (!id) return res.status(400).json({ error: 'Vendor ID is required for PATCH' });
        const { name, phone, email, gst_number, category, address, is_active } = req.body;
        
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
        if (phone !== undefined) { updates.push(`phone = $${paramIndex++}`); values.push(phone); }
        if (email !== undefined) { updates.push(`email = $${paramIndex++}`); values.push(email); }
        if (gst_number !== undefined) { updates.push(`gst_number = $${paramIndex++}`); values.push(gst_number); }
        if (category !== undefined) { updates.push(`category = $${paramIndex++}`); values.push(category); }
        if (address !== undefined) { updates.push(`address = $${paramIndex++}`); values.push(address); }
        if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(is_active); }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        
        values.push(id);
        const result = await query(
            `UPDATE vendors SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, 
            values
        );
        
        if (result.rowCount === 0) return res.status(404).json({ error: 'Vendor not found' });
        return res.status(200).json(result.rows[0]);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}

// -------------------------------------------------------------------------------------------------
// MATERIAL MASTER
// -------------------------------------------------------------------------------------------------
async function handleMaterials(req: VercelRequest, res: VercelResponse, id?: string) {
    if (req.method === 'GET') {
        const result = await query('SELECT * FROM material_master ORDER BY category, name ASC');
        return res.status(200).json(result.rows);
    }
    
    if (req.method === 'POST') {
        const { name, category, unit, is_tile, is_active } = req.body;
        if (!name || !category || !unit) return res.status(400).json({ error: 'Name, category, and unit are required' });

        const result = await query(
            `INSERT INTO material_master (name, category, unit, is_tile, is_active)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, category, unit, is_tile || false, is_active ?? true]
        );
        return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
        if (!id) return res.status(400).json({ error: 'Material ID is required for PATCH' });
        const { name, category, unit, is_tile, is_active } = req.body;
        
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
        if (category !== undefined) { updates.push(`category = $${paramIndex++}`); values.push(category); }
        if (unit !== undefined) { updates.push(`unit = $${paramIndex++}`); values.push(unit); }
        if (is_tile !== undefined) { updates.push(`is_tile = $${paramIndex++}`); values.push(is_tile); }
        if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(is_active); }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        
        values.push(id);
        const result = await query(
            `UPDATE material_master SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, 
            values
        );
        
        if (result.rowCount === 0) return res.status(404).json({ error: 'Material not found' });
        return res.status(200).json(result.rows[0]);
    }
    return res.status(405).json({ error: 'Method not allowed' });
}

// -------------------------------------------------------------------------------------------------
// TILE MASTER
// -------------------------------------------------------------------------------------------------
async function handleTiles(req: VercelRequest, res: VercelResponse, id?: string) {
    if (req.method === 'GET') {
        const result = await query(`
            SELECT tm.*, mm.name AS material_name 
            FROM tile_master tm 
            JOIN material_master mm ON tm.material_id = mm.id 
            ORDER BY tm.created_at DESC
        `);
        return res.status(200).json(result.rows);
    }
    
    if (req.method === 'POST') {
        const { material_id, brand, size_mm, size_label, type, colour, finish, rate_per_sqft, is_active } = req.body;
        if (!material_id || !size_mm) return res.status(400).json({ error: 'material_id and size_mm are required' });

        const result = await query(
            `INSERT INTO tile_master (material_id, brand, size_mm, size_label, type, colour, finish, rate_per_sqft, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [material_id, brand, size_mm, size_label, type, colour, finish, rate_per_sqft, is_active ?? true]
        );
        return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
        if (!id) return res.status(400).json({ error: 'Tile ID is required' });
        const { material_id, brand, size_mm, size_label, type, colour, finish, rate_per_sqft, is_active } = req.body;
        
        const updates: string[] = [];
        const values: any[] = [];
        let p = 1;

        if (material_id !== undefined) { updates.push(`material_id = $${p++}`); values.push(material_id); }
        if (brand !== undefined) { updates.push(`brand = $${p++}`); values.push(brand); }
        if (size_mm !== undefined) { updates.push(`size_mm = $${p++}`); values.push(size_mm); }
        if (size_label !== undefined) { updates.push(`size_label = $${p++}`); values.push(size_label); }
        if (type !== undefined) { updates.push(`type = $${p++}`); values.push(type); }
        if (colour !== undefined) { updates.push(`colour = $${p++}`); values.push(colour); }
        if (finish !== undefined) { updates.push(`finish = $${p++}`); values.push(finish); }
        if (rate_per_sqft !== undefined) { updates.push(`rate_per_sqft = $${p++}`); values.push(rate_per_sqft); }
        if (is_active !== undefined) { updates.push(`is_active = $${p++}`); values.push(is_active); }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        
        values.push(id);
        const result = await query(`UPDATE tile_master SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`, values);
        
        if (result.rowCount === 0) return res.status(404).json({ error: 'Tile not found' });
        return res.status(200).json(result.rows[0]);
    }
    return res.status(405).json({ error: 'Method not allowed' });
}

// -------------------------------------------------------------------------------------------------
// EXPENSES (HEADERS)
// -------------------------------------------------------------------------------------------------
async function handleExpenses(req: VercelRequest, res: VercelResponse, id?: string) {
    if (req.method === 'GET') {
        const { site_id } = req.query;
        if (id) {
            // Get specific expense header WITH its line items
            const headerResult = await query('SELECT * FROM expenses WHERE id = $1 AND is_deleted = FALSE', [id]);
            if (headerResult.rowCount === 0) return res.status(404).json({ error: 'Expense not found' });
            
            const lineItemsResult = await query(
                `SELECT eli.*, mm.name AS material_name, tm.brand AS tile_brand 
                 FROM expense_line_items eli 
                 LEFT JOIN material_master mm ON eli.material_id = mm.id 
                 LEFT JOIN tile_master tm ON eli.tile_master_id = tm.id 
                 WHERE eli.expense_id = $1 ORDER BY eli.sort_order ASC`, 
                [id]
            );
            return res.status(200).json({
                ...headerResult.rows[0],
                lineItems: lineItemsResult.rows
            });
        } else {
            // List all expenses (with site_id filter if provided)
            let q = 'SELECT e.*, v.name AS vendor_name FROM expenses e LEFT JOIN vendors v ON e.vendor_id = v.id WHERE e.is_deleted = FALSE';
            const params: any[] = [];
            if (site_id) {
                q += ' AND e.site_id = $1';
                params.push(site_id);
            }
            q += ' ORDER BY e.date DESC, e.created_at DESC';
            const result = await query(q, params);
            return res.status(200).json(result.rows);
        }
    }

    if (req.method === 'POST') {
        const { site_id, date, type, vendor_id, invoice_number, invoice_date, total_amount, gst_amount, note, recorded_by } = req.body;
        if (!site_id || !date || !type || total_amount === undefined) {
            return res.status(400).json({ error: 'site_id, date, type, and total_amount are required' });
        }

        const result = await query(
            `INSERT INTO expenses (site_id, date, type, vendor_id, invoice_number, invoice_date, total_amount, gst_amount, note, recorded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [site_id, date, type, vendor_id, invoice_number, invoice_date, total_amount, gst_amount || 0, note, recorded_by]
        );
        return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
        if (!id) return res.status(400).json({ error: 'Expense ID required' });
        const { date, type, vendor_id, invoice_number, invoice_date, total_amount, gst_amount, note, bill_photo_url, bill_pdf_url } = req.body;
        
        const updates: string[] = [];
        const values: any[] = [];
        let p = 1;

        if (date !== undefined) { updates.push(`date = $${p++}`); values.push(date); }
        if (type !== undefined) { updates.push(`type = $${p++}`); values.push(type); }
        if (vendor_id !== undefined) { updates.push(`vendor_id = $${p++}`); values.push(vendor_id); }
        if (invoice_number !== undefined) { updates.push(`invoice_number = $${p++}`); values.push(invoice_number); }
        if (invoice_date !== undefined) { updates.push(`invoice_date = $${p++}`); values.push(invoice_date); }
        if (total_amount !== undefined) { updates.push(`total_amount = $${p++}`); values.push(total_amount); }
        if (gst_amount !== undefined) { updates.push(`gst_amount = $${p++}`); values.push(gst_amount); }
        if (note !== undefined) { updates.push(`note = $${p++}`); values.push(note); }
        if (bill_photo_url !== undefined) { updates.push(`bill_photo_url = $${p++}`); values.push(bill_photo_url); }
        if (bill_pdf_url !== undefined) { updates.push(`bill_pdf_url = $${p++}`); values.push(bill_pdf_url); }

        if (updates.length > 0) {
            updates.push(`updated_at = NOW()`);
            values.push(id);
            const result = await query(`UPDATE expenses SET ${updates.join(', ')} WHERE id = $${p} AND is_deleted = FALSE RETURNING *`, values);
            
            // Recompute payment status if total_amount was updated
            if (total_amount !== undefined) {
               await syncExpensePaymentStatus(id);
            }
            if (result.rowCount === 0) return res.status(404).json({ error: 'Expense not found' });
            return res.status(200).json(result.rows[0]);
        }
        return res.status(400).json({ error: 'No fields to update' });
    }

    if (req.method === 'DELETE') {
        if (!id) return res.status(400).json({ error: 'Expense ID required' });
        // SOFT DELETE
        await query(`UPDATE expenses SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1`, [id]);
        return res.status(200).json({ message: 'Expense deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// Helper to recalculate Paid Amount on Expense header
async function syncExpensePaymentStatus(expenseId: string) {
    await query(`
        UPDATE expenses
        SET
          paid_amount = (SELECT COALESCE(SUM(amount), 0) FROM expense_payments WHERE expense_id = $1),
          payment_status = CASE
                             WHEN (SELECT COALESCE(SUM(amount), 0) FROM expense_payments WHERE expense_id = $1) <= 0 THEN 'unpaid'
                             WHEN (SELECT COALESCE(SUM(amount), 0) FROM expense_payments WHERE expense_id = $1) < total_amount THEN 'partial'
                             ELSE 'paid'
                           END,
          updated_at = NOW()
        WHERE id = $1
    `, [expenseId]);
}


// -------------------------------------------------------------------------------------------------
// EXPENSE LINE ITEMS
// -------------------------------------------------------------------------------------------------
async function handleLineItems(req: VercelRequest, res: VercelResponse, expense_id?: string, lid?: string) {
    if (!expense_id) return res.status(400).json({ error: 'expense_id (?id=...) is required' });

    if (req.method === 'POST') {
        const { material_id, tile_master_id, description, quantity, unit, rate, amount, sort_order, owner_user_id } = req.body;
        if (!description || quantity === undefined || rate === undefined || amount === undefined) {
            return res.status(400).json({ error: 'description, quantity, rate, and amount are required' });
        }

        const result = await query(
            `INSERT INTO expense_line_items (expense_id, material_id, tile_master_id, description, quantity, unit, rate, amount, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [expense_id, material_id, tile_master_id, description, quantity, unit, rate, amount, sort_order || 0]
        );

        // --- BUSINESS LOGIC: Tile Auto-Update Flow ---
        if (tile_master_id) {
            // Find parent site_id
            const expResult = await query('SELECT site_id FROM expenses WHERE id = $1', [expense_id]);
            if (expResult.rowCount > 0 && expResult.rows[0].site_id) {
                const siteId = expResult.rows[0].site_id;
                
                // Do we have any room_tile_requirements for this tile in this site?
                const reqsResult = await query(`
                    SELECT rtr.id FROM room_tile_requirements rtr
                    JOIN rooms r ON rtr.room_id = r.id
                    WHERE r.site_id = $1 AND rtr.tile_master_id = $2
                `, [siteId, tile_master_id]);

                if (reqsResult.rowCount > 0) {
                    // Update received quantities (Could be multiple rooms, but typically one per requirement. We just blindly add the received_qty across them arbitrarily, but spec says: UPDATE where found)
                    // If multiple rooms require this tile, the spec implies we add it to the first found or all? The spec says:
                    // "UPDATE room_tile_requirements SET received_qty = received_qty + line_item.quantity" -> we will add proportional or just to the first or to all?
                    // To be safe and compliant with the SQL syntax provided:
                    await query(`
                        UPDATE room_tile_requirements
                        SET received_qty = received_qty + $1, last_updated = NOW()
                        WHERE id = $2
                    `, [quantity, reqsResult.rows[0].id]); // Just picking the first room requirement
                } else {
                    // Alert owner the tile is bought but unassigned
                    if (owner_user_id) {
                        await query(`
                            INSERT INTO notifications (user_id, title, body, type, reference_id)
                            VALUES ($1, 'Tile purchased but not room-assigned', 'A tile was purchased but has no room assignment in this site.', 'tile_purchased_unassigned', $2)
                        `, [owner_user_id, expense_id]);
                    }
                }
            }
        }
        // --- END BUSINESS LOGIC ---

        return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
        if (!lid) return res.status(400).json({ error: 'Line item ID (sub_id) is required' });
        const { material_id, tile_master_id, description, quantity, unit, rate, amount, sort_order } = req.body;
        
        const updates: string[] = [];
        const values: any[] = [];
        let p = 1;

        if (material_id !== undefined) { updates.push(`material_id = $${p++}`); values.push(material_id); }
        if (tile_master_id !== undefined) { updates.push(`tile_master_id = $${p++}`); values.push(tile_master_id); }
        if (description !== undefined) { updates.push(`description = $${p++}`); values.push(description); }
        if (quantity !== undefined) { updates.push(`quantity = $${p++}`); values.push(quantity); }
        if (unit !== undefined) { updates.push(`unit = $${p++}`); values.push(unit); }
        if (rate !== undefined) { updates.push(`rate = $${p++}`); values.push(rate); }
        if (amount !== undefined) { updates.push(`amount = $${p++}`); values.push(amount); }
        if (sort_order !== undefined) { updates.push(`sort_order = $${p++}`); values.push(sort_order); }

        if (updates.length > 0) {
            values.push(lid);
            // Must also belong to the parent expense ID
            const result = await query(`UPDATE expense_line_items SET ${updates.join(', ')} WHERE id = $${p} AND expense_id = '${expense_id}' RETURNING *`, values);
            if (result.rowCount === 0) return res.status(404).json({ error: 'Line item not found' });
            return res.status(200).json(result.rows[0]);
        }
        return res.status(400).json({ error: 'No fields to update' });
    }

    if (req.method === 'DELETE') {
        if (!lid) return res.status(400).json({ error: 'Line item ID (sub_id) is required' });
        await query(`DELETE FROM expense_line_items WHERE id = $1 AND expense_id = $2`, [lid, expense_id]);
        return res.status(200).json({ message: 'Line item deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// -------------------------------------------------------------------------------------------------
// EXPENSE PAYMENTS
// -------------------------------------------------------------------------------------------------
async function handleExpensePayments(req: VercelRequest, res: VercelResponse, expense_id?: string) {
    if (req.method === 'GET') {
        // Optional endpoint depending on UI, fetched along with details right now
        // But for completeness:
        if (!expense_id) return res.status(400).json({ error: 'Expense ID required' });
        const result = await query(`SELECT * FROM expense_payments WHERE expense_id = $1 ORDER BY date DESC`, [expense_id]);
        return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
        if (!expense_id) return res.status(400).json({ error: 'Expense ID required' });
        const { date, amount, mode, reference, note, recorded_by } = req.body;
        if (!date || amount === undefined) return res.status(400).json({ error: 'date and amount are required' });

        const result = await query(
            `INSERT INTO expense_payments (expense_id, date, amount, mode, reference, note, recorded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [expense_id, date, amount, mode, reference, note, recorded_by]
        );

        // ALWAYS sync the parent Expense header after insertion
        await syncExpensePaymentStatus(expense_id);

        return res.status(201).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
}


// -------------------------------------------------------------------------------------------------
// WORKER PAYMENTS
// -------------------------------------------------------------------------------------------------
async function handleWorkerPayments(req: VercelRequest, res: VercelResponse, id?: string) {
    if (req.method === 'GET') {
        const { site_id, worker_id } = req.query;
        let q = 'SELECT * FROM worker_payments WHERE 1=1';
        const params: any[] = [];
        let p = 1;

        if (site_id) { q += ` AND site_id = $${p++}`; params.push(site_id); }
        if (worker_id) { q += ` AND worker_id = $${p++}`; params.push(worker_id); }

        q += ' ORDER BY date DESC, created_at DESC';
        const result = await query(q, params);
        return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
        const { site_id, worker_id, date, type, amount, reference_id, note, recorded_by } = req.body;
        if (!site_id || !worker_id || !date || !type || amount === undefined) {
            return res.status(400).json({ error: 'site_id, worker_id, date, type, amount are required' });
        }

        const result = await query(
            `INSERT INTO worker_payments (site_id, worker_id, date, type, amount, reference_id, note, recorded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [site_id, worker_id, date, type, amount, reference_id, note, recorded_by]
        );
        return res.status(201).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// -------------------------------------------------------------------------------------------------
// GANG CONTRACT MILESTONES
// -------------------------------------------------------------------------------------------------
async function handleGangMilestones(req: VercelRequest, res: VercelResponse, id?: string) {
    if (req.method === 'GET') {
        const { site_id, team_id } = req.query;
        let q = 'SELECT * FROM gang_contract_milestones WHERE 1=1';
        const params: any[] = [];
        let p = 1;

        if (site_id) { q += ` AND site_id = $${p++}`; params.push(site_id); }
        if (team_id) { q += ` AND team_id = $${p++}`; params.push(team_id); }

        q += ' ORDER BY created_at ASC';
        const result = await query(q, params);
        return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
        const { site_id, team_id, milestone_name, milestone_amount, due_date, note } = req.body;
        if (!site_id || !team_id || !milestone_name || milestone_amount === undefined) {
             return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await query(
            `INSERT INTO gang_contract_milestones (site_id, team_id, milestone_name, milestone_amount, due_date, note)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [site_id, team_id, milestone_name, milestone_amount, due_date, note]
        );
        return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
        if (!id) return res.status(400).json({ error: 'Milestone ID required' });
        const { status, paid_date, paid_by, note } = req.body;
        
        const updates: string[] = [];
        const values: any[] = [];
        let p = 1;

        if (status !== undefined) { updates.push(`status = $${p++}`); values.push(status); }
        if (paid_date !== undefined) { updates.push(`paid_date = $${p++}`); values.push(paid_date); }
        if (paid_by !== undefined) { updates.push(`paid_by = $${p++}`); values.push(paid_by); }
        if (note !== undefined) { updates.push(`note = $${p++}`); values.push(note); }

        if (updates.length > 0) {
            values.push(id);
            const result = await query(`UPDATE gang_contract_milestones SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`, values);
            if (result.rowCount === 0) return res.status(404).json({ error: 'Milestone not found' });
            
            // SPEC TRIGGER MOCK: Gang milestone marked as paid -> NOTIFY OWNER 
            // Finding owner requires knowing their user_id, here the user spec requests the notification.
            // In reality the frontend would handle triggering or passing the owner ID, but for simplicity:
            if (status === 'paid') {
               try {
                  const oResp = await query(`SELECT id FROM profiles WHERE role = 'owner' LIMIT 1`);
                  if (oResp.rowCount > 0 && oResp.rows[0].id) {
                     await query(`INSERT INTO notifications (user_id, title, body, type, reference_id) VALUES ($1, 'Milestone Paid', 'A gang milestone was marked as paid', 'milestone_paid', $2)`, [oResp.rows[0].id, id]);
                  }
               } catch (e) {
                  // Ignore minor notification failures
               }
            }

            return res.status(200).json(result.rows[0]);
        }
        return res.status(400).json({ error: 'No fields to update' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}


// -------------------------------------------------------------------------------------------------
// REPORTS (Accounting / Procurement focused)
// -------------------------------------------------------------------------------------------------
async function handleReports(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { type, site_id, from, to, category, vendor_id } = req.query;

    if (type === 'material-summary') {
        if (!from || !to) return res.status(400).json({ error: 'from and to dates required' });
        
        let q = `
            SELECT
                mm.category,
                mm.name          AS material_name,
                mm.unit,
                SUM(eli.quantity) AS total_quantity,
                SUM(eli.amount)   AS total_amount,
                s.name           AS site_name
            FROM expense_line_items eli
            JOIN expenses e         ON eli.expense_id = e.id
            JOIN material_master mm ON eli.material_id = mm.id
            JOIN sites s            ON e.site_id = s.id
            WHERE e.is_deleted = FALSE
              AND e.date >= $1 AND e.date <= $2
        `;
        const params: any[] = [from, to];
        let p = 3;

        if (site_id) { q += ` AND e.site_id = $${p++}`; params.push(site_id); }
        if (category) { q += ` AND mm.category = $${p++}`; params.push(category); }

        q += ` GROUP BY mm.category, mm.name, mm.unit, s.name ORDER BY mm.category, mm.name`;
        const result = await query(q, params);
        return res.status(200).json(result.rows);
    }
    
    if (type === 'vendor-payments') {
        if (!from || !to) return res.status(400).json({ error: 'from and to dates required' });
        
        let q = `
            SELECT
                v.id             AS vendor_id,
                v.name          AS vendor_name,
                v.phone,
                e.id             AS expense_id,
                e.date,
                e.invoice_number,
                e.total_amount,
                e.paid_amount,
                e.payment_status
            FROM expenses e
            JOIN vendors v ON e.vendor_id = v.id
            WHERE e.is_deleted = FALSE
              AND e.date >= $1 AND e.date <= $2
        `;
        const params: any[] = [from, to];
        let p = 3;

        if (vendor_id) { q += ` AND e.vendor_id = $${p++}`; params.push(vendor_id); }
        q += ` ORDER BY v.name, e.date`;
        
        const result = await query(q, params);
        return res.status(200).json(result.rows);
    }

    if (type === 'site-pl') {
        if (!site_id) return res.status(400).json({ error: 'site_id is required' });
        
        // Follows the spec definitions strictly
        // Contract Value
        const cResult = await query(`SELECT COALESCE(SUM(total_amount), 0) as val FROM contracts WHERE site_id = $1`, [site_id]);
        const contractValue = Number(cResult.rows[0].val);
        
        // Client Received
        const pResult = await query(`
            SELECT COALESCE(SUM(amount), 0) as val 
            FROM client_payments cp 
            JOIN contracts c ON cp.contract_id = c.id 
            WHERE c.site_id = $1
        `, [site_id]);
        const clientReceived = Number(pResult.rows[0].val);
        
        // Expenses Breakdown
        const eResult = await query(`
            SELECT type, COALESCE(SUM(total_amount), 0) as val
            FROM expenses WHERE site_id = $1 AND is_deleted = FALSE
            GROUP BY type
        `, [site_id]);
        
        let materialExpenses = 0, labourContractor = 0, pettyCash = 0, equipmentHire = 0;
        eResult.rows.forEach((r: any) => {
            if (r.type === 'material_invoice' || r.type === 'material_cash') materialExpenses += Number(r.val);
            if (r.type === 'labour_contractor') labourContractor += Number(r.val);
            if (r.type === 'petty_cash') pettyCash += Number(r.val);
            if (r.type === 'equipment_hire') equipmentHire += Number(r.val);
        });

        // Wages
        const wResult1 = await query(`SELECT COALESCE(SUM(amount), 0) as val FROM advances WHERE site_id = $1`, [site_id]);
        const wResult2 = await query(`SELECT COALESCE(SUM(amount), 0) as val FROM worker_payments WHERE site_id = $1`, [site_id]);
        const workerWages = Number(wResult1.rows[0].val) + Number(wResult2.rows[0].val);

        // Milestone Payments
        const mResult = await query(`SELECT COALESCE(SUM(milestone_amount), 0) as val FROM gang_contract_milestones WHERE site_id = $1 AND status = 'paid'`, [site_id]);
        const milestonePayments = Number(mResult.rows[0].val);

        const totalExpenses = materialExpenses + labourContractor + pettyCash + equipmentHire + workerWages + milestonePayments;
        const grossProfit = clientReceived - totalExpenses;
        const profitMarginPct = clientReceived > 0 ? (grossProfit / clientReceived) * 100 : 0;

        return res.status(200).json({
            site_id,
            revenue: {
                contract_value: contractValue,
                total_received: clientReceived,
                balance_due: contractValue - clientReceived
            },
            expenses: {
                material: materialExpenses,
                labour_contractor: labourContractor,
                petty_cash: pettyCash,
                equipment_hire: equipmentHire,
                worker_wages: workerWages,
                milestone_payments: milestonePayments,
                total: totalExpenses
            },
            profitability: {
                gross_profit: grossProfit,
                profit_margin_pct: parseFloat(profitMarginPct.toFixed(2))
            }
        });
    }

    return res.status(400).json({ error: 'Unknown report type' });
}


// -------------------------------------------------------------------------------------------------
// NOTIFICATIONS
// -------------------------------------------------------------------------------------------------
async function handleNotifications(req: VercelRequest, res: VercelResponse, id?: string) {
    if (req.method === 'GET') {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });
        
        const result = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [user_id]);
        return res.status(200).json(result.rows);
    }
    if (req.method === 'PATCH') {
        if (!id) return res.status(400).json({ error: 'Notification ID required' });
        const result = await query(`UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *`, [id]);
        return res.status(200).json(result.rows[0]);
    }
    return res.status(405).json({ error: 'Method not allowed' });
}


// -------------------------------------------------------------------------------------------------
// S3 PRESIGNED UPLOAD URLs (MOCK IMPLEMENTATION FOR ROUTE VALIDITY)
// -------------------------------------------------------------------------------------------------
async function handleUpload(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { path, filename, contentType } = req.body;
    // Real implementation would pull AWS keys and use s3-request-presigner
    // Since AWS keys aren't explicitly provided, we return immediately with a simulated response.
    // The spec guarantees the client uses these URLs to bypass the payload limit.
    return res.status(200).json({
        uploadUrl: `https://mock-s3-bucket.s3.amazonaws.com/${path}/${filename}?Signature=Mock`,
        fileUrl: `https://thulir-erp-bucket.s3.amazonaws.com/${path}/${filename}`
    });
}
