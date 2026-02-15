import React, { useState } from 'react';
import { Avatar } from '../common/Avatar';
import { StatusChip, StatusLegend } from '../common/StatusChip';
import { format } from 'date-fns';
import { Worker } from '../../types';
import { AttendanceRecord } from '../../types';
import { calculateShifts, getShiftSymbol } from '../../utils/attendanceUtils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface WorkerReportCardProps {
    worker: Worker;
    weekDays: Date[];
    attendance: AttendanceRecord[];
}

export const WorkerReportCard: React.FC<WorkerReportCardProps> = ({ worker, weekDays, attendance }) => {
    const [expanded, setExpanded] = useState(false);

    // Calculate stats for the week
    const dayStatuses = weekDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const record = attendance.find(a => a.workerId === worker.id && a.date === dateStr);
        const shifts = record ? calculateShifts(record) : 0;

        let status = "-";
        if (record) {
            status = getShiftSymbol(shifts, record);
        }

        return { day: format(day, 'EEEEE'), status };
    });

    // Calculate Total Duty (sum of shifts)
    const totalDuty = weekDays.reduce((sum, day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const record = attendance.find(a => a.workerId === worker.id && a.date === dateStr);
        return sum + (record ? calculateShifts(record) : 0);
    }, 0);

    const earned = totalDuty * (worker.dailyWage || 0);

    return (
        <div className="bg-white border border-gray-200 rounded-xl mb-1.5 overflow-hidden shadow-sm">
            {/* Header Row - Compact */}
            <div
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
            >
                <Avatar name={worker.name} photoUrl={worker.photoUrl} size={36} />

                <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">{worker.name}</div>
                    <div className="text-[10px] font-semibold text-gray-400 truncate mt-0.5">
                        {worker.role}
                    </div>
                </div>

                <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-black ${earned > 0 ? "text-gray-900" : "text-gray-300"}`}>
                        {earned > 0 ? `₹${earned.toLocaleString()}` : "₹0"}
                    </div>
                    <div className="text-[9px] text-gray-400 mt-0.5 font-bold">
                        {totalDuty} days
                    </div>
                </div>

                <div className="text-gray-300 ml-0.5">
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t border-gray-100 bg-gray-50/30">
                    <div className="grid grid-cols-7 gap-1 p-2">
                        {weekDays.map((date, i) => (
                            <div key={i} className="text-center">
                                <div className="text-[9px] text-gray-400 font-bold mb-1 uppercase">
                                    {format(date, 'EEE')}
                                </div>
                                <StatusChip status={dayStatuses[i].status} />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center px-3 py-2 border-t border-gray-100">
                        <StatusLegend />
                        <div className="text-[10px] font-extrabold text-gray-900 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-gray-200">
                            Duty: {totalDuty}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
