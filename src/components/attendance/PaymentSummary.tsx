import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { format, isSameDay } from 'date-fns';
import { Download, Share2, LayoutGrid, LayoutList } from 'lucide-react';
import { useWeekNavigation } from '../../hooks/useWeekNavigation';
import { useFilteredWorkers } from '../../hooks/useFilteredWorkers';
import { calculateShifts } from '../../utils/attendanceUtils';
import { generateWeeklyReportPDF } from '../../utils/pdfGenerator';
import * as pdfMake from 'pdfmake/build/pdfmake';
import { WeekNav } from '../common/WeekNav';
import { PaymentDayCard, DailyFinancials } from './PaymentDayCard';
import { PaymentTable } from './PaymentTable';

interface PaymentSummaryProps {
    userRole: 'OWNER' | 'TEAM_REP';
    teamId?: string;
    siteId?: string;
    showExportButton?: boolean;
    onDownloadReady?: (downloadFn: () => void) => void;
    // Optional controlled date state
    dateRange?: {
        weekStart: Date;
        weekEnd: Date;
        weekDays: Date[];
    };
}

/**
 * Unified Payment Summary Component
 * Refactored to use new Card-based UI
 */
export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
    userRole,
    teamId,
    siteId,
    showExportButton = false,
    onDownloadReady,
    dateRange
}) => {
    const { attendance, teams, advances } = useApp();
    const [selectedTeamId, setSelectedTeamId] = useState<string>(teamId || 'ALL');
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // Update selectedTeamId if prop changes
    React.useEffect(() => {
        if (teamId) setSelectedTeamId(teamId);
    }, [teamId]);

    // Use internal hook if dateRange is not provided
    const internalNav = useWeekNavigation();

    // Determine which date state to use
    const { weekStart, weekEnd, weekDays } = dateRange || internalNav;

    // Use shared worker filtering hook
    const allWorkers = useFilteredWorkers({
        teamId: selectedTeamId === 'ALL' ? undefined : selectedTeamId
    });

    // Filter visible workers logic (kept for PDF generation and potential future use, though not directly used in new financial calcs)
    const visibleWorkers = useMemo(() => {
        return allWorkers.filter(worker => {
            const hasAnyAttendance = weekDays.some(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                return attendance.some(a =>
                    a.workerId === worker.id &&
                    a.date === dateStr &&
                    (!siteId || a.siteId === siteId)
                );
            });

            if (hasAnyAttendance) return true;

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

    // Calculate Daily Financials
    const dailyFinancials = useMemo(() => {
        return weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');

            let dailyTotal = 0;
            const roleBreakdown: Record<string, { count: number; cost: number }> = {};

            allWorkers.forEach(worker => {
                const record = attendance.find(a =>
                    a.workerId === worker.id &&
                    a.date === dateStr &&
                    (!siteId || a.siteId === siteId)
                );

                if (record) {
                    const shifts = calculateShifts(record);
                    const wage = worker.dailyWage || 0;
                    const cost = shifts * wage;

                    dailyTotal += cost;

                    // Update Breakdown
                    if (shifts > 0) {
                        const role = worker.role;
                        if (!roleBreakdown[role]) {
                            roleBreakdown[role] = { count: 0, cost: 0 };
                        }
                        roleBreakdown[role].count += shifts;
                        roleBreakdown[role].cost += cost;
                    }
                }
            });

            // Calculate daily advance and settlement
            const dayAdvances = advances
                .filter(a => {
                    const d = new Date(a.date);
                    return isSameDay(d, day) &&
                        (!selectedTeamId || selectedTeamId === 'ALL' || a.teamId === selectedTeamId) &&
                        (!siteId || a.siteId === siteId) &&
                        !a.notes?.includes('[SETTLEMENT]');
                })
                .reduce((sum, adv) => sum + adv.amount, 0);

            const daySettlements = advances
                .filter(a => {
                    const d = new Date(a.date);
                    return isSameDay(d, day) &&
                        (!selectedTeamId || selectedTeamId === 'ALL' || a.teamId === selectedTeamId) &&
                        (!siteId || a.siteId === siteId) &&
                        a.notes?.includes('[SETTLEMENT]');
                })
                .reduce((sum, adv) => sum + adv.amount, 0);

            return {
                date: day,
                dailyTotal,
                roleStats: roleBreakdown,
                advance: dayAdvances,
                settlement: daySettlements,
                totalWorkers: Object.values(roleBreakdown).reduce((sum, start) => sum + start.count, 0)
            };
        });
    }, [weekDays, allWorkers, attendance, siteId, advances, selectedTeamId]);


    // Derived totals
    const totalRoleCost = dailyFinancials.reduce((acc, curr) => acc + curr.dailyTotal, 0);
    const totalAdvance = dailyFinancials.reduce((sum, day) => sum + day.advance, 0);
    const totalSettlement = dailyFinancials.reduce((sum, day) => sum + (day.settlement || 0), 0);
    const balanceToPay = totalRoleCost - totalAdvance - totalSettlement;

    // Sorting for card view
    const sortedDailyFinancials = useMemo(() => {
        return [...dailyFinancials].sort((a, b) => {
            return sortOrder === 'newest'
                ? b.date.getTime() - a.date.getTime()
                : a.date.getTime() - b.date.getTime();
        });
    }, [dailyFinancials, sortOrder]);

    const uniqueRoles = useMemo(() => {
        const roles = new Set<string>();
        dailyFinancials.forEach(d => {
            Object.keys(d.roleStats).forEach(r => roles.add(r));
        });
        return Array.from(roles).sort();
    }, [dailyFinancials]);

    const roleTotals = useMemo(() => {
        const totals: Record<string, { count: number; cost: number }> = {};
        uniqueRoles.forEach(role => {
            totals[role] = { count: 0, cost: 0 };
            dailyFinancials.forEach(d => {
                if (d.roleStats[role]) {
                    totals[role].count += d.roleStats[role].count;
                    totals[role].cost += d.roleStats[role].cost;
                }
            });
        });
        return totals;
    }, [dailyFinancials, uniqueRoles]);

    // Helper function to generate PDF
    const generatePDF = () => {
        return generateWeeklyReportPDF(
            weekStart,
            weekEnd,
            // We pass allWorkers as visibleWorkers for now, or filter them if needed
            // The generateWeeklyReportPDF might expect a specific list.
            // Using allWorkers seems consistent with the new logic.
            allWorkers,
            attendance,
            teams,
            advances,
            siteId,
            selectedTeamId === 'ALL' ? undefined : selectedTeamId
        );
    };

    const handleDownload = () => {
        const docDefinition = generatePDF();
        const fileName = `weekly-report-${format(weekStart, 'yyyy-MM-dd')}.pdf`;
        (pdfMake as any).createPdf(docDefinition).download(fileName);
    };

    // Expose download function to parent
    React.useEffect(() => {
        if (onDownloadReady) {
            onDownloadReady(handleDownload);
        }
    }, [onDownloadReady, weekStart]);

    // WhatsApp share function (same as before)
    const handleWhatsAppShare = async () => {
        const docDefinition = generatePDF();
        const fileName = `weekly-report-${format(weekStart, 'yyyy-MM-dd')}.pdf`;
        (pdfMake as any).createPdf(docDefinition).getBlob((blob: Blob) => {
            const file = new File([blob], fileName, { type: 'application/pdf' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: 'Weekly Attendance Report',
                    text: `Shared via Thulir ERP app`,
                }).catch((error) => console.log('Sharing failed', error));
            } else {
                (pdfMake as any).createPdf(docDefinition).download(fileName);
                alert("File sharing is not supported on this browser. The PDF has been downloaded instead.");
            }
        });
    };

    // Week Label
    const weekLabel = `${format(weekStart, 'd')} – ${format(weekEnd, 'd MMM, yyyy')}`;

    return (
        <div className="space-y-4">
            <WeekNav
                label="Payment Summary"
                sub={weekLabel}
                onPrev={internalNav.handlePrevWeek}
                onNext={internalNav.handleNextWeek}
            />

            {/* Net Payable Balance */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 my-3 shadow-sm">
                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Net Payable Balance</div>
                <div className="text-3xl font-black -tracking-wide mb-3 text-gray-900">₹{balanceToPay.toLocaleString()}</div>

                <div className="flex border-t border-gray-200 pt-3">
                    {[
                        { label: "Days", val: weekDays.length.toString() },
                        { label: "Advance", val: `₹${totalAdvance.toLocaleString()}` },
                        { label: "Settlement", val: `₹${totalSettlement.toLocaleString()}` },
                    ].map(({ label, val }, i, arr) => (
                        <div key={label} className={`flex-1 text-center ${i < arr.length - 1 ? 'border-r border-gray-200' : ''}`}>
                            <div className="text-[10px] text-gray-500">{label}</div>
                            <div className="text-[13px] font-extrabold text-gray-900 mt-0.5">{val}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-2 mb-3">
                {/* Team Filter (Owner only) */}
                {userRole === 'OWNER' && !teamId && (
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="flex-1 min-w-0 p-2 border border-gray-200 rounded-xl bg-white text-xs font-bold shadow-sm"
                    >
                        <option value="ALL">All Teams</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                )}

                {/* Sort Order (Card View Only) */}
                {viewMode === 'card' && (
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                        className="flex-1 min-w-0 p-2 border border-gray-200 rounded-xl bg-white text-xs font-bold shadow-sm"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                )}

                {/* View Toggle */}
                <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm shrink-0">
                    <button
                        onClick={() => setViewMode('card')}
                        className={`w-9 h-9 flex items-center justify-center transition-colors ${viewMode === 'card' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`w-9 h-9 flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <LayoutList size={16} />
                    </button>
                </div>

                {/* Export Button */}
                {showExportButton && (
                    <button
                        onClick={handleDownload}
                        className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 shadow-sm hover:bg-gray-50 shrink-0"
                    >
                        <Download size={16} />
                    </button>
                )}
            </div>

            {/* Content */}
            {viewMode === 'card' ? (
                <div>
                    {sortedDailyFinancials.map((d, i) => (
                        <PaymentDayCard key={i} dayStat={d} uniqueRoles={uniqueRoles} />
                    ))}
                </div>
            ) : (
                <PaymentTable
                    dailyFinancials={dailyFinancials}
                    uniqueRoles={uniqueRoles}
                    roleTotals={roleTotals}
                    totalAdvance={totalAdvance}
                    totalSettlement={totalSettlement}
                />
            )}
        </div>
    );
};
