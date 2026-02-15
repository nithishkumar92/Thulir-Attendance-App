import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
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
    onDownloadReady
}) => {
    const { attendance, teams, advances } = useApp();
    const [selectedTeamId, setSelectedTeamId] = useState<string>(teamId || 'ALL');
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

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

    // Filter visible workers logic
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

    const uniqueRoles = useMemo(
        () => Array.from(new Set(visibleWorkers.map(w => w.role))).sort(),
        [visibleWorkers]
    );

    const dailyFinancials: DailyFinancials[] = useMemo(() => {
        return weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');

            const roleStats: Record<string, { count: number, cost: number }> = {};
            uniqueRoles.forEach(role => roleStats[role] = { count: 0, cost: 0 });

            visibleWorkers.forEach(worker => {
                const record = attendance.find(a =>
                    a.workerId === worker.id &&
                    a.date === dateStr &&
                    (!siteId || a.siteId === siteId)
                );
                const shiftCount = record ? calculateShifts(record) : 0;

                if (uniqueRoles.includes(worker.role)) {
                    roleStats[worker.role].count += shiftCount;
                    roleStats[worker.role].cost += (worker.dailyWage || 0) * shiftCount;
                }
            });

            const dayAdvances = advances
                .filter(adv => {
                    const isDateMatch = adv.date === dateStr;
                    const isTypeMatch = !adv.notes?.includes('[SETTLEMENT]');
                    const isTeamMatch = selectedTeamId === 'ALL' || adv.teamId === selectedTeamId;
                    const isSiteMatch = !siteId || adv.siteId === siteId;
                    return isDateMatch && isTypeMatch && isTeamMatch && isSiteMatch;
                })
                .reduce((sum, adv) => sum + adv.amount, 0);

            const daySettlements = advances
                .filter(adv => {
                    const isDateMatch = adv.date === dateStr;
                    const isTypeMatch = adv.notes?.includes('[SETTLEMENT]');
                    const isTeamMatch = selectedTeamId === 'ALL' || adv.teamId === selectedTeamId;
                    const isSiteMatch = !siteId || adv.siteId === siteId;
                    return isDateMatch && isTypeMatch && isTeamMatch && isSiteMatch;
                })
                .reduce((sum, adv) => sum + adv.amount, 0);

            const totalWorkers = Object.values(roleStats).reduce((sum, stat) => sum + stat.count, 0);
            const dailyTotal = Object.values(roleStats).reduce((sum, stat) => sum + stat.cost, 0);

            return {
                date: day,
                roleStats,
                advance: dayAdvances,
                settlement: daySettlements,
                totalWorkers,
                dailyTotal
            };
        });
    }, [weekDays, visibleWorkers, attendance, advances, uniqueRoles, selectedTeamId, siteId]);

    // Sort daily financials based on sort order (for card view)
    const sortedDailyFinancials = useMemo(() => {
        if (viewMode === 'table') return dailyFinancials;
        return sortOrder === 'newest'
            ? [...dailyFinancials].reverse()
            : dailyFinancials;
    }, [dailyFinancials, sortOrder, viewMode]);

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

    // Helper function to generate PDF
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
                onPrev={handlePrevWeek}
                onNext={handleNextWeek}
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
