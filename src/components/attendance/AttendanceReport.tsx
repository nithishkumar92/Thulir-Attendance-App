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
    // Optional controlled date state (if provided, internal nav is disabled)
    dateRange?: {
        weekStart: Date;
        weekEnd: Date;
        weekDays: Date[];
    };
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
    onDownloadReady,
    dateRange
}) => {
    const { attendance, teams, advances } = useApp();
    const navigate = useNavigate();

    // Use internal hook if dateRange prop is not provided
    const internalNav = useWeekNavigation();

    // Determine which date state to use
    const { weekStart, weekEnd, weekDays } = dateRange || internalNav;

    // Use shared worker filtering hook
    const allWorkers = useFilteredWorkers({
        teamId: teamId === 'ALL' ? undefined : teamId
    });

    // Determine visible workers: only include those with at least 0.5 total duty this week
    const visibleWorkers = React.useMemo(() => {
        return allWorkers.filter(worker => {
            const totalDuty = weekDays.reduce((sum, day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const record = attendance.find(a =>
                    a.workerId === worker.id &&
                    a.date === dateStr &&
                    (!siteId || a.siteId === siteId)
                );
                return sum + (record ? calculateShifts(record) : 0);
            }, 0);
            return totalDuty >= 0.5;
        });
    }, [allWorkers, weekDays, attendance, siteId]);

    // Calculate summary stats
    const totalWorkers = visibleWorkers.length;

    const totalDutyDays = visibleWorkers.reduce((sum, worker) => {
        return sum + weekDays.reduce((dSum, day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = attendance.find(a =>
                a.workerId === worker.id &&
                a.date === dateStr &&
                (!siteId || a.siteId === siteId) // Filter attendance by site if selected
            );
            return dSum + (record ? calculateShifts(record) : 0);
        }, 0);
    }, 0);

    const totalEarned = visibleWorkers.reduce((sum, worker) => {
        const workerDuty = weekDays.reduce((dSum, day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = attendance.find(a =>
                a.workerId === worker.id &&
                a.date === dateStr &&
                (!siteId || a.siteId === siteId)
            );
            return dSum + (record ? calculateShifts(record) : 0);
        }, 0);
        return sum + (workerDuty * (worker.dailyWage || 0));
    }, 0);

    // Prepare data for PDF
    const weekAttendance = attendance.filter(a => {
        const date = new Date(a.date);
        return date >= weekStart && date <= weekEnd && (!siteId || a.siteId === siteId);
    });


    const handleAddClick = () => {
        if (onAddAttendance) {
            onAddAttendance();
        } else {
            navigate('/add-attendance');
        }
    };

    // Generate PDF for Attendance Report
    const generatePDF = () => {
        return generateWeeklyReportPDF(
            weekStart,
            weekEnd,
            visibleWorkers,
            attendance,
            teams,
            advances,
            siteId,
            teamId
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
            {/* Show internal WeekNav ONLY if dateRange is NOT provided (Uncontrolled mode) */}
            {!dateRange && (
                <WeekNav
                    label={weekLabel}
                    sub="Weekly Attendance"
                    onPrev={internalNav.handlePrevWeek}
                    onNext={internalNav.handleNextWeek}
                />
            )}

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
