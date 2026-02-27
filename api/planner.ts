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
            case 'rooms':
                return await handleRooms(req, res, id as string | undefined);
            case 'zones':
                return await handleZones(req, res, id as string | undefined, sub_id as string | undefined);
            case 'markers':
                return await handleMarkers(req, res, id as string | undefined, sub_id as string | undefined);
            case 'requirements':
                return await handleRequirements(req, res, id as string | undefined);
            case 'photos':
                return await handlePhotos(req, res, id as string | undefined, sub_id as string | undefined);
            case 'assignments':
                return await handleAssignments(req, res, id as string | undefined);
            case 'mason-progress':
                return await handleMasonProgress(req, res, id as string | undefined);
            case 'shortage':
                return await handleShortage(req, res, id as string | undefined);
            case 'mason-rooms':
                return await handleMasonRooms(req, res, id as string | undefined);
            case 'mason-payments':
                return await handleMasonPayments(req, res);
            case 'tile-report':
                return await handleTileReport(req, res);
            default:
                return res.status(400).json({ error: 'Unknown resource path in planner router' });
        }
    } catch (error: any) {
        console.error(`Error handling planner resource ${resource}:`, error);
        return res.status(500).json({ error: 'Internal server error processing planner request', detail: error?.message });
    }
}

// -------------------------------------------------------------------------------------------------
// ROOMS
// -------------------------------------------------------------------------------------------------
async function handleRooms(req: VercelRequest, res: VercelResponse, id?: string) {
    if (req.method === 'GET') {
        if (id) {
            const result = await query('SELECT * FROM rooms WHERE id = $1', [id]);
            if (result.rowCount === 0) return res.status(404).json({ error: 'Room not found' });
            return res.status(200).json(result.rows[0]);
        }
        
        const { site_id } = req.query;
        if (!site_id) return res.status(400).json({ error: 'site_id is required for listing rooms' });
        
        const result = await query('SELECT * FROM rooms WHERE site_id = $1 ORDER BY created_at ASC', [site_id]);
        return res.status(200).json(result.rows);
    }
    
    if (req.method === 'POST') {
        const { site_id, name, type, surface_type, length_ft, width_ft, entrance_edge, north_edge, start_corner, cut_edges, notes, status } = req.body;
        if (!site_id || !name || !surface_type) return res.status(400).json({ error: 'site_id, name, surface_type required' });

        const result = await query(
            `INSERT INTO rooms (site_id, name, type, surface_type, length_ft, width_ft, entrance_edge, north_edge, start_corner, cut_edges, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [site_id, name, type, surface_type, length_ft, width_ft, entrance_edge, north_edge, start_corner, cut_edges ? JSON.stringify(cut_edges) : '{"top":false,"right":false,"bottom":false,"left":false}', notes, status || 'planned']
        );
        return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
        if (!id) return res.status(400).json({ error: 'Room ID required' });
        const { name, type, surface_type, length_ft, width_ft, entrance_edge, north_edge, start_corner, cut_edges, notes, status } = req.body;
        
        const updates: string[] = [];
        const values: any[] = [];
        let p = 1;

        if (name !== undefined) { updates.push(`name = $${p++}`); values.push(name); }
        if (type !== undefined) { updates.push(`type = $${p++}`); values.push(type); }
        if (surface_type !== undefined) { updates.push(`surface_type = $${p++}`); values.push(surface_type); }
        if (length_ft !== undefined) { updates.push(`length_ft = $${p++}`); values.push(length_ft); }
        if (width_ft !== undefined) { updates.push(`width_ft = $${p++}`); values.push(width_ft); }
        if (entrance_edge !== undefined) { updates.push(`entrance_edge = $${p++}`); values.push(entrance_edge); }
        if (north_edge !== undefined) { updates.push(`north_edge = $${p++}`); values.push(north_edge); }
        if (start_corner !== undefined) { updates.push(`start_corner = $${p++}`); values.push(start_corner); }
        if (cut_edges !== undefined) { updates.push(`cut_edges = $${p++}`); values.push(JSON.stringify(cut_edges)); }
        if (notes !== undefined) { updates.push(`notes = $${p++}`); values.push(notes); }
        if (status !== undefined) { updates.push(`status = $${p++}`); values.push(status); }

        if (updates.length > 0) {
            updates.push(`updated_at = NOW()`);
            values.push(id);
            const result = await query(`UPDATE rooms SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`, values);
            if (result.rowCount === 0) return res.status(404).json({ error: 'Room not found' });
            return res.status(200).json(result.rows[0]);
        }
        return res.status(400).json({ error: 'No fields to update' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}


// -------------------------------------------------------------------------------------------------
// ROOM TILE ZONES
// -------------------------------------------------------------------------------------------------
async function handleZones(req: VercelRequest, res: VercelResponse, id?: string, sub_id?: string) {
    if (!id) return res.status(400).json({ error: 'Room ID (?id=...) is required' }); // id is room_id here

    if (req.method === 'GET') {
        const result = await query(`
            SELECT z.*, tm.brand, tm.size_label, mm.name as material_name
            FROM room_tile_zones z
            LEFT JOIN tile_master tm ON z.tile_master_id = tm.id
            LEFT JOIN material_master mm ON tm.material_id = mm.id
            WHERE z.room_id = $1 ORDER BY z.sort_order ASC
        `, [id]);
        return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
        const { zone_name, tile_master_id, area_sqft, wastage_pct, required_qty, sort_order } = req.body;
        if (!zone_name) return res.status(400).json({ error: 'zone_name required' });

        const result = await query(
            `INSERT INTO room_tile_zones (room_id, zone_name, tile_master_id, area_sqft, wastage_pct, required_qty, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [id, zone_name, tile_master_id, area_sqft, wastage_pct || 10, required_qty, sort_order || 0]
        );

        // Sync aggregate requirements table
        if (tile_master_id) await syncTileRequirements(id, tile_master_id);

        return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
        if (!sub_id) return res.status(400).json({ error: 'Zone ID (sub_id) required' });
        const { zone_name, tile_master_id, area_sqft, wastage_pct, required_qty, sort_order } = req.body;
        
        const updates: string[] = [];
        const values: any[] = [];
        let p = 1;

        if (zone_name !== undefined) { updates.push(`zone_name = $${p++}`); values.push(zone_name); }
        if (tile_master_id !== undefined) { updates.push(`tile_master_id = $${p++}`); values.push(tile_master_id); }
        if (area_sqft !== undefined) { updates.push(`area_sqft = $${p++}`); values.push(area_sqft); }
        if (wastage_pct !== undefined) { updates.push(`wastage_pct = $${p++}`); values.push(wastage_pct); }
        if (required_qty !== undefined) { updates.push(`required_qty = $${p++}`); values.push(required_qty); }
        if (sort_order !== undefined) { updates.push(`sort_order = $${p++}`); values.push(sort_order); }

        if (updates.length > 0) {
            values.push(sub_id);
            const result = await query(`UPDATE room_tile_zones SET ${updates.join(', ')} WHERE id = $${p} AND room_id = '${id}' RETURNING *`, values);
            if (result.rowCount === 0) return res.status(404).json({ error: 'Zone not found' });
            
            // Re-sync requirements if tile matching changed
            if (tile_master_id !== undefined) await syncTileRequirements(id, tile_master_id);
            
            return res.status(200).json(result.rows[0]);
        }
        return res.status(400).json({ error: 'No fields to update' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// Helper: When zones update, re-aggregate the `required_qty` on room_tile_requirements
async function syncTileRequirements(roomId: string, tileMasterId: string) {
    const aggResult = await query(
        `SELECT SUM(required_qty) as total FROM room_tile_zones WHERE room_id = $1 AND tile_master_id = $2`,
        [roomId, tileMasterId]
    );
    const totalQty = parseInt(aggResult.rows[0].total || 0, 10);

    await query(`
        INSERT INTO room_tile_requirements (room_id, tile_master_id, required_qty, received_qty)
        VALUES ($1, $2, $3, 0)
        ON CONFLICT (room_id, tile_master_id) 
        DO UPDATE SET required_qty = EXCLUDED.required_qty, last_updated = NOW()
    `, [roomId, tileMasterId, totalQty]);
}


// -------------------------------------------------------------------------------------------------
// ROOM GRID MARKERS
// -------------------------------------------------------------------------------------------------
async function handleMarkers(req: VercelRequest, res: VercelResponse, id?: string, sub_id?: string) {
    if (!id) return res.status(400).json({ error: 'Room ID (?id=...) is required' });

    if (req.method === 'GET') {
        const result = await query(`SELECT * FROM room_grid_markers WHERE room_id = $1`, [id]);
        return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
        const { x, y, marker_type } = req.body;
        if (x === undefined || y === undefined || !marker_type) return res.status(400).json({ error: 'x, y, marker_type required' });

        const result = await query(
            `INSERT INTO room_grid_markers (room_id, x, y, marker_type) VALUES ($1, $2, $3, $4)
             ON CONFLICT (room_id, x, y) DO UPDATE SET marker_type = EXCLUDED.marker_type RETURNING *`,
            [id, x, y, marker_type]
        );
        return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
        if (!sub_id) return res.status(400).json({ error: 'Marker ID (sub_id) required' });
        await query(`DELETE FROM room_grid_markers WHERE id = $1 AND room_id = $2`, [sub_id, id]);
        return res.status(200).json({ message: 'Deleted' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
}


// -------------------------------------------------------------------------------------------------
// ROOM REQUIREMENTS
// -------------------------------------------------------------------------------------------------
async function handleRequirements(req: VercelRequest, res: VercelResponse, id?: string) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!id) return res.status(400).json({ error: 'Room ID (?id=...) is required' });

    // Compute shortage_qty dynamically during read (do not store) per constraints
    const result = await query(`
        SELECT rtr.*, 
               tm.brand, tm.size_label, mm.name as material_name,
               GREATEST(rtr.required_qty - rtr.received_qty, 0) as shortage_qty
        FROM room_tile_requirements rtr
        JOIN tile_master tm ON rtr.tile_master_id = tm.id
        JOIN material_master mm ON tm.material_id = mm.id
        WHERE rtr.room_id = $1
    `, [id]);
    
    return res.status(200).json(result.rows);
}


// -------------------------------------------------------------------------------------------------
// ROOM PHOTOS
// -------------------------------------------------------------------------------------------------
async function handlePhotos(req: VercelRequest, res: VercelResponse, id?: string, sub_id?: string) {
    if (!id) return res.status(400).json({ error: 'Room ID (?id=...) is required' });

    if (req.method === 'GET') {
        const result = await query(`SELECT * FROM room_photos WHERE room_id = $1 ORDER BY sort_order ASC, created_at DESC`, [id]);
        return res.status(200).json(result.rows);
    }
    
    if (req.method === 'POST') {
        const { photo_url, caption, sort_order, uploaded_by } = req.body;
        if (!photo_url) return res.status(400).json({ error: 'photo_url required' });

        const result = await query(
            `INSERT INTO room_photos (room_id, photo_url, caption, sort_order, uploaded_by)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id, photo_url, caption, sort_order || 0, uploaded_by]
        );
        return res.status(201).json(result.rows[0]);
    }
    
    if (req.method === 'DELETE') {
         if (!sub_id) return res.status(400).json({ error: 'Photo ID (sub_id) required' });
         await query(`DELETE FROM room_photos WHERE id = $1 AND room_id = $2`, [sub_id, id]);
         return res.status(200).json({ message: 'Deleted' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
}


// -------------------------------------------------------------------------------------------------
// TILE MASON ASSIGNMENTS
// -------------------------------------------------------------------------------------------------
async function handleAssignments(req: VercelRequest, res: VercelResponse, id?: string) {
    if (req.method === 'GET') {
        const { site_id, worker_id } = req.query;
        let q = `
            SELECT a.*, r.name as room_name, w.name as worker_name,
                   (a.contracted_sqft * a.rate_per_sqft) as total_value,
                   (a.completed_sqft * a.rate_per_sqft) as earned_amount
            FROM tile_mason_assignments a
            JOIN rooms r ON a.room_id = r.id
            JOIN workers w ON a.worker_id = w.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let p = 1;
        
        if (site_id) { q += ` AND a.site_id = $${p++}`; params.push(site_id); }
        if (worker_id) { q += ` AND a.worker_id = $${p++}`; params.push(worker_id); }
        
        q += ' ORDER BY a.created_at DESC';
        const result = await query(q, params);
        return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
        const { site_id, worker_id, room_id, surface_type, rate_per_sqft, contracted_sqft, status } = req.body;
        if (!site_id || !worker_id || !room_id || !surface_type || rate_per_sqft === undefined || contracted_sqft === undefined) {
             return res.status(400).json({ error: 'Missing required assignment fields' });
        }
        const result = await query(
            `INSERT INTO tile_mason_assignments (site_id, worker_id, room_id, surface_type, rate_per_sqft, contracted_sqft, completed_sqft, status)
             VALUES ($1, $2, $3, $4, $5, $6, 0, $7) RETURNING *`,
            [site_id, worker_id, room_id, surface_type, rate_per_sqft, contracted_sqft, status || 'assigned']
        );
        return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
         if (!id) return res.status(400).json({ error: 'Assignment ID required' });
         const { status, rate_per_sqft, contracted_sqft } = req.body;
         
         const updates: string[] = [];
         const values: any[] = [];
         let p = 1;
         
         if (status !== undefined) { updates.push(`status = $${p++}`); values.push(status); }
         if (rate_per_sqft !== undefined) { updates.push(`rate_per_sqft = $${p++}`); values.push(rate_per_sqft); }
         if (contracted_sqft !== undefined) { updates.push(`contracted_sqft = $${p++}`); values.push(contracted_sqft); }
         
         if (updates.length > 0) {
             updates.push(`updated_at = NOW()`);
             values.push(id);
             const result = await query(`UPDATE tile_mason_assignments SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`, values);
             if (result.rowCount === 0) return res.status(404).json({ error: 'Assignment not found' });
             return res.status(200).json(result.rows[0]);
         }
         return res.status(400).json({ error: 'No fields' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
}


// -------------------------------------------------------------------------------------------------
// MASON PROGRESS
// -------------------------------------------------------------------------------------------------
async function handleMasonProgress(req: VercelRequest, res: VercelResponse, id?: string) {
    // Note: id is assignment_id here for GET / POST
    if (!id) return res.status(400).json({ error: 'Assignment ID (?id=...) required' });

    if (req.method === 'GET') {
        const result = await query(`SELECT * FROM tile_mason_progress WHERE assignment_id = $1 ORDER BY date DESC, created_at DESC`, [id]);
        return res.status(200).json(result.rows);
    }
    
    if (req.method === 'POST') {
        const { date, verified_sqft, note, verified_by } = req.body;
        if (!date || verified_sqft === undefined) return res.status(400).json({ error: 'date and verified_sqft required' });

        const result = await query(
            `INSERT INTO tile_mason_progress (assignment_id, date, verified_sqft, note, verified_by)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id, date, verified_sqft, note, verified_by]
        );

        // ALWAYS recalculate completed_sqft on the parent assignment
        await query(`
            UPDATE tile_mason_assignments
            SET completed_sqft = (SELECT COALESCE(SUM(verified_sqft), 0) FROM tile_mason_progress WHERE assignment_id = $1),
                updated_at = NOW()
            WHERE id = $1
        `, [id]);

        return res.status(201).json(result.rows[0]);
    }
    return res.status(405).json({ error: 'Method not allowed' });
}


// -------------------------------------------------------------------------------------------------
// SHORTAGE REQUESTS
// -------------------------------------------------------------------------------------------------
async function handleShortage(req: VercelRequest, res: VercelResponse, id?: string) {
    if (req.method === 'POST') {
        const { site_id, room_id, tile_master_id, requested_qty, urgency, note, requested_by } = req.body;
        if (!site_id || !room_id || !tile_master_id || requested_qty === undefined) return res.status(400).json({ error: 'Missing required fields' });

        const result = await query(
            `INSERT INTO material_shortage_requests (site_id, room_id, tile_master_id, requested_qty, urgency, note, requested_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [site_id, room_id, tile_master_id, requested_qty, urgency || 'normal', note, requested_by]
        );

        // Create alert for owner
        try {
           const oResp = await query(`SELECT id FROM profiles WHERE role = 'owner' LIMIT 1`);
           if (oResp && oResp.rowCount && oResp.rowCount > 0 && oResp.rows[0].id) {
              await query(`INSERT INTO notifications (user_id, title, body, type, reference_id) VALUES ($1, 'Tile Shortage Request', 'A tile mason raised a material shortage request', 'shortage_request', $2)`, [oResp.rows[0].id, result.rows[0].id]);
           }
        } catch(e) {}

        return res.status(201).json(result.rows[0]);
    }
    
    if (req.method === 'PATCH') {
        if (!id) return res.status(400).json({ error: 'Shortage ID required' });
        const { status, approved_by } = req.body;
        if (!status) return res.status(400).json({ error: 'Status is required' });

        const result = await query(`UPDATE material_shortage_requests SET status = $1, approved_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *`, [status, approved_by, id]);
        
        if (result.rowCount === 0) return res.status(404).json({ error: 'Shortage request not found' });
        const s = result.rows[0];

        // LOGIC RULE: If status changed to received, fulfill the room requirement
        if (status === 'received') {
             await query(`
                 UPDATE room_tile_requirements 
                 SET received_qty = received_qty + $1, last_updated = NOW() 
                 WHERE room_id = $2 AND tile_master_id = $3
             `, [s.requested_qty, s.room_id, s.tile_master_id]);
        }
        
        return res.status(200).json(s);
    }

    // LIST for owners/masons
    if (req.method === 'GET') {
        const { site_id } = req.query;
        let q = `
            SELECT msr.*, r.name as room_name, tm.brand, tm.size_label 
            FROM material_shortage_requests msr 
            JOIN rooms r ON msr.room_id = r.id 
            JOIN tile_master tm ON msr.tile_master_id = tm.id
            WHERE 1=1
        `;
        const params: any[] = [];
        if (site_id) { q += ` AND msr.site_id = $1`; params.push(site_id); }
        q += ' ORDER BY msr.created_at DESC';
        const result = await query(q, params);
        return res.status(200).json(result.rows);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}


// -------------------------------------------------------------------------------------------------
// MASON PORTAL SPECIFIC READS
// -------------------------------------------------------------------------------------------------
async function handleMasonRooms(req: VercelRequest, res: VercelResponse, id?: string) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { worker_id } = req.query;
    if (!worker_id) return res.status(400).json({ error: 'worker_id required' });

    if (id) {
        // Detailed view of one room based on spec
        // Assuming id is room_id
        const roomResult = await query(`SELECT * FROM rooms WHERE id = $1`, [id]);
        if (roomResult.rowCount === 0) return res.status(404).json({ error: 'Room not found' });

        const zonesResult = await query(`SELECT * FROM room_tile_zones WHERE room_id = $1`, [id]);
        
        // Requirements using dynamic shortage calculation
        const reqResult = await query(`
            SELECT rtr.*, GREATEST(rtr.required_qty - rtr.received_qty, 0) as shortage_qty,
                   tm.brand, tm.size_label, mm.name as material_name
            FROM room_tile_requirements rtr
            JOIN tile_master tm ON rtr.tile_master_id = tm.id
            JOIN material_master mm ON tm.material_id = mm.id
            WHERE rtr.room_id = $1
        `, [id]);
        
        return res.status(200).json({
             room: roomResult.rows[0],
             zones: zonesResult.rows,
             requirements: reqResult.rows
        });
    }

    // List view
    const result = await query(`
         SELECT r.id, r.name, a.surface_type, a.contracted_sqft, a.completed_sqft, 
                (a.completed_sqft * a.rate_per_sqft) as earned_amount
         FROM tile_mason_assignments a
         JOIN rooms r ON a.room_id = r.id
         WHERE a.worker_id = $1
         ORDER BY a.created_at DESC
    `, [worker_id]);
    return res.status(200).json(result.rows);
}

async function handleMasonPayments(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { worker_id } = req.query;
    if (!worker_id) return res.status(400).json({ error: 'worker_id required' });

    const result = await query(`
         SELECT date, type, amount, note 
         FROM worker_payments 
         WHERE worker_id = $1
         ORDER BY date DESC, created_at DESC
    `, [worker_id]);
    
    return res.status(200).json(result.rows);
}


// -------------------------------------------------------------------------------------------------
// TILE REPORT
// -------------------------------------------------------------------------------------------------
async function handleTileReport(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { site_id } = req.query;
    if (!site_id) return res.status(400).json({ error: 'site_id required' });

    const result = await query(`
        SELECT 
           r.name as room_name,
           tm.brand as tile_brand,
           tm.size_label as tile_size,
           tm.type as tile_type,
           rtr.required_qty,
           rtr.received_qty,
           GREATEST(rtr.required_qty - rtr.received_qty, 0) as shortage_qty,
           CASE 
              WHEN GREATEST(rtr.required_qty - rtr.received_qty, 0) = 0 THEN 'fulfilled' 
              ELSE 'shortage' 
           END as status
        FROM room_tile_requirements rtr
        JOIN rooms r ON rtr.room_id = r.id
        JOIN tile_master tm ON rtr.tile_master_id = tm.id
        WHERE r.site_id = $1
        ORDER BY r.name, tm.brand
    `, [site_id]);

    return res.status(200).json(result.rows);
}
