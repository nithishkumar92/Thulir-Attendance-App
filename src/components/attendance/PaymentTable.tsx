import React from 'react';
import { format } from 'date-fns';
import { DailyFinancials } from './PaymentDayCard';

interface PaymentTableProps {
    dailyFinancials: DailyFinancials[];
    uniqueRoles: string[];
    roleTotals: Record<string, { count: number; cost: number }>;
    totalAdvance: number;
    totalSettlement: number;
}

export const PaymentTable: React.FC<PaymentTableProps> = ({
    dailyFinancials,
    uniqueRoles,
    roleTotals,
    totalAdvance,
    totalSettlement
}) => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3.5 py-2.5 text-left font-bold text-gray-600 whitespace-nowrap sticky left-0 bg-gray-50 z-10 border-r border-gray-200">Date</th>
                            {uniqueRoles.map(r => (
                                <th key={r} className="px-2.5 py-2.5 text-right font-bold text-gray-600 whitespace-nowrap">{r}</th>
                            ))}
                            <th className="px-3.5 py-2.5 text-right font-bold text-gray-600">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dailyFinancials.map((d, i) => (
                            <tr key={i} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                                <td className="px-3.5 py-2.5 font-bold text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                    {format(d.date, 'MMM d')} <span className="text-[10px] text-gray-400 font-normal ml-1">({format(d.date, 'EEE')})</span>
                                </td>
                                {uniqueRoles.map(role => {
                                    const stat = d.roleStats[role];
                                    return (
                                        <td key={role} className={`px-2.5 py-2.5 text-right ${stat?.count ? "font-bold text-gray-900" : "text-gray-300 font-normal"}`}>
                                            {stat?.count || "—"}
                                        </td>
                                    );
                                })}
                                <td className={`px-3.5 py-2.5 text-right font-black ${d.dailyTotal > 0 ? "text-gray-900" : "text-gray-300"}`}>
                                    {d.dailyTotal > 0 ? `₹${d.dailyTotal.toLocaleString()}` : "—"}
                                </td>
                            </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-gray-900 text-white">
                            <td className="px-3.5 py-2.5 font-extrabold sticky left-0 bg-gray-900 z-10 border-r border-gray-700">TOTAL</td>
                            {uniqueRoles.map(role => (
                                <td key={role} className="px-2.5 py-2.5 text-right font-extrabold">
                                    {roleTotals[role]?.count || 0}
                                </td>
                            ))}
                            <td className="px-3.5 py-2.5 text-right font-black text-sm">
                                ₹{dailyFinancials.reduce((s, d) => s + d.dailyTotal, 0).toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
