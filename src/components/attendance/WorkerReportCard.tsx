import React, { useState } from 'react';
import { Avatar } from '../common/Avatar';
import { StatusChip, StatusLegend, DayStatus } from '../common/StatusChip';
import { format } from 'date-fns';
import { Worker } from '../../types';
import { AttendanceRecord } from '../../types'; // Ensure you have this type or define it
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

        let status: DayStatus = "-";
        if (record) {
            const shifts = calculateShifts(record);
            if (shifts === 1) status = "P";
            else if (shifts === 0.5) status = "H";
            else if (record.status === 'ABSENT') status = "A";
        }
        return { day: format(day, 'EEEEE'), status }; // EEEEE gives narrow day (S, M, T...)
    });

    const presentCount = dayStatuses.filter(d => d.status === "P").length;
    const halfCount = dayStatuses.filter(d => d.status === "H").length;
    const absentCount = dayStatuses.filter(d => d.status === "A").length;

    const totalDuty = dayStatuses.reduce((sum, d) => {
        if (d.status === "P") return sum + 1;
        if (d.status === "H") return sum + 0.5;
        return sum;
    }, 0);

    const earned = totalDuty * (worker.dailyWage || 0);

    return (
        <div className="bg-white border border-gray-200 rounded-2xl mb-2 overflow-hidden shadow-sm">
            {/* Header Row */}
            <div
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
            >
                <Avatar name={worker.name} photoUrl={worker.photoUrl} size={40} />

                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{worker.name}</div>
                    <div className="flex gap-2 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                            P:{presentCount + halfCount}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                            A:{absentCount}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400 py-0.5 truncate">
                            {worker.role}
                        </span>
                    </div>
                </div>

                <div className="text-right flex-shrink-0">
                    <div className={`text-[15px] font-black ${earned > 0 ? "text-gray-900" : "text-gray-300"}`}>
                        {earned > 0 ? `₹${earned.toLocaleString()}` : "₹0"}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
                        {totalDuty} days
                    </div>
                </div>

                <div className="text-gray-300 ml-1">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t border-gray-100 bg-gray-50/30">
                    <div className="grid grid-cols-7 gap-1.5 p-3">
                        {weekDays.map((date, i) => (
                            <div key={i} className="text-center">
                                <div className="text-[10px] text-gray-400 font-bold mb-1.5 uppercase">
                                    {format(date, 'EEE')}
                                </div>
                                <StatusChip status={dayStatuses[i].status} />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center px-3.5 pb-3 pt-2 border-t border-gray-100">
                        <StatusLegend />
                        <div className="text-[11px] font-extrabold text-gray-900 whitespace-nowrap bg-white px-2 py-1 rounded border border-gray-200">
                            Duty: {totalDuty}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
