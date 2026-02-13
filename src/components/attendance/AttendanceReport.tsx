import React from 'react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { WorkerAttendanceCard } from '../WorkerAttendanceCard';
import { useNavigate } from 'react-router-dom';
import { useWeekNavigation } from '../../hooks/useWeekNavigation';
import { useFilteredWorkers } from '../../hooks/useFilteredWorkers';
import { filterAttendanceByDateRange, filterAttendanceBySite } from '../../utils/filterUtils';
import { calculateShifts, getShiftSymbol } from '../../utils/attendanceUtils';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

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
 * Works for both Owner Portal and Worker Portal (Team Rep)
 * Uses role-based access control to show/hide features
 */
export const AttendanceReport: React.FC<AttendanceReportProps> = ({
    userRole,
    teamId,
    siteId,
    showAddButton = false,
    onAddAttendance,
    onDownloadReady
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
    // OR workers who have any attendance record (including incomplete punches)
    const visibleWorkers = React.useMemo(() => {
        return allWorkers.filter(worker => {
            // Check if worker has ANY attendance record in the week
            const hasAnyAttendance = weekDays.some(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                return weekAttendance.some(a =>
                    a.workerId === worker.id &&
                    a.date === dateStr
                );
            });

            // If they have any attendance record, show them
            if (hasAnyAttendance) return true;

            // Otherwise, calculate total duty points
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

    // Generate PDF for Attendance Report with Payment Summary using pdfmake
    const generatePDF = () => {
        // Initialize pdfMake fonts at runtime
        if (!(pdfMake as any).vfs) {
            (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
        }

        // Prepare attendance table data
        const attendanceHeaders = ['Worker', 'Role', ...weekDays.map(d => format(d, 'EEE d')), 'Total'];

        const attendanceRows = visibleWorkers.map(worker => {
            const dailyStatuses = weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const record = weekAttendance.find(a =>
                    a.workerId === worker.id &&
                    a.date === dateStr
                );
                const shiftCount = record ? calculateShifts(record) : 0;
                return getShiftSymbol(shiftCount, record);
            });
            const totalDuty = weekDays.reduce((sum, day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const record = weekAttendance.find(a =>
                    a.workerId === worker.id &&
                    a.date === dateStr
                );
                return sum + (record ? calculateShifts(record) : 0);
            }, 0);
            return [worker.name, worker.role, ...dailyStatuses, totalDuty.toString()];
        });

        // Calculate unique roles and payment data
        const uniqueRoles = Array.from(new Set(visibleWorkers.map(w => w.role))).sort();

        const dailyFinancials = weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const roleStats: Record<string, { count: number, cost: number }> = {};
            uniqueRoles.forEach(role => roleStats[role] = { count: 0, cost: 0 });

            visibleWorkers.forEach(worker => {
                const record = weekAttendance.find(a =>
                    a.workerId === worker.id &&
                    a.date === dateStr
                );
                const shiftCount = record ? calculateShifts(record) : 0;

                if (uniqueRoles.includes(worker.role)) {
                    roleStats[worker.role].count += shiftCount;
                    roleStats[worker.role].cost += (worker.dailyWage || 0) * shiftCount;
                }
            });

            return { date: day, roleStats };
        });

        const roleTotals: Record<string, { count: number, cost: number }> = {};
        uniqueRoles.forEach(role => {
            roleTotals[role] = dailyFinancials.reduce((acc, day) => {
                const stat = day.roleStats[role] || { count: 0, cost: 0 };
                return {
                    count: acc.count + stat.count,
                    cost: acc.cost + stat.cost
                };
            }, { count: 0, cost: 0 });
        });

        const totalRoleCost = Object.values(roleTotals).reduce((sum, val) => sum + val.cost, 0);

        // Prepare payment summary table data
        const paymentHeaders = ['Date', 'Weekday', ...uniqueRoles, 'Daily Total'];
        const paymentRows = dailyFinancials.map(day => {
            const rolesCounts = uniqueRoles.map(role => (day.roleStats[role].count || '').toString());
            const dailyTotal = Object.values(day.roleStats).reduce((sum, stat) => sum + stat.cost, 0);
            return [
                format(day.date, 'dd-MMM'),
                format(day.date, 'EEE'),
                ...rolesCounts,
                dailyTotal ? `₹${dailyTotal.toLocaleString()}` : ''
            ];
        });

        const totalRow = ['Total Duty', '', ...uniqueRoles.map(role => roleTotals[role].count.toString()), ''];
        const amountRow = ['Amount', '', ...uniqueRoles.map(role => `₹${roleTotals[role].cost.toLocaleString()}`), `₹${totalRoleCost.toLocaleString()}`];

        // Create pdfmake document definition
        const docDefinition: any = {
            content: [
                { text: 'Attendance Report', style: 'header' },
                { text: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`, style: 'subheader' },
                { text: '\n' },
                {
                    table: {
                        headerRows: 1,
                        widths: Array(attendanceHeaders.length).fill('auto'),
                        body: [attendanceHeaders, ...attendanceRows]
                    },
                    layout: 'lightHorizontalLines',
                    style: 'tableStyle'
                },
                { text: '\n' },
                { text: 'Payment Summary', style: 'sectionHeader' },
                { text: '\n' },
                {
                    table: {
                        headerRows: 1,
                        widths: Array(paymentHeaders.length).fill('auto'),
                        body: [paymentHeaders, ...paymentRows, totalRow, amountRow]
                    },
                    layout: 'lightHorizontalLines',
                    style: 'tableStyle'
                },
                { text: '\n' },
                { text: `Total Amount: ₹${totalRoleCost.toLocaleString()}`, style: 'total' }
            ],
            styles: {
                header: {
                    fontSize: 18,
                    bold: true,
                    margin: [0, 0, 0, 5]
                },
                subheader: {
                    fontSize: 10,
                    margin: [0, 0, 0, 10]
                },
                sectionHeader: {
                    fontSize: 14,
                    bold: true,
                    margin: [0, 10, 0, 5]
                },
                tableStyle: {
                    fontSize: 8,
                    margin: [0, 5, 0, 15]
                },
                total: {
                    fontSize: 12,
                    bold: true,
                    color: '#2e7d32'
                }
            },
            defaultStyle: {
                font: 'Roboto'
            }
        };

        return docDefinition;
    };

    // Download PDF function
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
