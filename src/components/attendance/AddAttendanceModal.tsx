import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Calendar, MapPin, User as UserIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { format, parseISO } from 'date-fns';

interface AddAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date;
}

export const AddAttendanceModal: React.FC<AddAttendanceModalProps> = ({ isOpen, onClose, initialDate }) => {
    const { workers, sites, teams, recordAttendance, isLoading } = useApp();

    // Form State
    const [workerId, setWorkerId] = useState('');
    const [siteId, setSiteId] = useState('');
    const [date, setDate] = useState(format(initialDate || new Date(), 'yyyy-MM-dd'));
    const [status, setStatus] = useState<'PRESENT' | 'HALF_DAY' | 'ABSENT'>('PRESENT');

    // Time State (Optional)
    const [useTime, setUseTime] = useState(false);
    const [inTime, setInTime] = useState('09:00');
    const [outTime, setOutTime] = useState('18:00');

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            if (initialDate) setDate(format(initialDate, 'yyyy-MM-dd'));
            // Reset other fields if needed, or keep last used? resetting is safer
            setWorkerId('');
            setSiteId(sites.length > 0 ? sites[0].id : '');
            setStatus('PRESENT');
            setUseTime(false);
            setInTime('09:00');
            setOutTime('18:00');
        }
    }, [isOpen, initialDate, sites]);

    // Auto-select site when worker changes (if worker has a default team site?)
    // Our worker model doesn't strictly link to one site, but teams might.
    // For now, manual selection is fine.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!workerId || !siteId || !date) return;

        try {
            const selectedWorker = workers.find(w => w.id === workerId);

            // Construct payload
            const record: any = {
                id: crypto.randomUUID(), // Temp ID, backend handles real ID
                workerId,
                workerName: selectedWorker?.name || 'Unknown', // Legacy field?
                siteId,
                date,
                status,
                role: selectedWorker?.role || 'Helper', // Legacy field?
            };

            if (useTime) {
                // Construct ISO strings
                const inDateTime = new Date(`${date}T${inTime}`);
                const outDateTime = new Date(`${date}T${outTime}`);

                record.punchInTime = inDateTime.toISOString();
                record.punchOutTime = outDateTime.toISOString();

                // Status will be auto-calculated by context/backend based on times usually,
                // but we send the manual status as fallback or override if logic permits.
                // However, Context logic overrides status if times are present.
            } else {
                // Manual Duty Points mapping
                if (status === 'PRESENT') record.dutyPoints = 1.0;
                if (status === 'HALF_DAY') record.dutyPoints = 0.5;
                if (status === 'ABSENT') record.dutyPoints = 0;
            }

            await recordAttendance(record);
            onClose();
            // Optional: Show success toast?
        } catch (error) {
            console.error("Failed to add attendance", error);
            alert("Failed to add attendance");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Clock size={20} className="text-blue-400" />
                        Add Attendance
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Date Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full pl-9 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    {/* Site Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Site</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <select
                                value={siteId}
                                onChange={(e) => setSiteId(e.target.value)}
                                className="w-full pl-9 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                                required
                            >
                                <option value="">Select Site</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Worker Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Worker</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <select
                                value={workerId}
                                onChange={(e) => setWorkerId(e.target.value)}
                                className="w-full pl-9 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                                required
                            >
                                <option value="">Select Worker</option>
                                {workers.map(worker => (
                                    <option key={worker.id} value={worker.id}>{worker.name} ({worker.role})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Input Mode Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setUseTime(false)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!useTime ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Status Only
                        </button>
                        <button
                            type="button"
                            onClick={() => setUseTime(true)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${useTime ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            With Times
                        </button>
                    </div>

                    {useTime ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Punch In</label>
                                <input
                                    type="time"
                                    value={inTime}
                                    onChange={(e) => setInTime(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Punch Out</label>
                                <input
                                    type="time"
                                    value={outTime}
                                    onChange={(e) => setOutTime(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="PRESENT">Present (Full Day)</option>
                                <option value="HALF_DAY">Half Day</option>
                                <option value="ABSENT">Absent</option>
                            </select>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-gray-200 flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            Save Attendance
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};
