import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks, addWeeks, parseISO, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { WorkerAttendanceCard } from '../../components/WorkerAttendanceCard';
import { useNavigate } from 'react-router-dom';

interface AttendanceReportViewProps {
    teamId?: string;
    siteId?: string;
}

export const AttendanceReportView: React.FC<AttendanceReportViewProps> = ({ teamId, siteId }) => {
    const { attendance, workers, currentUser } = useApp();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());

    const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });

    const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

    // Filter workers based on role and team
    const visibleWorkers = useMemo(() => {
        if (!currentUser) return [];
        let filtered = workers;

        // Role-based restriction
        if (currentUser.role === 'TEAM_REP') {
            filtered = workers.filter(w => w.teamId === currentUser.teamId);
        } else if (currentUser.role !== 'OWNER') {
            return [];
        }

        // Team filter
        if (teamId && teamId !== 'ALL') {
            filtered = filtered.filter(w => w.teamId === teamId);
        }

        return filtered.filter(w => w.isActive);
    }, [currentUser, workers, teamId]);

    // Filter attendance by week and site
    const weekAttendance = useMemo(() => {
        return attendance.filter(a => {
            const recordDate = parseISO(a.date);
            const isInWeek = days.some(day => isSameDay(day, recordDate));
            const isSiteMatch = !siteId || a.siteId === siteId;
            return isInWeek && isSiteMatch;
        });
    }, [attendance, days, siteId]);

    return (
        <div className="space-y-4 p-4">
            {/* Header with Week Navigation and Add Button */}
            <div className="flex items-center justify-between gap-3">
                {/* Week Navigation */}
                <div className="flex items-center bg-white rounded-lg shadow-sm border p-3 flex-1">
                    <button
                        onClick={handlePrevWeek}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-bold text-gray-800 flex-1 text-center">
                        {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}
                    </span>
                    <button
                        onClick={handleNextWeek}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Add Attendance Button */}
                <button
                    onClick={() => {
                        console.log('Button clicked, currentUser:', currentUser);
                        navigate('/dashboard/attendance');
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-sm hover:bg-blue-700 transition-colors font-semibold whitespace-nowrap"
                >
                    <Plus size={20} />
                    <span className="hidden sm:inline">Add Attendance</span>
                </button>
            </div>

            {/* Worker Cards Grid */}
            {visibleWorkers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleWorkers.map(worker => (
                        <WorkerAttendanceCard
                            key={worker.id}
                            worker={worker}
                            weekDays={days}
                            attendance={weekAttendance}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                    <p className="text-gray-500">No workers found for the selected filters.</p>
                </div>
            )}
        </div>
    );
};
