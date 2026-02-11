import React from 'react';
import { Worker, AttendanceRecord } from '../types';
import { format, isSameDay, parseISO } from 'date-fns';
import clsx from 'clsx';
import { calculateDutyPoints } from '../utils/wageUtils';

interface WorkerAttendanceCardProps {
    worker: Worker;
    weekDays: Date[];
    attendance: AttendanceRecord[];
}

export const WorkerAttendanceCard: React.FC<WorkerAttendanceCardProps> = ({ worker, weekDays, attendance }) => {
    // Calculate duty points helper
    const calculateShifts = (record: any) => {
        if (!record || record.status === 'ABSENT') return 0;
        if (record.dutyPoints !== undefined && record.dutyPoints !== null) {
            return Number(record.dutyPoints);
        }
        if (record.punchInTime && record.punchOutTime) {
            try {
                return calculateDutyPoints(new Date(record.punchInTime), new Date(record.punchOutTime));
            } catch (e) {
                return 0;
            }
        }
        if (record.status === 'HALF_DAY') return 0.5;
        if (record.punchInTime && !record.punchOutTime) return 0; // Incomplete
        if (record.status === 'PRESENT') return 1;
        return 0;
    };

    // Get symbol for duty points
    const getShiftSymbol = (shift: number, record?: any) => {
        if (record && record.punchInTime && !record.punchOutTime) {
            return '-'; // Pending
        }
        if (shift === 0) return 'A';
        if (shift === 0.5) return '/';
        if (shift === 1) return 'X';
        if (shift === 1.5) return 'X/';
        return shift.toString();
    };

    // Calculate attendance for each day
    const dailyAttendance = weekDays.map(day => {
        const record = attendance.find(a =>
            a.workerId === worker.id &&
            isSameDay(parseISO(a.date), day)
        );

        const shiftCount = record ? calculateShifts(record) : 0;
        const symbol = getShiftSymbol(shiftCount, record);

        return {
            date: day,
            shiftCount,
            symbol,
            record
        };
    });

    // Calculate totals
    const totalDuty = dailyAttendance.reduce((sum, d) => sum + d.shiftCount, 0);
    const estimatedEarned = totalDuty * (worker.dailyWage || 0);

    // Day labels
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* Header with Photo and Name */}
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 ring-2 ring-blue-50">
                    {worker.photoUrl ? (
                        <img
                            src={worker.photoUrl}
                            alt={worker.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${worker.name}&background=4F46E5&color=fff&size=128`;
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-bold text-lg">
                            {worker.name.substring(0, 2).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{worker.name}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">({worker.role})</p>
                </div>
            </div>

            {/* Daily Attendance Grid */}
            <div className="p-4">
                <div className="grid grid-cols-7 gap-2">
                    {dailyAttendance.map((day, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                            {/* Day Label */}
                            <div className="text-xs font-bold text-gray-500 mb-1.5">
                                {dayLabels[idx]}
                            </div>
                            {/* Attendance Status */}
                            <div className={clsx(
                                "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all",
                                day.symbol === 'A'
                                    ? "bg-red-100 text-red-600 ring-2 ring-red-200"
                                    : day.symbol === '-'
                                        ? "bg-yellow-100 text-yellow-600 ring-2 ring-yellow-200"
                                        : day.symbol === '/'
                                            ? "bg-orange-100 text-orange-600 ring-2 ring-orange-200"
                                            : "bg-green-100 text-green-600 ring-2 ring-green-200"
                            )}>
                                {day.symbol}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer with Totals */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-sm">
                <div>
                    <span className="text-gray-600">Total Duty:</span>
                    <span className="ml-2 font-bold text-gray-900">{totalDuty}</span>
                </div>
                <div>
                    <span className="text-gray-600">Earned:</span>
                    <span className="ml-2 font-bold text-green-600">₹{estimatedEarned.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};
