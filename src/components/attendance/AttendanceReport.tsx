import React from 'react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { WorkerAttendanceCard } from '../WorkerAttendanceCard';
import { useNavigate } from 'react-router-dom';
import { useWeekNavigation } from '../../hooks/useWeekNavigation';
import { useFilteredWorkers } from '../../hooks/useFilteredWorkers';
import { filterAttendanceByDateRange, filterAttendanceBySite } from '../../utils/filterUtils';
import { calculateShifts } from '../../utils/attendanceUtils';

interface AttendanceReportProps {
    userRole: 'OWNER' | 'TEAM_REP';
    teamId?: string;
    siteId?: string;
    showAddButton?: boolean;
    onAddAttendance?: () => void;
}

/**
 * Unified Attendance Report Component
 * Works for both Owner Portal and Worker Portal (Team Rep)
 * Uses role-based access control to show/hide features
 */
export const AttendanceReport: React.FC<AttendanceReportProps> = ({
    userRole,
    teamId,
    siteId,
    showAddButton = false,
    onAddAttendance
}) => {
    const { attendance, teams } = useApp();
    const navigate = useNavigate();
    const [selectedTeamId, setSelectedTeamId] = React.useState<string>(teamId || 'ALL');

    // Update selectedTeamId if prop changes
    React.useEffect(() => {
        if (teamId) setSelectedTeamId(teamId);
    }, [teamId]);

    // Use shared week navigation hook
    const { weekStart, weekEnd, weekDays, handlePrevWeek, handleNextWeek } = useWeekNavigation();

    // Use shared worker filtering hook
    const allWorkers = useFilteredWorkers({
        teamId: selectedTeamId === 'ALL' ? undefined : selectedTeamId
    });

    // Filter attendance by week and site
    const weekAttendance = filterAttendanceBySite(
        filterAttendanceByDateRange(attendance, weekStart, weekEnd),
        siteId
    );

    // Filter to show only workers with at least 0.5 duty points in the selected week
    const visibleWorkers = React.useMemo(() => {
        return allWorkers.filter(worker => {
            // Calculate total duty points for this worker in the week
            const totalDuty = weekDays.reduce((sum, day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const record = weekAttendance.find(a =>
                    a.workerId === worker.id &&
                    a.date === dateStr
                );
                return sum + (record ? calculateShifts(record) : 0);
            }, 0);

            // Show only workers with at least 0.5 duty points
            return totalDuty >= 0.5;
        });
    }, [allWorkers, weekDays, weekAttendance]);

    const handleAddClick = () => {
        if (onAddAttendance) {
            onAddAttendance();
        } else {
            navigate('/add-attendance');
        }
    };

    return (
        <div className="space-y-4 p-4">
            {/* Header with Week Navigation */}
            <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-2">
                <button
                    onClick={handlePrevWeek}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Previous week"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="font-bold text-gray-800 flex-1 text-center">
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </span>
                <button
                    onClick={handleNextWeek}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Next week"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Team Filter (Owner only) */}
            {userRole === 'OWNER' && !teamId && (
                <div className="bg-white p-3 rounded-lg shadow-sm border">
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white text-sm"
                    >
                        <option value="ALL">All Teams</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Add Attendance Button (Owner only) */}
            {showAddButton && userRole === 'OWNER' && (
                <button
                    onClick={handleAddClick}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    Add Attendance
                </button>
            )}

            {/* Worker Attendance Cards */}
            <div className="space-y-3">
                {visibleWorkers.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
                        No workers found
                    </div>
                ) : (
                    visibleWorkers.map(worker => (
                        <WorkerAttendanceCard
                            key={worker.id}
                            worker={worker}
                            weekDays={weekDays}
                            attendance={weekAttendance}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
