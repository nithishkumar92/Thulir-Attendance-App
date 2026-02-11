import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
 */
export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
    userRole,
    teamId,
    siteId,
    showExportButton = false
}) => {
    const { attendance, teams, advances } = useApp();
    const [selectedTeamId, setSelectedTeamId] = useState<string>(teamId || 'ALL');

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

            return {
                date: day,
                roleStats,
                advance: dayAdvances,
                settlement: daySettlements
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

    return (
        <div className="space-y-4">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Team Filter (Owner only) */}
                {userRole === 'OWNER' && !teamId && (
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="p-2 border rounded-lg bg-white shadow-sm text-sm min-w-[150px]"
                    >
                        <option value="ALL">All Teams</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                )}

                {/* Week Navigation */}
                <div className="flex items-center bg-white rounded-lg shadow-sm border p-1">
                    <button onClick={handlePrevWeek} className="p-1 hover:bg-gray-100 rounded">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="px-4 font-medium min-w-[200px] text-center">
                        {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                    </span>
                    <button onClick={handleNextWeek} className="p-1 hover:bg-gray-100 rounded">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Payment Summary Table */}
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

                {/* Net Balance */}
                <div className="bg-gray-900 text-white p-5 flex justify-between items-center">
                    <span className="font-medium text-gray-300 uppercase text-xs tracking-wider">Net Payable Balance</span>
                    <span className="font-bold text-xl">₹ {balanceToPay.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};
