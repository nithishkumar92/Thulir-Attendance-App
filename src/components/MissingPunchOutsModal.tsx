import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import { X, Clock, CheckCircle } from 'lucide-react';
import { AttendanceRecord } from '../types';

interface MissingPunchOutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MissingPunchOutsModal: React.FC<MissingPunchOutsModalProps> = ({ isOpen, onClose }) => {
    const { missingPunchOuts, workers, sites, updateAttendance } = useApp();
    const [selectedTime, setSelectedTime] = useState('18:00');
    const [processingId, setProcessingId] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleFinalize = async (record: AttendanceRecord) => {
        setProcessingId(record.id);
        try {
            const punchOutDateTime = `${record.date}T${selectedTime}:00`;

            await updateAttendance({
                ...record,
                punchOutTime: punchOutDateTime,
                status: 'PRESENT',
                dutyPoints: 1.0
            });

            // Ideally we would filter it out locally or refresh, 
            // but relying on parent refresh or optimistic logic in context.
            // For now, let's just close if successful? No, there might be multiple.
        } catch (error) {
            console.error(error);
            alert('Failed to update record');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-blue-50">
                    <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                        <Clock size={20} />
                        Missing Punch Outs
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    {missingPunchOuts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <CheckCircle className="mx-auto mb-2 text-green-500" size={48} />
                            <p>No missing punch-outs found!</p>
                        </div>
                    ) : (
                        missingPunchOuts.map(record => {
                            const worker = workers.find(w => w.id === record.workerId);
                            const site = sites.find(s => s.id === record.siteId);
                            if (!worker) return null;

                            return (
                                <div key={record.id} className="bg-white border rounded-lg p-3 shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border">
                                                <img
                                                    src={worker.photoUrl || `https://ui-avatars.com/api/?name=${worker.name}&background=random`}
                                                    alt={worker.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{worker.name}</h3>
                                                <p className="text-xs text-gray-500">{format(new Date(record.date), 'dd MMM yyyy')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">In: {record.punchInTime ? format(new Date(record.punchInTime), 'hh:mm a') : 'N/A'}</p>
                                            <p className="text-[10px] text-gray-400 max-w-[100px] truncate">{site?.name || 'Unknown Site'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-end gap-2 pt-2 border-t">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Set Out Time</label>
                                            <input
                                                type="time"
                                                value={selectedTime}
                                                onChange={(e) => setSelectedTime(e.target.value)}
                                                className="w-full p-2 border rounded text-sm bg-gray-50"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleFinalize(record)}
                                            disabled={processingId === record.id}
                                            className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 h-[38px] flex items-center justify-center"
                                        >
                                            {processingId === record.id ? '...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-3 border-t bg-gray-50 text-[10px] text-gray-400 text-center">
                    These workers forgot to punch out previously. Set time to close attendance.
                </div>
            </div>
        </div>
    );
};
