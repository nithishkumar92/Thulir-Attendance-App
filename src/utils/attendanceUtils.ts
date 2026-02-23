import { AttendanceRecord } from '../types';
import { calculateDutyPoints } from './wageUtils';

/**
 * Calculate duty points (shifts) for an attendance record.
 * This is the SINGLE SOURCE OF TRUTH for duty point calculation.
 * 
 * @param record - Attendance record
 * @returns Number of duty points (0, 0.5, 1, 1.5, or custom)
 */
export const calculateShifts = (record: any): number => {
    if (!record || record.status === 'ABSENT') return 0;

    // Priority 1: Use pre-calculated duty points if available
    if (record.dutyPoints !== undefined && record.dutyPoints !== null) {
        return Number(record.dutyPoints);
    }

    // Priority 2: Calculate from punch times if both exist
    if (record.punchInTime && record.punchOutTime) {
        try {
            return calculateDutyPoints(
                new Date(record.punchInTime),
                new Date(record.punchOutTime)
            );
        } catch (e) {
            console.error('Error calculating duty points:', e);
            return 0;
        }
    }

    // Priority 3: Handle incomplete punches (punched in but not out)
    if (record.punchInTime && !record.punchOutTime) {
        return 0; // Incomplete - don't count until punch out
    }

    // Priority 4: Fallback to status-based calculation
    if (record.status === 'HALF_DAY') return 0.5;
    if (record.status === 'PRESENT') return 1;

    return 0;
};

/**
 * Get display symbol for duty points.
 * 
 * @param shift - Number of duty points
 * @param record - Optional attendance record for context
 * @returns Symbol string (A, /, X, X/, X//, or -)
 */
export const getShiftSymbol = (shift: number, record?: any): string => {
    // Special case: Pending (punched in but not out)
    if (record && record.punchInTime && !record.punchOutTime) {
        return '-'; // Pending/In Progress
    }

    // Standard symbols
    if (shift === 0) return '-';      // Absent
    if (shift === 0.5) return '/';    // Half day
    if (shift === 1) return 'X';      // Full day
    if (shift === 1.5) return 'X/';   // Overtime (1.5 shifts)
    if (shift === 2) return 'X//';    // Double shift (2.0)

    // Custom shift values
    return shift.toString();
};

/**
 * Get color class for shift status.
 * 
 * @param shift - Number of duty points
 * @param record - Optional attendance record for context
 * @returns Tailwind CSS classes for styling
 */
export const getShiftColor = (shift: number, record?: any): string => {
    // Pending (punched in but not out)
    if (record && record.punchInTime && !record.punchOutTime) {
        return 'bg-yellow-50 text-yellow-600 ring-yellow-100';
    }

    // Absent
    if (shift === 0) {
        return 'bg-red-50 text-red-600 ring-red-100';
    }

    // Half day
    if (shift === 0.5) {
        return 'bg-orange-50 text-orange-600 ring-orange-100';
    }

    // Full day or overtime
    return 'bg-green-50 text-green-600 ring-green-100';
};

/**
 * Check if attendance record is complete (both punch in and out exist).
 * 
 * @param record - Attendance record
 * @returns True if complete, false otherwise
 */
export const isAttendanceComplete = (record: any): boolean => {
    return !!(record?.punchInTime && record?.punchOutTime);
};

/**
 * Check if attendance record is pending (punched in but not out).
 * 
 * @param record - Attendance record
 * @returns True if pending, false otherwise
 */
export const isAttendancePending = (record: any): boolean => {
    return !!(record?.punchInTime && !record?.punchOutTime);
};

/**
 * Get attendance status label.
 * 
 * @param record - Attendance record
 * @returns Human-readable status string
 */
export const getAttendanceStatusLabel = (record: any): string => {
    if (!record) return 'Absent';
    if (isAttendancePending(record)) return 'In Progress';
    if (isAttendanceComplete(record)) {
        const shifts = calculateShifts(record);
        if (shifts >= 2) return 'Double Shift';
        if (shifts >= 1.5) return 'Overtime';
        if (shifts === 1) return 'Present';
        if (shifts === 0.5) return 'Half Day';
    }
    if (record.status === 'ABSENT') return 'Absent';
    return 'Unknown';
};
