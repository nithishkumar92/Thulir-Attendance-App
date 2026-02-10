
import { format } from 'date-fns';

/**
 * Returns the current date as an ISO string (YYYY-MM-DD) in the LOCAL timezone.
 * This fixes issues where ISOString().split('T')[0] returns the UTC date, which might be yesterday.
 */
export const getTodayDateString = (): string => {
    return format(new Date(), 'yyyy-MM-dd');
};

/**
 * Formats a given date to YYYY-MM-DD, respecting the local timezone if it's a Date object.
 */
export const formatDateToLocalISO = (date: Date | number): string => {
    return format(date, 'yyyy-MM-dd');
};
