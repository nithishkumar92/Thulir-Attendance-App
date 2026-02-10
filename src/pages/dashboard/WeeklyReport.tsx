import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subWeeks, addWeeks, parseISO, isWithinInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react';
import clsx from 'clsx';
import { calculateDutyPoints } from '../../utils/wageUtils';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface WeeklyReportProps {
    teamId?: string; // Optional: If provided, confines report to this team (used by Team Rep)
    siteId?: string; // Optional: If provided, filters attendance and advances by this site
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ teamId, siteId }) => {
    const { attendance, workers, teams, currentUser, advances } = useApp();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedTeamId, setSelectedTeamId] = useState<string>(teamId || 'ALL');

    // Update selectedTeamId if prop changes
    React.useEffect(() => {
        if (teamId) setSelectedTeamId(teamId);
    }, [teamId]);

    const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });

    const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

    // Filter workers based on role and selected team
    const visibleWorkers = useMemo(() => {
        if (!currentUser) return [];
        let filtered = workers;

        // 1. Role-based restriction
        if (currentUser.role === 'TEAM_REP') {
            filtered = workers.filter(w => w.teamId === currentUser.teamId);
        } else if (currentUser.role !== 'OWNER') {
            return [];
        }

        // 2. Dropdown Filter (mostly for Owner)
        // If prop teamId is passed, selectedTeamId will be forced to it anyway
        if (selectedTeamId !== 'ALL') {
            filtered = filtered.filter(w => w.teamId === selectedTeamId);
        }

        return filtered;
    }, [currentUser, workers, selectedTeamId]);

    // ... (rest of data prep logic remains the same, assuming it depends on visibleWorkers) ...

    // --- DATA PREPARATION FOR TABLES ---

    const calculateShifts = (record: any) => {
        if (!record || record.status === 'ABSENT') return 0;

        // Use pre-calculated duty points if available (from DB)
        // Check for null/undefined explicitly as 0 is a valid number
        if (record.dutyPoints !== undefined && record.dutyPoints !== null) {
            return Number(record.dutyPoints); // Ensure number type
        }

        // Fallback: If punchInTime and punchOutTime exist, calculate using the new utility
        if (record.punchInTime && record.punchOutTime) {
            try {
                return calculateDutyPoints(new Date(record.punchInTime), new Date(record.punchOutTime));
            } catch (e) {
                console.error("Error calculating points for record:", record, e);
                return 0;
            }
        }

        // Final Fallback for manual/legacy without times: Status based
        if (record.status === 'HALF_DAY') return 0.5;
        // ONLY return 1 for PRESENT if we don't have punch times AND it's a verified completed record.
        // But for "partially completed" (punched in but not out), we should probably return 0 until finalized.
        // However, existing logic might rely on 'PRESENT' status being sufficient.
        // User request: "attendance duty should visible only when both punch in and punch out is available"
        // So, if punchInTime exists but punchOutTime does NOT, we should return 0 (or indicate pending).

        if (record.punchInTime && !record.punchOutTime) {
            return 0; // Incomplete shift
        }

        if (record.status === 'PRESENT') return 1;

        return 0;
    };

    const getShiftSymbol = (shift: number, record?: any) => {
        // If incomplete (punched in but not out), show specific symbol or just '0'/'A'? 
        // User wants duty "visible only when... available". 
        // If we returned 0 above for incomplete, it usually shows 'A'. 
        // Maybe we should show '?' or something to indicate pending? 
        // For now, let's strictly follow "visible only when both... available". 
        // If 0, it shows 'A'. But 'A' means Absent. 
        // We should distinguishing "Working" vs "Absent".

        if (record && record.punchInTime && !record.punchOutTime) {
            return '-'; // or 'In'
        }

        if (shift === 0) return 'A';
        if (shift === 0.5) return '/';
        if (shift === 1) return 'X';
        if (shift === 1.5) return 'X/';
        return shift.toString();
    };

    // 1. Attendance Data (Worker Rows)
    const reportData = useMemo(() => {
        return visibleWorkers.map(worker => {
            // Filter attendance by worker AND siteId (if provided)
            const workerAttendance = attendance.filter(a => {
                const isWorkerMatch = a.workerId === worker.id;
                const isSiteMatch = !siteId || a.siteId === siteId;
                return isWorkerMatch && isSiteMatch;
            });

            const daysData = days.map(day => {
                const record = workerAttendance.find(a => isSameDay(parseISO(a.date), day));
                const shiftCount = record ? calculateShifts(record) : 0;

                return {
                    date: day,
                    status: record ? record.status : 'ABSENT',
                    shiftCount,
                    record // Pass full record
                };
            });
            const totalPresent = daysData.reduce((sum, d) => sum + d.shiftCount, 0);
            return { worker, daysData, totalPresent };
        });
    }, [visibleWorkers, attendance, days, siteId]); // Added siteId dependency

    // 2. Financial Data (Date Rows, Role Columns)
    const uniqueRoles = useMemo(() => Array.from(new Set(visibleWorkers.map(w => w.role))).sort(), [visibleWorkers]);

    const dailyFinancials = useMemo(() => {
        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');

            // Calculate count and cost per role for this day
            const roleStats: Record<string, { count: number, cost: number }> = {};
            uniqueRoles.forEach(role => roleStats[role] = { count: 0, cost: 0 });

            visibleWorkers.forEach(worker => {
                const record = attendance.find(a =>
                    a.workerId === worker.id &&
                    a.date === dateStr &&
                    (!siteId || a.siteId === siteId) // Filter by siteId
                );
                const shiftCount = record ? calculateShifts(record) : 0;

                if (uniqueRoles.includes(worker.role)) {
                    roleStats[worker.role].count += shiftCount;
                    roleStats[worker.role].cost += (worker.dailyWage || 0) * shiftCount;
                }
            });

            // Calculate advances and settlements for this day
            // Advances are now TEAM based.
            const dayAdvances = advances
                .filter(adv => {
                    const isDateMatch = adv.date === dateStr;
                    const isTypeMatch = !adv.notes?.includes('[SETTLEMENT]');
                    const isTeamMatch = selectedTeamId === 'ALL' || adv.teamId === selectedTeamId;
                    const isSiteMatch = !siteId || adv.siteId === siteId; // Filter by siteId
                    return isDateMatch && isTypeMatch && isTeamMatch && isSiteMatch;
                })
                .reduce((sum, adv) => sum + adv.amount, 0);

            const daySettlements = advances
                .filter(adv => {
                    const isDateMatch = adv.date === dateStr;
                    const isTypeMatch = adv.notes?.includes('[SETTLEMENT]');
                    const isTeamMatch = selectedTeamId === 'ALL' || adv.teamId === selectedTeamId;
                    const isSiteMatch = !siteId || adv.siteId === siteId; // Filter by siteId
                    return isDateMatch && isTypeMatch && isTeamMatch && isSiteMatch;
                })
                .reduce((sum, adv) => sum + adv.amount, 0);

            return {
                date: day,
                roleStats,
                advance: dayAdvances,
                settlement: daySettlements
            };
        });
    }, [days, visibleWorkers, attendance, advances, uniqueRoles, selectedTeamId, siteId]); // Added siteId

    // Totals for Footer
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

    const totalAdvance = dailyFinancials.reduce((sum, day) => sum + day.advance, 0);
    const totalSettlement = dailyFinancials.reduce((sum, day) => sum + (day.settlement || 0), 0);
    const totalRoleCost = Object.values(roleTotals).reduce((sum, val) => sum + val.cost, 0);
    const balanceToPay = totalRoleCost - totalAdvance - totalSettlement;

    // State for mobile column density (3, 4, or 5 columns visible)


    const handleExportPDF = async () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text(`Weekly Attendance Report`, 14, 22);
        doc.setFontSize(10);
        doc.text(`${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`, 14, 28);

        if (selectedTeamId !== 'ALL') {
            const teamName = teams.find(t => t.id === selectedTeamId)?.name;
            doc.text(`Team: ${teamName}`, 14, 34);
        }

        // 1. Attendance Table
        const attendanceHeaders = [['Worker', 'Team', ...days.map(d => format(d, 'EEE d')), 'Total']];
        const attendanceRows = reportData.map(({ worker, daysData, totalPresent }) => {
            const teamName = teams.find(t => t.id === worker.teamId)?.name || '-';
            const dailyStatuses = daysData.map(d => getShiftSymbol(d.shiftCount, d.record));
            return [worker.name, teamName, ...dailyStatuses, totalPresent];
        });

        autoTable(doc, {
            startY: 40,
            head: attendanceHeaders,
            body: attendanceRows,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 8 },
        });

        // 2. Financial Summary
        const startY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text("Payment Summary", 14, startY);

        const financialHeaders = [['Date', 'Weekday', ...uniqueRoles, 'Advance', 'Settlement']];
        const financialRows = dailyFinancials.map(day => {
            const rolesCounts = uniqueRoles.map(role => day.roleStats[role].count || '');
            return [
                format(day.date, 'dd-MMM'),
                format(day.date, 'EEE'),
                ...rolesCounts,
                day.advance || '',
                day.settlement || ''
            ];
        });

        // Add Totals Row
        const totalRow = [
            'Total Duty', '',
            ...uniqueRoles.map(role => roleTotals[role].count),
            '', ''
        ];

        // Add Amount Row
        const amountRow = [
            'Amount', '',
            ...uniqueRoles.map(role => roleTotals[role].cost.toLocaleString()),
            totalAdvance.toLocaleString(),
            totalSettlement.toLocaleString()
        ];

        autoTable(doc, {
            startY: startY + 5,
            head: financialHeaders,
            body: [...financialRows, totalRow, amountRow],
            theme: 'striped',
            headStyles: { fillColor: [46, 125, 50] }, // Green for finances
            styles: { fontSize: 9 }
        });

        // Final Balance
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(46, 125, 50);
        doc.text(`Balance To Pay: ${balanceToPay.toLocaleString()}`, 14, finalY);

        const fileName = `weekly-report-${format(start, 'yyyy-MM-dd')}.pdf`;

        // Directly download the file
        doc.save(fileName);
    };

    const handleShareWhatsApp = async () => {
        const doc = new jsPDF();

        // -----------------------------------------------------
        // REUSE PDF GENERATION LOGIC (Refactor if possible, but duplicating for safety/speed now)
        // -----------------------------------------------------

        // Title
        doc.setFontSize(18);
        doc.text(`Weekly Attendance Report`, 14, 22);
        doc.setFontSize(10);
        doc.text(`${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`, 14, 28);

        if (selectedTeamId !== 'ALL') {
            const teamName = teams.find(t => t.id === selectedTeamId)?.name;
            doc.text(`Team: ${teamName}`, 14, 34);
        }

        // Attendance Table
        const attendanceHeaders = [['Worker', 'Team', ...days.map(d => format(d, 'EEE d')), 'Total']];
        const attendanceRows = reportData.map(({ worker, daysData, totalPresent }) => {
            const teamName = teams.find(t => t.id === worker.teamId)?.name || '-';
            const dailyStatuses = daysData.map(d => getShiftSymbol(d.shiftCount, d.record));
            return [worker.name, teamName, ...dailyStatuses, totalPresent];
        });

        autoTable(doc, {
            startY: 40,
            head: attendanceHeaders,
            body: attendanceRows,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 8 },
        });

        // Financial Summary
        const startY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text("Payment Summary", 14, startY);

        const financialHeaders = [['Date', 'Weekday', ...uniqueRoles, 'Advance', 'Settlement']];
        const financialRows = dailyFinancials.map(day => {
            const rolesCounts = uniqueRoles.map(role => day.roleStats[role].count || '');
            return [
                format(day.date, 'dd-MMM'),
                format(day.date, 'EEE'),
                ...rolesCounts,
                day.advance || '',
                day.settlement || ''
            ];
        });
        const totalRow = ['Total Duty', '', ...uniqueRoles.map(role => roleTotals[role].count), '', ''];
        const amountRow = ['Amount', '', ...uniqueRoles.map(role => roleTotals[role].cost.toLocaleString()), totalAdvance.toLocaleString(), totalSettlement.toLocaleString()];

        autoTable(doc, {
            startY: startY + 5,
            head: financialHeaders,
            body: [...financialRows, totalRow, amountRow],
            theme: 'striped',
            headStyles: { fillColor: [46, 125, 50] },
            styles: { fontSize: 9 }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(46, 125, 50);
        doc.text(`Balance To Pay: ${balanceToPay.toLocaleString()}`, 14, finalY);

        // -----------------------------------------------------
        // FILE SHARING LOGIC
        // -----------------------------------------------------
        const fileName = `weekly-report-${format(start, 'yyyy-MM-dd')}.pdf`;
        const blob = doc.output('blob');
        const file = new File([blob], fileName, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Weekly Attendance Report',
                    text: `Shared via Thulir ERP app`,
                });
            } catch (error) {
                console.log('Sharing failed', error);
            }
        } else {
            // Fallback: Download and alert
            doc.save(fileName);
            alert("File sharing is not supported on this browser. The PDF has been downloaded instead. Please open WhatsApp and attach the file manually.");
        }
    };

    return (
        <div className="p-6 space-y-8">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Weekly Attendance Report</h2>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">

                    {/* Team Filter Dropdown (Only for OWNER) */}
                    {currentUser?.role === 'OWNER' && (
                        <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            className="p-2 border rounded-lg bg-white shadow-sm text-sm min-w-[150px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        >
                            <option value="ALL">All Teams</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                    )}

                    <div className="flex items-center bg-white rounded-lg shadow-sm border p-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
                        <button onClick={handlePrevWeek} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><ChevronLeft size={20} /></button>
                        <span className="px-4 font-medium min-w-[200px] text-center">
                            {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}
                        </span>
                        <button onClick={handleNextWeek} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><ChevronRight size={20} /></button>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={handleShareWhatsApp}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg hover:bg-[#128C7E] shadow-sm transition-colors"
                        >
                            <span className="font-bold">Share PDF</span>
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm transition-colors"
                        >
                            <Download size={18} /> Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left dark:text-gray-200">
                        <thead className="bg-gray-50/50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                            <tr>
                                <th className="px-6 py-4 sticky left-0 bg-gray-50/95 backdrop-blur-sm z-10 dark:bg-gray-700">Worker</th>
                                <th className="px-6 py-4 font-medium">Team</th>
                                {days.map(day => (
                                    <th key={day.toISOString()} className="px-4 py-4 text-center min-w-[80px]">
                                        <div className="text-gray-900 font-bold dark:text-gray-100">{format(day, 'EEE')}</div>
                                        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide dark:text-gray-400">{format(day, 'd MMM')}</div>
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-center text-blue-700 bg-blue-50/30 font-bold dark:bg-blue-900/40 dark:text-blue-200">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white">
                            {reportData.map(({ worker, daysData, totalPresent }) => (
                                <tr key={worker.id} className="hover:bg-gray-50/60 transition-colors dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 font-medium sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.02)] dark:bg-gray-800 dark:border-gray-700">
                                        <div className="text-gray-900 dark:text-gray-100 font-semibold">{worker.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">{worker.role}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-medium">
                                        {teams.find(t => t.id === worker.teamId)?.name || '-'}
                                    </td>
                                    {daysData.map((data, idx) => {
                                        const symbol = getShiftSymbol(data.shiftCount, data.record);
                                        return (
                                            <td key={idx} className="px-4 py-4 text-center border-l border-gray-50/50 dark:border-gray-700">
                                                <div className={clsx(
                                                    "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs shadow-sm transition-transform hover:scale-110 cursor-default",
                                                    symbol === 'A'
                                                        ? "bg-red-50 text-red-600 ring-1 ring-red-100 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800"
                                                        : symbol === '-'
                                                            ? "bg-yellow-50 text-yellow-600 ring-1 ring-yellow-100" // Pending style
                                                            : "bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-800"
                                                )}>
                                                    {symbol}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="px-6 py-4 text-center font-bold text-blue-700 bg-blue-50/30 border-l border-blue-50 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900 tabular-nums">
                                        {totalPresent}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Financial Summary Table (Date x Role) */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">Payment Summary</h3>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        {/* Unified Table View (Scrollable on Mobile) */}
                        <div className="overflow-x-auto rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-gray-200">
                            <table
                                className="w-full text-sm text-left border-collapse"
                            >
                                <thead className="bg-gray-50/50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">
                                    <tr>
                                        <th className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-1 md:px-6 py-4 font-medium sticky left-0 bg-gray-50 z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Date</th>
                                        <th className="px-6 py-4 font-medium hidden md:table-cell">Weekday</th>
                                        {/* Role Headers */}
                                        {uniqueRoles.map(role => (
                                            <th key={role} className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-[100px] md:max-w-none px-2 md:px-6 py-4 text-right font-medium">{role}</th>
                                        ))}
                                        <th className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-4 text-right font-medium">Advance</th>
                                        <th className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-4 text-right font-medium">Settlement</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {dailyFinancials.map((dayStat, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-1 md:px-6 py-3.5 text-gray-900 font-medium tabular-nums sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap">
                                                <div className="md:hidden text-center">
                                                    <div className="text-xs font-bold">{format(dayStat.date, 'dd MMM')}</div>
                                                    <div className="text-[9px] text-gray-400 font-normal uppercase leading-none">{format(dayStat.date, 'eee')}</div>
                                                </div>
                                                <div className="hidden md:block">
                                                    {format(dayStat.date, 'dd-MM-yyyy')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-gray-500 hidden md:table-cell">{format(dayStat.date, 'EEEE')}</td>
                                            {uniqueRoles.map(role => (
                                                <td key={role} className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-3.5 text-right font-medium text-gray-700 tabular-nums">
                                                    {/* Show Count instead of Cost */}
                                                    {dayStat.roleStats[role].count > 0 ? (
                                                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                                                            {dayStat.roleStats[role].count}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            ))}
                                            <td className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-3.5 text-right font-medium tabular-nums">
                                                {dayStat.advance > 0 ? (
                                                    <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-bold">
                                                        ₹{dayStat.advance.toLocaleString()}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-3.5 text-right font-medium tabular-nums">
                                                {dayStat.settlement > 0 ? (
                                                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-bold">
                                                        ₹{dayStat.settlement.toLocaleString()}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Total Duty Row */}
                                    <tr className="bg-gray-50/50 border-t border-gray-200">
                                        <td className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-1 md:px-6 py-3.5 sticky left-0 bg-gray-50 z-10 border-r border-gray-200" colSpan={1}>
                                            <span className="font-semibold text-gray-700 uppercase text-xs tracking-wide pl-2 border-l-4 border-blue-500">Total Duty</span>
                                        </td>
                                        <td className="px-6 py-3.5 hidden md:table-cell"></td>
                                        {uniqueRoles.map(role => (
                                            <td key={role} className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-3.5 text-right font-bold text-gray-900 tabular-nums">
                                                {roleTotals[role].count}
                                            </td>
                                        ))}
                                        <td className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-3.5 bg-gray-50/30"></td>
                                        <td className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-3.5 bg-gray-50/30"></td>
                                    </tr>

                                    {/* Rate Row */}
                                    <tr className="bg-gray-50/50 border-gray-100">
                                        <td className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-1 md:px-6 py-3 sticky left-0 bg-gray-50 z-10 border-r border-gray-200" colSpan={1}>
                                            <span className="font-semibold text-gray-500 uppercase text-xs tracking-wide pl-2 border-l-4 border-transparent">Rate</span>
                                        </td>
                                        <td className="px-6 py-3 hidden md:table-cell"></td>
                                        {uniqueRoles.map(role => {
                                            const total = roleTotals[role];
                                            const rate = total.count > 0 ? (total.cost / total.count) : 0;
                                            return (
                                                <td key={role} className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-3 text-right text-gray-500 text-xs tabular-nums">
                                                    {rate > 0 ? `₹${rate.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                                                </td>
                                            );
                                        })}
                                        <td className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-3 bg-gray-50/30"></td>
                                        <td className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-3 bg-gray-50/30"></td>
                                    </tr>

                                    {/* Amount Row */}
                                    <tr className="bg-blue-50/30 border-t border-blue-100">
                                        <td className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-1 md:px-6 py-4 sticky left-0 bg-blue-50 z-10 border-r border-blue-100" colSpan={1}>
                                            <span className="font-bold text-blue-900 uppercase text-xs tracking-wide pl-2 border-l-4 border-blue-600">Total Amount</span>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell"></td>
                                        {uniqueRoles.map(role => (
                                            <td key={role} className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-4 text-right font-bold text-gray-900 tabular-nums">
                                                ₹{roleTotals[role].cost.toLocaleString()}
                                            </td>
                                        ))}
                                        <td className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-4 text-right text-red-600 font-bold tabular-nums">
                                            {totalAdvance > 0 ? `- ₹${totalAdvance.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="w-[18vw] min-w-[18vw] max-w-[18vw] md:w-auto md:min-w-0 md:max-w-none px-2 md:px-6 py-4 text-right text-green-600 font-bold tabular-nums">
                                            {totalSettlement > 0 ? `+ ₹${totalSettlement.toLocaleString()}` : '-'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Net Payable Balance - Always visible (outside scroll) */}
                        <div className="bg-gray-900 text-white p-5 flex justify-between items-center shadow-md mt-[-1px] relative z-20">
                            <span className="font-medium text-gray-300 uppercase text-xs tracking-wider">Net Payable Balance</span>
                            <span className="font-bold text-xl tabular-nums tracking-tight whitespace-nowrap">₹ {balanceToPay.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

