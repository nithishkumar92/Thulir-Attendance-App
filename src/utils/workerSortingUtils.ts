import { subDays, format } from 'date-fns';
import { AttendanceRecord, Worker } from '../types';
import { calculateShifts } from './attendanceUtils';

/**
 * Calculate how many days a worker worked in the last 30 days
 */
export const calculate30DayFrequency = (
    workerId: string,
    attendance: AttendanceRecord[],
    siteId?: string
): number => {
    const today = new Date();
    let daysWorked = 0;

    // Check each of the last 30 days
    for (let i = 0; i < 30; i++) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');

        const record = attendance.find(a =>
            a.workerId === workerId &&
            a.date === dateStr &&
            (!siteId || a.siteId === siteId)
        );

        // Count day if worker had at least 0.5 duty points
        if (record && calculateShifts(record) >= 0.5) {
            daysWorked++;
        }
    }

    return daysWorked;
};

/**
 * Check if worker worked yesterday
 */
export const workedYesterday = (
    workerId: string,
    attendance: AttendanceRecord[],
    siteId?: string
): boolean => {
    const yesterday = subDays(new Date(), 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    const record = attendance.find(a =>
        a.workerId === workerId &&
        a.date === yesterdayStr &&
        (!siteId || a.siteId === siteId)
    );

    return record ? calculateShifts(record) >= 0.5 : false;
};

/**
 * Sort workers by probability of punching in today
 * Priority 1: Workers who worked yesterday
 * Priority 2: Ranked by 30-day work frequency (high to low)
 * Priority 3: Alphabetical by name
 */
export const sortWorkersByProbability = (
    workers: Worker[],
    attendance: AttendanceRecord[],
    siteId?: string
): Worker[] => {
    return [...workers].sort((a, b) => {
        // Calculate metrics for both workers
        const aWorkedYesterday = workedYesterday(a.id, attendance, siteId);
        const bWorkedYesterday = workedYesterday(b.id, attendance, siteId);
        const aFrequency = calculate30DayFrequency(a.id, attendance, siteId);
        const bFrequency = calculate30DayFrequency(b.id, attendance, siteId);

        // Priority 1: Workers who worked yesterday come first
        if (aWorkedYesterday && !bWorkedYesterday) return -1;
        if (!aWorkedYesterday && bWorkedYesterday) return 1;

        // Priority 2: Sort by 30-day frequency (higher first)
        if (aFrequency !== bFrequency) {
            return bFrequency - aFrequency; // Descending order
        }

        // Priority 3: Alphabetical by name
        return a.name.localeCompare(b.name);
    });
};
