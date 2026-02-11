import { useState, useMemo } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, subWeeks, addWeeks } from 'date-fns';

/**
 * Reusable hook for week navigation logic.
 * Eliminates duplicate week navigation code across multiple components.
 * 
 * @param initialDate - Optional initial date (defaults to today)
 * @returns Week navigation state and controls
 */
export const useWeekNavigation = (initialDate: Date = new Date()) => {
    const [currentDate, setCurrentDate] = useState(initialDate);

    // Calculate week boundaries (Sunday to Saturday)
    const weekStart = useMemo(
        () => startOfWeek(currentDate, { weekStartsOn: 0 }),
        [currentDate]
    );

    const weekEnd = useMemo(
        () => endOfWeek(currentDate, { weekStartsOn: 0 }),
        [currentDate]
    );

    // Get all days in the week
    const weekDays = useMemo(
        () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
        [weekStart, weekEnd]
    );

    // Navigation handlers
    const handlePrevWeek = () => {
        setCurrentDate(prev => subWeeks(prev, 1));
    };

    const handleNextWeek = () => {
        setCurrentDate(prev => addWeeks(prev, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    return {
        currentDate,
        weekStart,
        weekEnd,
        weekDays,
        handlePrevWeek,
        handleNextWeek,
        setCurrentDate,
        goToToday
    };
};
