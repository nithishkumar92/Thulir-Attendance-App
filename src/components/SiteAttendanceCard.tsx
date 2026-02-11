import React from 'react';
import { MapPin, Clock, AlertCircle, CheckCircle } from 'lucide-react';

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
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                            <span className="text-lg">{team.icon}</span>
                            <span>{team.role_name} ({team.count})</span>
                        </div>

                        {/* Avatar Stack */}
                        <div className="flex items-center pl-1">
                            {team.workers.slice(0, 5).map((worker, wIdx) => (
                                <div
                                    key={worker.id}
                                    className="w-8 h-8 rounded-full border-2 border-white -ml-2 first:ml-0 overflow-hidden shadow-sm bg-gray-100 flex items-center justify-center"
                                    style={{ zIndex: 10 - wIdx }}
                                >
                                    <img
                                        src={worker.avatar}
                                        alt={worker.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${worker.name}&background=random&size=64`;
                                        }}
                                    />
                                </div>
                            ))}
                            {team.workers.length > 5 && (
                                <div className="w-8 h-8 rounded-full border-2 border-white -ml-2 bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm z-0">
                                    +{team.workers.length - 5}
                                </div>
                            )}
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
