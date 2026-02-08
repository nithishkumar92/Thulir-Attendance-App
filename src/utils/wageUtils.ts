import { startOfDay, setHours, setMinutes, isBefore, isAfter, differenceInMinutes, areIntervalsOverlapping, addMinutes } from 'date-fns';

export interface TimeSlot {
    name: string;
    startHour: number;
    endHour: number;
    points: number;
}

// Defined Windows
const SLOTS: TimeSlot[] = [
    { name: 'Early Morning', startHour: 6, endHour: 9, points: 0.5 },
    { name: 'Morning', startHour: 9, endHour: 13, points: 0.5 }, // 9 AM - 1 PM
    // Lunch 1 PM - 2 PM is ignored
    { name: 'Afternoon', startHour: 14, endHour: 18, points: 0.5 } // 2 PM - 6 PM
];

export const calculateDutyPoints = (checkInTime: Date, checkOutTime: Date): number => {
    let totalPoints = 0;
    const baseDate = startOfDay(checkInTime);

    // Ensure checkOut is after checkIn (handle potential overnight roughly or assume same day for now per requirements)
    // If checkout is before checkin, assume next day? For simplicity, we trust the Date objects passed are correct.

    SLOTS.forEach(slot => {
        const slotStart = setMinutes(setHours(baseDate, slot.startHour), 0);
        const slotEnd = setMinutes(setHours(baseDate, slot.endHour), 0);
        const slotDurationMins = differenceInMinutes(slotEnd, slotStart);

        // Calculate overlap
        // Overlap Start = Max(checkIn, slotStart)
        // Overlap End = Min(checkOut, slotEnd)

        const overlapStart = isAfter(checkInTime, slotStart) ? checkInTime : slotStart;
        const overlapEnd = isBefore(checkOutTime, slotEnd) ? checkOutTime : slotEnd;

        if (isAfter(overlapEnd, overlapStart)) {
            const overlapMins = differenceInMinutes(overlapEnd, overlapStart);
            const coveragePercentage = overlapMins / slotDurationMins;

            if (coveragePercentage >= 0.8) {
                totalPoints += slot.points;
            }
        }
    });

    return totalPoints;
};
