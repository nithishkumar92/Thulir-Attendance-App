import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_db.js';
import { uploadImageToB2 } from '../_b2.js';

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
        const { excludePhotos } = req.query;

        try {
            // Fetch all active workers
            // If excludePhotos is true, we don't select photo_url and aadhaar_photo_url
            // Or we select them but don't return them. SQL optimization is better.

            let queryText = `SELECT * FROM workers WHERE is_active = true ORDER BY name ASC`;

            // Disable caching to debug "missing details" issue and force fresh fetch
            res.setHeader('Cache-Control', 'no-store, max-age=0');

            const result = await query(queryText);

            // Base64 photos are huge (30-50KB each). 
            // We exclude them by default to save bandwidth.
            // Client must request `?includePhotos=true` or query by `?id` to get them.
            const shouldIncludePhotos = req.query.includePhotos === 'true' || req.query.id;

            const workers = result.rows.map(w => ({
                id: w.id || w.ID,
                name: w.name || w.Name || w.NAME,
                role: w.role || w.Role || w.ROLE,
                teamId: w.team_id || w.team_Id || w.Team_Id,
                dailyWage: Number(w.daily_wage || w.Daily_Wage || 0),
                wageType: w.wage_type || w.Wage_Type,
                phoneNumber: w.phone_number || w.Phone_Number,
                // Only include photos if explicitly requested OR if they are external URLs (not Base64)
                photoUrl: (shouldIncludePhotos || (w.photo_url && !w.photo_url.startsWith('data:'))) ? (w.photo_url || w.Photo_Url || undefined) : undefined,
                aadhaarPhotoUrl: (shouldIncludePhotos || (w.aadhaar_photo_url && !w.aadhaar_photo_url.startsWith('data:'))) ? (w.aadhaar_photo_url || w.Aadhaar_Photo_Url || undefined) : undefined,
                approved: w.approved !== undefined ? w.approved : (w.Approved !== undefined ? w.Approved : false),
                isActive: w.is_active !== undefined ? w.is_active : (w.Is_Active !== undefined ? w.Is_Active : true),
                isLocked: w.is_locked !== undefined ? w.is_locked : (w.Is_Locked !== undefined ? w.Is_Locked : false)
            }));
            return res.status(200).json(workers);
        } catch (error) {
            console.error('Error fetching workers:', error);
            return res.status(500).json({ error: 'Failed to fetch workers' });
        }
    }

    if (req.method === 'POST') {
        const { name, role, teamId, dailyWage, wageType, phoneNumber, photoUrl, aadhaarPhotoUrl, approved, isLocked } = req.body;

        try {
            // Process images - Upload to B2 if Base64
            let finalPhotoUrl = photoUrl;
            let finalAadhaarUrl = aadhaarPhotoUrl;

            if (photoUrl && photoUrl.startsWith('data:image')) {
                const uploaded = await uploadImageToB2(photoUrl, 'workers');
                if (uploaded) finalPhotoUrl = uploaded;
            }

            if (aadhaarPhotoUrl && aadhaarPhotoUrl.startsWith('data:image')) {
                const uploaded = await uploadImageToB2(aadhaarPhotoUrl, 'workers/aadhaar');
                if (uploaded) finalAadhaarUrl = uploaded;
            }

            const result = await query(
                `INSERT INTO workers (
                    name, role, team_id, daily_wage, wage_type, phone_number, 
                    photo_url, aadhaar_photo_url, approved, is_active, is_locked
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
                RETURNING *`,
                [
                    name, role, teamId || null, dailyWage || 0, wageType || 'DAILY', phoneNumber,
                    finalPhotoUrl, finalAadhaarUrl, approved || false, isLocked || false
                ]
            );
            const w = result.rows[0];
            return res.status(201).json({
                id: w.id,
                name: w.name,
                role: w.role,
                teamId: w.team_id,
                dailyWage: Number(w.daily_wage),
                wageType: w.wage_type,
                phoneNumber: w.phone_number,
                photoUrl: w.photo_url,
                aadhaarPhotoUrl: w.aadhaar_photo_url,
                approved: w.approved,
                isActive: w.is_active,
                isLocked: w.is_locked
            });
        } catch (error) {
            console.error('Error creating worker:', error);
            return res.status(500).json({ error: 'Failed to create worker' });
        }
    }

    if (req.method === 'PATCH') {
        const {
            id, name, role, teamId, dailyWage, wageType,
            phoneNumber, photoUrl, aadhaarPhotoUrl, approved,
            isLocked, isActive
        } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Worker ID is required' });
        }

        try {
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            // Handle Photo Uploads for Updates
            let finalPhotoUrl = photoUrl;
            let finalAadhaarUrl = aadhaarPhotoUrl;

            if (photoUrl && photoUrl.startsWith('data:image')) {
                const uploaded = await uploadImageToB2(photoUrl, 'workers');
                if (uploaded) finalPhotoUrl = uploaded;
            }

            if (aadhaarPhotoUrl && aadhaarPhotoUrl.startsWith('data:image')) {
                const uploaded = await uploadImageToB2(aadhaarPhotoUrl, 'workers/aadhaar');
                if (uploaded) finalAadhaarUrl = uploaded;
            }

            if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
            if (role !== undefined) { updates.push(`role = $${paramIndex++}`); values.push(role); }
            if (teamId !== undefined) { updates.push(`team_id = $${paramIndex++}`); values.push(teamId); }
            if (dailyWage !== undefined) { updates.push(`daily_wage = $${paramIndex++}`); values.push(dailyWage); }
            if (wageType !== undefined) { updates.push(`wage_type = $${paramIndex++}`); values.push(wageType); }
            if (phoneNumber !== undefined) { updates.push(`phone_number = $${paramIndex++}`); values.push(phoneNumber); }
            if (finalPhotoUrl !== undefined) { updates.push(`photo_url = $${paramIndex++}`); values.push(finalPhotoUrl); }
            if (finalAadhaarUrl !== undefined) { updates.push(`aadhaar_photo_url = $${paramIndex++}`); values.push(finalAadhaarUrl); }
            if (approved !== undefined) { updates.push(`approved = $${paramIndex++}`); values.push(approved); }
            if (isLocked !== undefined) { updates.push(`is_locked = $${paramIndex++}`); values.push(isLocked); }
            if (isActive !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(isActive); }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            const queryText = `UPDATE workers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

            const result = await query(queryText, values);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Worker not found' });
            }

            const w = result.rows[0];
            return res.status(200).json({
                id: w.id,
                name: w.name,
                role: w.role,
                teamId: w.team_id,
                dailyWage: Number(w.daily_wage),
                wageType: w.wage_type,
                phoneNumber: w.phone_number,
                photoUrl: w.photo_url,
                aadhaarPhotoUrl: w.aadhaar_photo_url,
                approved: w.approved,
                isActive: w.is_active,
                isLocked: w.is_locked
            });
        } catch (error) {
            console.error('Error updating worker:', error);
            return res.status(500).json({ error: 'Failed to update worker' });
        }
    }

    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ error: 'Worker ID is required' });
        }

        try {
            await query('UPDATE workers SET is_active = false WHERE id = $1', [id]);
            return res.status(200).json({ message: 'Worker deleted (soft delete)' });
        } catch (error) {
            console.error('Error deleting worker:', error);
            return res.status(500).json({ error: 'Failed to delete worker' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
