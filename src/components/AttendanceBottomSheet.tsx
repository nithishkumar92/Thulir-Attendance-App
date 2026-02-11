import React, { useRef, useEffect } from 'react';
import { X, Calendar, Clock, AlertCircle, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { SiteAttendanceData, WorkerRoleGroup, GroupedWorker } from './SiteAttendanceCard';

interface AttendanceBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    data: SiteAttendanceData | null;
    onEdit?: (workerId: string) => void;
    onDelete?: (workerId: string) => void;
}

export const AttendanceBottomSheet: React.FC<AttendanceBottomSheetProps> = ({ isOpen, onClose, data, onEdit, onDelete }) => {
    const sheetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Sheet Content */}
            <div
                ref={sheetRef}
                className="bg-white w-full rounded-t-2xl shadow-2xl relative z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
            >
                {/* Header */}
                <div className="p-4 border-b border-dashed border-gray-300 flex justify-between items-start bg-gray-50 rounded-t-2xl">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-red-500 font-bold">📍</span>
                            <h2 className="font-bold text-gray-800 text-lg leading-tight">{data.site_name}</h2>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">
                                Status: Active
                            </span>
                            <span>•</span>
                            <span>{data.summary.total_workers} Workers</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="overflow-y-auto p-4 space-y-6">
                    {data.teams.map((team, idx) => (
                        <div key={idx}>
                            {/* Role Header */}
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-dashed border-gray-200">
                                <span className="text-xl">{team.icon}</span>
                                <h3 className="font-bold text-gray-700 uppercase text-sm tracking-wide">{team.role_name}</h3>
                            </div>

                            {/* Workers List */}
                            <div className="space-y-4">
                                {team.workers.map((worker) => (
                                    <div key={worker.id} className="group flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            {/* Avatar */}
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shadow-sm">
                                                    <img
                                                        src={worker.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}&background=random`}
                                                        alt={worker.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                {worker.status === 'present' && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                                )}
                                                {worker.status === 'issue' && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></div>
                                                )}
                                            </div>

                                            {/* Details */}
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{worker.name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {worker.status === 'issue' ? (
                                                        <span className="text-red-500 text-xs font-bold flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                            {worker.issue_text || 'Issue'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500 text-xs font-mono flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {worker.in_time} - {worker.out_time || 'Working'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                            {onEdit && (
                                                <button
                                                    onClick={() => onEdit(worker.id)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    onClick={() => onDelete(worker.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Gradient Fade (Optional aesthetic) */}
                <div className="h-4 bg-gradient-to-t from-white to-transparent pointer-events-none absolute bottom-0 left-0 right-0"></div>
            </div>
        </div>
    );
};
