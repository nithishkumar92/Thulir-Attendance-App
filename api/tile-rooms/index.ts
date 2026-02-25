import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_db.js';
import { uploadImageToB2, signB2Url } from '../_b2.js';

const CORS_HEADERS = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,POST,PATCH,DELETE',
    'Access-Control-Allow-Headers':
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
};

// Ensure the tile_rooms table exists (idempotent)
async function ensureTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS tile_rooms (
            id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
            site_id     TEXT NOT NULL,
            name        TEXT NOT NULL,
            tile_name   TEXT,
            tile_size   TEXT,
            custom_tile_length TEXT,
            custom_tile_width  TEXT,
            custom_tile_unit   TEXT DEFAULT 'feet',
            length      TEXT,
            width       TEXT,
            has_skirting BOOLEAN DEFAULT false,
            skirting_height TEXT,
            doors       TEXT,
            door_width  TEXT,
            deductions  JSONB DEFAULT '[]',
            additions   JSONB DEFAULT '[]',
            floor_area  TEXT,
            skirting_area TEXT,
            total_area  TEXT,
            total_deducted_area TEXT,
            total_added_area    TEXT,
            wastage     TEXT DEFAULT '10',
            req_qty     TEXT,
            instructions TEXT,
            photos      JSONB DEFAULT '[]',
            surface_type TEXT DEFAULT 'floor',
            grid_data   JSONB DEFAULT '{}',
            tiles_config JSONB DEFAULT '{}',
            created_at  TIMESTAMPTZ DEFAULT now(),
            updated_at  TIMESTAMPTZ DEFAULT now()
        )
    `);
    // Add columns if upgrading an older table (idempotent)
    await query(`ALTER TABLE tile_rooms ADD COLUMN IF NOT EXISTS surface_type TEXT DEFAULT 'floor'`);
    await query(`ALTER TABLE tile_rooms ADD COLUMN IF NOT EXISTS grid_data JSONB DEFAULT '{}'`);
    await query(`ALTER TABLE tile_rooms ADD COLUMN IF NOT EXISTS tiles_config JSONB DEFAULT '{}'`);
}

/** Sign all photo URLs in an array */
async function signPhotos(photos: { id: number; url: string }[]) {
    return Promise.all(
        (photos || []).map(async (p) => ({
            id: p.id,
            url: p.url && !p.url.startsWith('data:') ? await signB2Url(p.url) : p.url,
        }))
    );
}

/** Upload any base64 photos in an array to B2 and replace with URLs */
async function uploadPhotos(photos: { id: number; url: string }[]) {
    return Promise.all(
        (photos || []).map(async (p) => {
            if (p.url && p.url.startsWith('data:image')) {
                const uploaded = await uploadImageToB2(p.url, 'tiles');
                return { id: p.id, url: uploaded || p.url };
            }
            return p;
        })
    );
}

function rowToRoom(r: any) {
    return {
        id: r.id,
        siteId: r.site_id,
        name: r.name,
        tileName: r.tile_name || '',
        tileSize: r.tile_size || '',
        customTileLength: r.custom_tile_length || '',
        customTileWidth: r.custom_tile_width || '',
        customTileUnit: r.custom_tile_unit || 'feet',
        length: r.length || '',
        width: r.width || '',
        hasSkirting: r.has_skirting || false,
        skirtingHeight: r.skirting_height || '',
        doors: r.doors || '',
        doorWidth: r.door_width || '',
        deductions: r.deductions || [],
        additions: r.additions || [],
        floorArea: r.floor_area || '0',
        skirtingArea: r.skirting_area || '0',
        totalArea: r.total_area || '0',
        totalDeductedArea: r.total_deducted_area || '0',
        totalAddedArea: r.total_added_area || '0',
        wastage: r.wastage || '10',
        reqQty: r.req_qty || '',
        instructions: r.instructions || '',
        photos: r.photos || [],
        surfaceType: r.surface_type || 'floor',
        gridData: r.grid_data || {},
        tilesConfig: r.tiles_config || {},
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await ensureTable();
    } catch (err) {
        console.error('ensureTable failed:', err);
        return res.status(500).json({ error: 'DB table init failed' });
    }

    // ── GET /api/tile-rooms?siteId=xxx          → list, NO photos
    // ── GET /api/tile-rooms?id=xxx              → single room, WITH signed photos
    if (req.method === 'GET') {
        const { siteId, id } = req.query;

        // ── Single room with full photos ──────────────────────────────────
        if (id && typeof id === 'string') {
            try {
                const result = await query(
                    `SELECT * FROM tile_rooms WHERE id = $1`,
                    [id]
                );
                if (result.rowCount === 0) {
                    return res.status(404).json({ error: 'Room not found' });
                }
                const room = rowToRoom(result.rows[0]);
                room.photos = await signPhotos(room.photos);
                return res.status(200).json(room);
            } catch (error) {
                console.error('Error fetching tile room:', error);
                return res.status(500).json({ error: 'Failed to fetch tile room' });
            }
        }

        // ── Room list (photos stripped for bandwidth) ─────────────────────
        if (!siteId || typeof siteId !== 'string') {
            return res.status(400).json({ error: 'siteId or id is required' });
        }

        try {
            const result = await query(
                `SELECT * FROM tile_rooms WHERE site_id = $1 ORDER BY created_at ASC`,
                [siteId]
            );

            const rooms = result.rows.map((r) => {
                const room = rowToRoom(r);
                room.photos = []; // strip photos — load lazily on room open
                return room;
            });

            return res.status(200).json(rooms);
        } catch (error) {
            console.error('Error fetching tile rooms:', error);
            return res.status(500).json({ error: 'Failed to fetch tile rooms' });
        }
    }

    // ── POST /api/tile-rooms  (create) ──────────────────────────────────────
    if (req.method === 'POST') {
        const body = req.body;
        const { siteId, name } = body;

        if (!siteId || !name) {
            return res.status(400).json({ error: 'siteId and name are required' });
        }

        try {
            // Upload base64 photos to B2
            const uploadedPhotos = await uploadPhotos(body.photos || []);

            const result = await query(
                `INSERT INTO tile_rooms (
                    site_id, name, tile_name, tile_size,
                    custom_tile_length, custom_tile_width, custom_tile_unit,
                    length, width, has_skirting, skirting_height,
                    doors, door_width, deductions, additions,
                    floor_area, skirting_area, total_area,
                    total_deducted_area, total_added_area,
                    wastage, req_qty, instructions, photos,
                    surface_type, grid_data, tiles_config
                ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
                    $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
                ) RETURNING *`,
                [
                    siteId, name, body.tileName || '', body.tileSize || '',
                    body.customTileLength || '', body.customTileWidth || '', body.customTileUnit || 'feet',
                    body.length || '', body.width || '', body.hasSkirting || false, body.skirtingHeight || '',
                    body.doors || '', body.doorWidth || '',
                    JSON.stringify(body.deductions || []),
                    JSON.stringify(body.additions || []),
                    body.floorArea || '0', body.skirtingArea || '0', body.totalArea || '0',
                    body.totalDeductedArea || '0', body.totalAddedArea || '0',
                    body.wastage || '10', body.reqQty || '', body.instructions || '',
                    JSON.stringify(uploadedPhotos),
                    body.surfaceType || 'floor',
                    JSON.stringify(body.gridData || {}),
                    JSON.stringify(body.tilesConfig || {}),
                ]
            );

            const room = rowToRoom(result.rows[0]);
            room.photos = await signPhotos(room.photos);
            return res.status(201).json(room);
        } catch (error: any) {
            console.error('Error creating tile room:', error);
            return res.status(500).json({ error: 'Failed to create tile room', detail: error?.message });
        }
    }

    // ── PATCH /api/tile-rooms  (update) ─────────────────────────────────────
    if (req.method === 'PATCH') {
        const body = req.body;
        const { id } = body;

        if (!id) {
            return res.status(400).json({ error: 'id is required' });
        }

        try {
            // Upload any new base64 photos to B2
            const uploadedPhotos = await uploadPhotos(body.photos || []);

            const result = await query(
                `UPDATE tile_rooms SET
                    name = $1, tile_name = $2, tile_size = $3,
                    custom_tile_length = $4, custom_tile_width = $5, custom_tile_unit = $6,
                    length = $7, width = $8, has_skirting = $9, skirting_height = $10,
                    doors = $11, door_width = $12, deductions = $13, additions = $14,
                    floor_area = $15, skirting_area = $16, total_area = $17,
                    total_deducted_area = $18, total_added_area = $19,
                    wastage = $20, req_qty = $21, instructions = $22, photos = $23,
                    surface_type = $24, grid_data = $25, tiles_config = $26,
                    updated_at = now()
                WHERE id = $27
                RETURNING *`,
                [
                    body.name, body.tileName || '', body.tileSize || '',
                    body.customTileLength || '', body.customTileWidth || '', body.customTileUnit || 'feet',
                    body.length || '', body.width || '', body.hasSkirting || false, body.skirtingHeight || '',
                    body.doors || '', body.doorWidth || '',
                    JSON.stringify(body.deductions || []),
                    JSON.stringify(body.additions || []),
                    body.floorArea || '0', body.skirtingArea || '0', body.totalArea || '0',
                    body.totalDeductedArea || '0', body.totalAddedArea || '0',
                    body.wastage || '10', body.reqQty || '', body.instructions || '',
                    JSON.stringify(uploadedPhotos),
                    body.surfaceType || 'floor',
                    JSON.stringify(body.gridData || {}),
                    JSON.stringify(body.tilesConfig || {}),
                    id,
                ]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Room not found' });
            }

            const room = rowToRoom(result.rows[0]);
            room.photos = await signPhotos(room.photos);
            return res.status(200).json(room);
        } catch (error: any) {
            console.error('Error updating tile room:', error);
            return res.status(500).json({ error: 'Failed to update tile room', detail: error?.message });
        }
    }

    // ── DELETE /api/tile-rooms?id=xxx ────────────────────────────────────────
    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'id is required' });
        }

        try {
            const result = await query(
                `DELETE FROM tile_rooms WHERE id = $1 RETURNING id`,
                [id]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Room not found' });
            }

            return res.status(200).json({ success: true, id });
        } catch (error) {
            console.error('Error deleting tile room:', error);
            return res.status(500).json({ error: 'Failed to delete tile room' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
