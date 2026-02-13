import { Worker, AttendanceRecord, User } from '../types';
import { format } from 'date-fns';

/**
 * Filter workers based on user role and permissions.
 * This is the SINGLE SOURCE OF TRUTH for worker filtering logic.
 * 
 * @param workers - All workers
 * @param currentUser - Current logged-in user
 * @param teamId - Optional team filter (for owner viewing specific team)
 * @param includeInactive - Whether to include inactive workers
 * @returns Filtered workers array
 */
export const filterWorkersByRole = (
    workers: Worker[],
    currentUser: User | null,
    teamId?: string,
    includeInactive: boolean = false
): Worker[] => {
    if (!currentUser) return [];

    let filtered = workers;

    // Step 1: Role-based filtering
    if (currentUser.role === 'TEAM_REP') {
        // Team reps can only see workers in their team
        filtered = workers.filter(w => w.teamId === currentUser.teamId);
    } else if (currentUser.role === 'OWNER') {
        // Owners can see all workers (no filtering at this step)
        filtered = workers;
    } else {
        // Unknown role - no access
        return [];
    }

    // Step 2: Team filter (usually for owner selecting specific team)
    if (teamId && teamId !== 'ALL') {
        filtered = filtered.filter(w => w.teamId === teamId);
    }

    // Step 3: Active status filter
    if (!includeInactive) {
        filtered = filtered.filter(w => w.isActive);
    }

    // Step 4: Exclude locked workers
    filtered = filtered.filter(w => !w.isLocked);

    return filtered;
};

/**
 * Filter attendance records by date range.
 * 
 * @param attendance - All attendance records
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Filtered attendance records
 */
export const filterAttendanceByDateRange = (
    attendance: AttendanceRecord[],
    startDate: Date,
    endDate: Date
): AttendanceRecord[] => {
    // Convert dates to strings for comparison to avoid timezone issues
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    return attendance.filter(record => {
        // Simple string comparison - record.date is already 'yyyy-MM-dd' format
        return record.date >= startStr && record.date <= endStr;
    });
};

/**
 * Filter attendance records by site.
 * 
 * @param attendance - All attendance records
 * @param siteId - Site ID to filter by
 * @returns Filtered attendance records
 */
export const filterAttendanceBySite = (
    attendance: AttendanceRecord[],
    siteId: string | null | undefined
): AttendanceRecord[] => {
    if (!siteId) return attendance;
    return attendance.filter(record => record.siteId === siteId);
};

/**
 * Filter attendance records by worker IDs.
 * 
 * @param attendance - All attendance records
 * @param workerIds - Array of worker IDs
 * @returns Filtered attendance records
 */
export const filterAttendanceByWorkers = (
    attendance: AttendanceRecord[],
    workerIds: string[]
): AttendanceRecord[] => {
    return attendance.filter(record => workerIds.includes(record.workerId));
};

/**
 * Filter attendance records by date string (exact match).
 * 
 * @param attendance - All attendance records
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Filtered attendance records
 */
export const filterAttendanceByDate = (
    attendance: AttendanceRecord[],
    dateString: string
): AttendanceRecord[] => {
    return attendance.filter(record => record.date === dateString);
};
