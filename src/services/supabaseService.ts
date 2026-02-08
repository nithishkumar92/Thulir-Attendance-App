import { supabase } from '../lib/supabase';
import { Team, Worker, Site, AttendanceRecord, AdvancePayment, User } from '../types';

// USERS / AUTH
export const fetchUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return {
        id: data.id,
        username: data.email, // using email as username
        password: '', // security: don't store/fetch password
        name: data.name,
        role: data.role,
        teamId: data.team_id
    };
};

// TEAMS
export const fetchTeams = async (): Promise<Team[]> => {
    const { data, error } = await supabase.from('teams').select('*');
    if (error) throw error;

    return data.map(t => ({
        id: t.id,
        name: t.name,
        repId: t.rep_id,
        definedRoles: t.defined_roles,
        permittedSiteIds: t.permitted_site_ids
    }));
};

export const createTeam = async (team: Partial<Team>) => {
    const { data, error } = await supabase
        .from('teams')
        .insert([{
            name: team.name,
            defined_roles: team.definedRoles || [],
            permitted_site_ids: team.permittedSiteIds || []
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.repId !== undefined) dbUpdates.rep_id = updates.repId;
    if (updates.definedRoles) dbUpdates.defined_roles = updates.definedRoles;
    if (updates.permittedSiteIds) dbUpdates.permitted_site_ids = updates.permittedSiteIds;

    const { error } = await supabase
        .from('teams')
        .update(dbUpdates)
        .eq('id', teamId);

    if (error) throw error;
};

// WORKERS
export const fetchWorkers = async (): Promise<Worker[]> => {
    const { data, error } = await supabase.from('workers').select('*');
    if (error) throw error;

    return data.map(w => ({
        id: w.id,
        name: w.name,
        role: w.role,
        teamId: w.team_id,
        dailyWage: w.daily_wage,
        wageType: (w.wage_type === 'PIECE' ? 'PIECE_WORK' : 'DAILY') as 'DAILY' | 'PIECE_WORK',
        isActive: w.is_active,
        isLocked: w.is_locked,
        approved: w.approved,
        phoneNumber: w.phone_number,
        photoUrl: w.photo_url,
        aadhaarPhotoUrl: w.aadhaar_photo_url
    }));
};

// ... (createWorker and updateWorkerStatus seem okayish but let's check createWorker return)

// ATTENDANCE
export const fetchAttendance = async (): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase.from('attendance').select('*');
    if (error) throw error;

    return data.map(a => ({
        id: a.id,
        workerId: a.worker_id,
        date: a.date,
        status: a.status as 'PRESENT' | 'ABSENT' | 'HALF_DAY',
        siteId: a.site_id,
        punchInTime: a.check_in_time,
        punchOutTime: a.check_out_time,
        dutyPoints: a.duty_points,
        verified: a.location_verified
    }));
};

export const createWorker = async (worker: Partial<Worker>) => {
    const { data, error } = await supabase
        .from('workers')
        .insert([{
            name: worker.name,
            role: worker.role,
            team_id: worker.teamId,
            daily_wage: worker.dailyWage,
            phone_number: worker.phoneNumber,
            photo_url: worker.photoUrl,
            aadhaar_photo_url: worker.aadhaarPhotoUrl,
            approved: worker.approved || false,
            is_locked: worker.isLocked || false
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateWorkerStatus = async (workerId: string, updates: Partial<Worker>) => {
    const dbUpdates: any = {};

    // Explicitly check for undefined to allow partial updates
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.teamId !== undefined) dbUpdates.team_id = updates.teamId;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.dailyWage !== undefined) dbUpdates.daily_wage = updates.dailyWage;
    if (updates.approved !== undefined) dbUpdates.approved = updates.approved;
    if (updates.isLocked !== undefined) dbUpdates.is_locked = updates.isLocked;
    if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;
    if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
    if (updates.aadhaarPhotoUrl !== undefined) dbUpdates.aadhaar_photo_url = updates.aadhaarPhotoUrl;

    const { error } = await supabase
        .from('workers')
        .update(dbUpdates)
        .eq('id', workerId);

    if (error) throw error;
};

// SITES
export const fetchSites = async (): Promise<Site[]> => {
    const { data, error } = await supabase.from('sites').select('*');
    if (error) throw error;

    return data.map(s => ({
        id: s.id,
        name: s.name,
        location: s.location,
        radius: s.radius
    }));
};

export const createSite = async (site: Partial<Site>) => {
    const { data, error } = await supabase
        .from('sites')
        .insert([{
            name: site.name,
            location: site.location,
            radius: site.radius
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const recordAttendance = async (record: AttendanceRecord) => {
    // Check if exists first to update or insert (upsert)
    const { data, error } = await supabase
        .from('attendance')
        .upsert({
            worker_id: record.workerId,
            date: record.date,
            status: record.status,
            site_id: record.siteId,
            check_in_time: record.punchInTime,
            check_out_time: record.punchOutTime,
            location_verified: record.verified,
            duty_points: record.dutyPoints
        }, { onConflict: 'worker_id, date' })
        .select()
        .single();

    if (error) throw error;

    // Map response to AttendanceRecord format
    const a = data;
    return {
        id: a.id,
        workerId: a.worker_id,
        date: a.date,
        status: a.status as 'PRESENT' | 'ABSENT' | 'HALF_DAY',
        siteId: a.site_id,
        punchInTime: a.check_in_time,
        punchOutTime: a.check_out_time,
        dutyPoints: a.duty_points,
        verified: a.location_verified
    };
};

export const updateAttendanceById = async (id: string, record: Partial<AttendanceRecord>) => {
    const dbUpdates: any = {};
    if (record.date) dbUpdates.date = record.date;
    if (record.punchInTime !== undefined) dbUpdates.check_in_time = record.punchInTime; // Allow null to clear?
    if (record.punchOutTime !== undefined) dbUpdates.check_out_time = record.punchOutTime;
    if (record.status) dbUpdates.status = record.status;
    if (record.siteId) dbUpdates.site_id = record.siteId;
    if (record.verified !== undefined) dbUpdates.location_verified = record.verified;

    const { error } = await supabase
        .from('attendance')
        .update(dbUpdates)
        .eq('id', id);

    if (error) throw error;
};

export const deleteAttendance = async (id: string) => {
    const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// APP USERS (Custom Auth)
export const fetchAppUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('app_users').select('*');
    if (error) throw error;

    return data.map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        name: u.name,
        role: u.role,
        teamId: u.team_id,
        isLocked: u.is_locked
    }));
};

export const createAppUser = async (user: Partial<User>) => {
    const { data, error } = await supabase
        .from('app_users')
        .insert([{
            username: user.username,
            password: user.password,
            name: user.name,
            role: user.role,
            team_id: user.teamId,
            is_locked: user.isLocked || false
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateAppUser = async (userId: string, updates: Partial<User>) => {
    const dbUpdates: any = {};
    if (updates.password) dbUpdates.password = updates.password;
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.teamId !== undefined) dbUpdates.team_id = updates.teamId;
    if (updates.isLocked !== undefined) dbUpdates.is_locked = updates.isLocked;

    const { error } = await supabase
        .from('app_users')
        .update(dbUpdates)
        .eq('id', userId);

    if (error) throw error;
};

export const deleteAppUser = async (userId: string) => {
    const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', userId);

    if (error) throw error;
};

// ADVANCES
export const fetchAdvances = async (): Promise<AdvancePayment[]> => {
    const { data, error } = await supabase.from('advances').select('*');
    if (error) throw error;

    return data.map(a => ({
        id: a.id,
        teamId: a.team_id, // Changed from worker_id
        amount: a.amount,
        date: a.date,
        notes: a.notes,
        siteId: a.site_id
    }));
};

export const createAdvance = async (advance: AdvancePayment) => {
    const { data, error } = await supabase
        .from('advances')
        .insert([{
            team_id: advance.teamId, // Changed from worker_id
            amount: advance.amount,
            date: advance.date,
            notes: advance.notes,
            site_id: advance.siteId
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateAdvance = async (id: string, advance: Partial<AdvancePayment>) => {
    const dbUpdates: any = {};
    if (advance.teamId) dbUpdates.team_id = advance.teamId;
    if (advance.amount) dbUpdates.amount = advance.amount;
    if (advance.date) dbUpdates.date = advance.date;
    if (advance.notes) dbUpdates.notes = advance.notes;
    if (advance.siteId) dbUpdates.site_id = advance.siteId;

    const { error } = await supabase
        .from('advances')
        .update(dbUpdates)
        .eq('id', id);

    if (error) throw error;
};

export const deleteAdvance = async (id: string) => {
    const { error } = await supabase
        .from('advances')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
