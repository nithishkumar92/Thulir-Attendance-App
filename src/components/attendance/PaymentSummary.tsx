import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, Share2, LayoutGrid, LayoutList } from 'lucide-react';
import { useWeekNavigation } from '../../hooks/useWeekNavigation';
import { useFilteredWorkers } from '../../hooks/useFilteredWorkers';
import { calculateShifts } from '../../utils/attendanceUtils';

interface PaymentSummaryProps {
    userRole: 'OWNER' | 'TEAM_REP';
    teamId?: string;
    siteId?: string;
    showExportButton?: boolean;
}

/**
 * Unified Payment Summary Component
 * Works for both Owner Portal and Worker Portal (Team Rep)
 * Uses role-based access control to show/hide features
 * Supports both Card View (mobile-friendly) and Table View
 */
export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
    userRole,
    teamId,
    siteId,
    showExportButton = false
}) => {
    const { attendance, teams, advances } = useApp();
    const [selectedTeamId, setSelectedTeamId] = useState<string>(teamId || 'ALL');
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card'); // Default to card view

    // Update selectedTeamId if prop changes
    React.useEffect(() => {
        if (teamId) setSelectedTeamId(teamId);
    }, [teamId]);

    // Use shared week navigation hook
    const { weekStart, weekEnd, weekDays, handlePrevWeek, handleNextWeek } = useWeekNavigation();

    // Use shared worker filtering hook
    const visibleWorkers = useFilteredWorkers({
        teamId: selectedTeamId === 'ALL' ? undefined : selectedTeamId
    });

    const uniqueRoles = useMemo(
        () => Array.from(new Set(visibleWorkers.map(w => w.role))).sort(),
        [visibleWorkers]
    );

    const dailyFinancials = useMemo(() => {
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

    // Download PDF function
    const handleDownload = () => {
        // TODO: Implement PDF generation
        alert('Download PDF functionality will be implemented');
    };

    // WhatsApp share function
    const handleWhatsAppShare = () => {
        const message = `*Payment Summary*\n${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}\n\nNet Payable Balance: ₹${balanceToPay.toLocaleString()}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="space-y-4">
            {/* Header Controls */}
            <div className="flex flex-col gap-3">
                {/* Week Navigation */}
                <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-2">
                    <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 rounded transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1 text-center">
                        <div className="font-bold text-gray-800 text-sm">Payment Summary</div>
                        <div className="text-xs text-gray-600">
                            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                        </div>
                    </div>
                    <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Controls Row */}
                <div className="flex items-center gap-2">
                    {/* Team Filter (Owner only) */}
                    {userRole === 'OWNER' && !teamId && (
                        <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            className="flex-1 p-2 border rounded-lg bg-white shadow-sm text-sm"
                        >
                            <option value="ALL">All Teams</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                    )}

                    {/* View Toggle */}
                    <div className="flex bg-white border rounded-lg shadow-sm overflow-hidden">
                        <button
                            onClick={() => setViewMode('card')}
                            className={`p-2 transition-colors ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                            title="Card View"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                            title="Table View"
                        >
                            <LayoutList size={20} />
                        </button>
                    </div>

                    {/* Export Buttons */}
                    {showExportButton && (
                        <>
                            <button
                                onClick={handleDownload}
                                className="p-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                                title="Download PDF"
                            >
                                <Download size={20} className="text-gray-700" />
                            </button>
                            <button
                                onClick={handleWhatsAppShare}
                                className="p-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors"
                                title="Share on WhatsApp"
                            >
                                <Share2 size={20} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Net Payable Balance - Always visible at top */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-5 rounded-xl shadow-lg">
                <div className="text-xs font-medium uppercase tracking-wider opacity-90 mb-1">Net Payable Balance</div>
                <div className="text-3xl font-bold">₹{balanceToPay.toLocaleString()}</div>
            </div>

            {/* Card View */}
            {viewMode === 'card' && (
                <div className="space-y-3">
                    {dailyFinancials.map((dayStat, idx) => {
                        const hasData = dayStat.totalWorkers > 0 || dayStat.advance > 0 || dayStat.settlement > 0;

                        return (
                            <div key={idx} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                {/* Date Header */}
                                <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-sm">{format(dayStat.date, 'MMM d (EEE)')}</div>
                                    </div>
                                    {!hasData && (
                                        <div className="flex items-center gap-1 text-xs opacity-90">
                                            <span>No Duties Recorded</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Content */}
                                {hasData ? (
                                    <div className="p-4 space-y-3">
                                        {/* Role Stats */}
                                        {uniqueRoles.map(role => {
                                            const stat = dayStat.roleStats[role];
                                            if (stat.count === 0) return null;

                                            return (
                                                <div key={role} className="flex justify-between items-center">
                                                    <div className="text-sm text-gray-700">
                                                        <span className="font-medium">{stat.count}</span> {role}
                                                        <span className="text-xs text-gray-500 ml-1">
                                                            (₹{(stat.cost / stat.count).toLocaleString(undefined, { maximumFractionDigits: 0 })})
                                                        </span>
                                                    </div>
                                                    <div className="font-bold text-gray-900">
                                                        ₹{stat.cost.toLocaleString()}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Summary Line */}
                                        <div className="pt-2 border-t border-gray-200">
                                            <div className="text-xs text-gray-600 mb-1">
                                                Total Workers: {dayStat.totalWorkers} | Daily Total: ₹{dayStat.dailyTotal.toLocaleString()}
                                            </div>
                                        </div>

                                        {/* Advances & Settlements */}
                                        {(dayStat.advance > 0 || dayStat.settlement > 0) && (
                                            <div className="pt-2 border-t border-gray-200 space-y-1">
                                                {dayStat.advance > 0 && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-red-600">Advance</span>
                                                        <span className="font-bold text-red-600">- ₹{dayStat.advance.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {dayStat.settlement > 0 && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-green-600">Settlement</span>
                                                        <span className="font-bold text-green-600">+ ₹{dayStat.settlement.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-gray-400 text-sm">
                                        No attendance recorded
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-gray-200">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-gray-50/50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium sticky left-0 bg-gray-50 z-10 border-r border-gray-200">Date</th>
                                    <th className="px-6 py-4 font-medium hidden md:table-cell">Weekday</th>
                                    {uniqueRoles.map(role => (
                                        <th key={role} className="px-6 py-4 text-right font-medium">{role}</th>
                                    ))}
                                    <th className="px-6 py-4 text-right font-medium">Advance</th>
                                    <th className="px-6 py-4 text-right font-medium">Settlement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {dailyFinancials.map((dayStat, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-3.5 text-gray-900 font-medium sticky left-0 bg-white z-10 border-r border-gray-100">
                                            {format(dayStat.date, 'dd-MM-yyyy')}
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-500 hidden md:table-cell">{format(dayStat.date, 'EEEE')}</td>
                                        {uniqueRoles.map(role => (
                                            <td key={role} className="px-6 py-3.5 text-right font-medium text-gray-700">
                                                {dayStat.roleStats[role].count > 0 ? (
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                                                        {dayStat.roleStats[role].count}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        ))}
                                        <td className="px-6 py-3.5 text-right font-medium">
                                            {dayStat.advance > 0 ? (
                                                <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-bold">
                                                    ₹{dayStat.advance.toLocaleString()}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-3.5 text-right font-medium">
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
                                    <td className="px-6 py-3.5 sticky left-0 bg-gray-50 z-10 border-r border-gray-200" colSpan={1}>
                                        <span className="font-semibold text-gray-700 uppercase text-xs tracking-wide pl-2 border-l-4 border-blue-500">Total Duty</span>
                                    </td>
                                    <td className="px-6 py-3.5 hidden md:table-cell"></td>
                                    {uniqueRoles.map(role => (
                                        <td key={role} className="px-6 py-3.5 text-right font-bold text-gray-900">
                                            {roleTotals[role].count}
                                        </td>
                                    ))}
                                    <td className="px-6 py-3.5"></td>
                                    <td className="px-6 py-3.5"></td>
                                </tr>

                                {/* Rate Row */}
                                <tr className="bg-gray-50/50">
                                    <td className="px-6 py-3 sticky left-0 bg-gray-50 z-10 border-r border-gray-200" colSpan={1}>
                                        <span className="font-semibold text-gray-500 uppercase text-xs tracking-wide pl-2">Rate</span>
                                    </td>
                                    <td className="px-6 py-3 hidden md:table-cell"></td>
                                    {uniqueRoles.map(role => {
                                        const total = roleTotals[role];
                                        const rate = total.count > 0 ? (total.cost / total.count) : 0;
                                        return (
                                            <td key={role} className="px-6 py-3 text-right text-gray-500 text-xs">
                                                {rate > 0 ? `₹${rate.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="px-6 py-3"></td>
                                    <td className="px-6 py-3"></td>
                                </tr>

                                {/* Amount Row */}
                                <tr className="bg-blue-50/30 border-t border-blue-100">
                                    <td className="px-6 py-4 sticky left-0 bg-blue-50 z-10 border-r border-blue-100" colSpan={1}>
                                        <span className="font-bold text-blue-900 uppercase text-xs tracking-wide pl-2 border-l-4 border-blue-600">Total Amount</span>
                                    </td>
                                    <td className="px-6 py-4 hidden md:table-cell"></td>
                                    {uniqueRoles.map(role => (
                                        <td key={role} className="px-6 py-4 text-right font-bold text-gray-900">
                                            ₹{roleTotals[role].cost.toLocaleString()}
                                        </td>
                                    ))}
                                    <td className="px-6 py-4 text-right text-red-600 font-bold">
                                        {totalAdvance > 0 ? `- ₹${totalAdvance.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-green-600 font-bold">
                                        {totalSettlement > 0 ? `+ ₹${totalSettlement.toLocaleString()}` : '-'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
