import React from 'react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { WorkerReportCard } from './WorkerReportCardNew';
import { WeekNav } from '../common/WeekNav';
import { useNavigate } from 'react-router-dom';
import { useWeekNavigation } from '../../hooks/useWeekNavigation';
import { useFilteredWorkers } from '../../hooks/useFilteredWorkers';
import { filterAttendanceByDateRange, filterAttendanceBySite } from '../../utils/filterUtils';
import { calculateShifts } from '../../utils/attendanceUtils';
import { generateWeeklyReportPDF } from '../../utils/pdfGenerator';
import * as pdfMake from 'pdfmake/build/pdfmake';

interface AttendanceReportProps {
    userRole: 'OWNER' | 'TEAM_REP';
    teamId?: string;
    siteId?: string;
    showAddButton?: boolean;
    onAddAttendance?: () => void;
    onDownloadReady?: (downloadFn: () => void) => void;
}

/**
 * Unified Attendance Report Component
 * Refactored to use new Card-based UI
 */
export const AttendanceReport: React.FC<AttendanceReportProps> = ({
    userRole,
    teamId,
    siteId,
    showAddButton = false,
    onAddAttendance,
    onDownloadReady
}) => {
    const { attendance, teams, advances } = useApp();
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

    // Filter visible workers logic (same as before)
    const visibleWorkers = React.useMemo(() => {
        return allWorkers.filter(worker => {
            const hasAnyAttendance = weekDays.some(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                return weekAttendance.some(a =>
                    a.workerId === worker.id &&
                    a.date === dateStr
                );
            });

            if (hasAnyAttendance) return true;

            const totalDuty = weekDays.reduce((sum, day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const record = weekAttendance.find(a =>
                    a.workerId === worker.id &&
                    a.date === dateStr
                );
                return sum + (record ? calculateShifts(record) : 0);
            }, 0);

            return totalDuty >= 0.5;
        });
    }, [allWorkers, weekDays, weekAttendance]);

    // Calculate Summary Stats
    const totalWorkers = visibleWorkers.length;
    const totalDutyDays = visibleWorkers.reduce((sum, worker) => {
        return sum + weekDays.reduce((dSum, day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = weekAttendance.find(a => a.workerId === worker.id && a.date === dateStr);
            return dSum + (record ? calculateShifts(record) : 0);
        }, 0);
    }, 0);
    const totalEarned = visibleWorkers.reduce((sum, worker) => {
        const workerDuty = weekDays.reduce((dSum, day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = weekAttendance.find(a => a.workerId === worker.id && a.date === dateStr);
            return dSum + (record ? calculateShifts(record) : 0);
        }, 0);
        return sum + (workerDuty * (worker.dailyWage || 0));
    }, 0);


    const handleAddClick = () => {
        if (onAddAttendance) {
            onAddAttendance();
        } else {
            navigate('/add-attendance');
        }
    };

    // Generate PDF for Attendance Report  (same as before)
    const generatePDF = () => {
        return generateWeeklyReportPDF(
            weekStart,
            weekEnd,
            visibleWorkers,
            attendance,
            teams,
            advances,
            siteId,
            selectedTeamId
        );
    };

    const handleDownload = () => {
        const docDefinition = generatePDF();
        const fileName = `attendance-report-${format(weekStart, 'yyyy-MM-dd')}.pdf`;
        (pdfMake as any).createPdf(docDefinition).download(fileName);
    };

    // Expose download function to parent
    React.useEffect(() => {
        if (onDownloadReady) {
            onDownloadReady(handleDownload);
        }
    }, [onDownloadReady, weekStart, visibleWorkers, weekAttendance]);

    // Week Label
    const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;


    return (
        <div className="space-y-4">
            <WeekNav
                label={weekLabel}
                sub="Weekly Attendance"
                onPrev={handlePrevWeek}
                onNext={handleNextWeek}
            />

            {/* Summary Strip */}
            <div className="grid grid-cols-3 gap-2 my-3">
                {[
                    { label: "Workers", val: totalWorkers, color: "text-gray-900" },
                    { label: "Duty Days", val: totalDutyDays, color: "text-gray-900" },
                    { label: "Earned", val: `₹${(totalEarned / 1000).toFixed(1)}k`, color: "text-green-600" },
                ].map(({ label, val, color }) => (
                    <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
                        <div className={`text-lg font-black ${color}`}>{val}</div>
                        <div className="text-[9px] text-gray-400 mt-1 font-bold uppercase tracking-wider">{label}</div>
                    </div>
                ))}
            </div>

            {/* Team Filter (Owner only) */}
            {userRole === 'OWNER' && !teamId && (
                <div className="bg-white p-2 border rounded-xl shadow-sm mb-3">
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="w-full p-2 border-none bg-transparent text-sm font-semibold focus:ring-0"
                    >
                        <option value="ALL">All Teams</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Add Attendance Button */}
            {showAddButton && userRole === 'OWNER' && (
                <button
                    onClick={handleAddClick}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm mb-4 text-sm"
                >
                    <Plus size={18} />
                    Add Attendance
                </button>
            )}

            {/* Day Header Legend */}
            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 mb-2 grid grid-cols-[auto_1fr] gap-3">
                <div className="w-10"></div> {/* Spacer for Avatar */}
                <div className="grid grid-cols-7 gap-1.5">
                    {weekDays.map((d, i) => (
                        <div key={i} className="text-center text-[10px] font-bold text-gray-400">{format(d, 'EEEEE')}</div>
                    ))}
                </div>
            </div>

            {/* Worker List */}
            <div>
                {visibleWorkers.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-300 text-sm">
                        No workers found
                    </div>
                ) : (
                    visibleWorkers.map(worker => (
                        <WorkerReportCard
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
