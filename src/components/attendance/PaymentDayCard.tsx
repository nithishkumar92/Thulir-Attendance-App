import React from 'react';
import { format } from 'date-fns';

export interface DailyFinancials {
    date: Date;
    roleStats: Record<string, { count: number; cost: number }>;
    advance: number;
    settlement: number;
    totalWorkers: number;
    dailyTotal: number;
}

interface PaymentDayCardProps {
    dayStat: DailyFinancials;
    uniqueRoles: string[];
}

export const PaymentDayCard: React.FC<PaymentDayCardProps> = ({ dayStat, uniqueRoles }) => {
    const hasData = dayStat.totalWorkers > 0 || dayStat.advance > 0 || dayStat.settlement > 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-3">
            {/* Date Header */}
            <div className="bg-gray-900 text-white px-3.5 py-2.5 flex items-center justify-between">
                <div>
                    <span className="text-[13px] font-extrabold">{format(dayStat.date, 'MMM d')}</span>
                    <span className="text-[11px] text-gray-400 ml-2 font-medium">({format(dayStat.date, 'EEE')})</span>
                </div>
                {hasData && (
                    <span className="text-[13px] font-extrabold">₹{dayStat.dailyTotal.toLocaleString()}</span>
                )}
            </div>

            {hasData ? (
                <div>
                    {/* Role Stats */}
                    {uniqueRoles.map(role => {
                        const stat = dayStat.roleStats[role];
                        if (!stat || stat.count === 0) return null;

                        return (
                            <div key={role} className="flex justify-between items-center px-3.5 py-2.5 border-b border-gray-50 last:border-b-0">
                                <div>
                                    <span className="text-[13px] font-bold text-gray-900">{stat.count} {role}</span>
                                    <span className="text-[11px] text-gray-400 ml-1.5">
                                        @ ₹{(stat.cost / stat.count).toLocaleString()}
                                    </span>
                                </div>
                                <span className="text-[15px] font-black text-gray-900">
                                    ₹{stat.cost.toLocaleString()}
                                </span>
                            </div>
                        );
                    })}

                    {/* Summary Footer */}
                    <div className="bg-gray-50 px-3.5 py-2.5 flex justify-between items-center border-t border-gray-100">
                        <span className="text-[11px] text-gray-500 font-medium">{dayStat.totalWorkers} workers</span>
                        <div className="text-[11px] text-gray-500">
                            Daily: <b className="text-gray-900">₹{dayStat.dailyTotal.toLocaleString()}</b>
                        </div>
                    </div>

                    {/* Advances & Settlements */}
                    {(dayStat.advance > 0 || dayStat.settlement > 0) && (
                        <div className="px-3.5 py-2.5 border-t border-gray-100 bg-white">
                            {dayStat.advance > 0 && (
                                <div className="flex justify-between items-center mb-1 last:mb-0">
                                    <span className="text-xs font-semibold text-red-600">Advance</span>
                                    <span className="text-xs font-extrabold text-red-600">-₹{dayStat.advance.toLocaleString()}</span>
                                </div>
                            )}
                            {dayStat.settlement > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-green-600">Settlement</span>
                                    <span className="text-xs font-extrabold text-green-600">+₹{dayStat.settlement.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-3.5 text-center text-gray-400 text-xs py-5">
                    No attendance recorded
                </div>
            )}
        </div>
    );
};
