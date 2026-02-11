import React from 'react';
import { MapPin, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

export interface GroupedWorker {
    id: string;
    name: string;
    avatar: string;
    role: string;
    in_time?: string;
    out_time?: string | null;
    status: 'present' | 'late' | 'issue' | 'absent';
    issue_text?: string;
}

export interface WorkerRoleGroup {
    role_name: string;
    icon: string; // Emoji or Icon component
    count: number;
    workers: GroupedWorker[];
}

export interface SiteAttendanceData {
    site_id: string;
    site_name: string;
    date: string;
    summary: {
        total_workers: number;
        present: number;
        issues: number;
        estimated_wages: number;
    };
    teams: WorkerRoleGroup[];
}

interface SiteAttendanceCardProps {
    data: SiteAttendanceData;
    onClick: () => void;
}

export const SiteAttendanceCard: React.FC<SiteAttendanceCardProps> = ({ data, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        >
            {/* Header */}
            <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b border-dashed border-gray-300">
                <div className="flex items-center gap-2">
                    <MapPin className="text-red-500 w-4 h-4" />
                    <span className="font-bold text-gray-800 text-sm">{data.site_name}</span>
                </div>
                <div className="text-xs font-mono text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                    [ {data.date} ]
                </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-5">
                {data.teams.map((team, idx) => (
                    <div key={idx} className="space-y-2">
                        <div className="flex flex-col gap-2">
                            {/* Team Title */}
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                                <span className="text-lg">{team.icon}</span>
                                <span>{team.role_name}</span> {/* Team Name */}
                                <span className="text-gray-400 font-normal ml-auto text-xs">{team.count} workers</span>
                            </div>

                            {/* Worker Avatars & Names Grid */}
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-1">
                                {team.workers.map(worker => (
                                    <div key={worker.id} className="flex flex-col items-center gap-1.5 group">
                                        <div className="relative">
                                            <div className={clsx(
                                                "w-10 h-10 rounded-full flex items-center justify-center border-2 overflow-hidden shadow-sm transition-transform group-hover:scale-105",
                                                worker.status === 'issue' ? "border-red-400 bg-red-50 text-red-600" :
                                                    worker.status === 'absent' ? "border-gray-200 bg-gray-100 text-gray-400 grayscale" :
                                                        "border-white bg-blue-50 text-blue-600 ring-2 ring-blue-50"
                                            )}>
                                                {worker.avatar ? (
                                                    <img src={worker.avatar} alt={worker.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-bold">{worker.name.substring(0, 2).toUpperCase()}</span>
                                                )}
                                            </div>
                                            {/* Status Dot */}
                                            {worker.status === 'issue' && (
                                                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                                            )}
                                        </div>
                                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2 w-full break-words">
                                            {worker.name}
                                        </span>
                                        <span className="text-[9px] text-gray-400 -mt-1">{worker.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-dashed border-gray-300 flex justify-between items-center text-xs">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]"></div>
                        <span className="font-medium text-gray-700">{data.summary.present} Present</span>
                    </div>
                    {data.summary.issues > 0 && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]"></div>
                            <span className="font-medium text-gray-700">{data.summary.issues} Late/Issue</span>
                        </div>
                    )}
                </div>
                <div className="text-gray-400 font-mono">
                    [ Est. ₹{data.summary.estimated_wages.toLocaleString()} ]
                </div>
            </div>
        </div>
    );
};
