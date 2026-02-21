import React from 'react';
import { useApp } from '../../context/AppContext';
import { Users, MapPin, ClipboardList, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { MissingPunchOutsModal } from '../../components/MissingPunchOutsModal';
import { calculateDutyPoints } from '../../utils/wageUtils';

export const DashboardOverview: React.FC = () => {
    const { workers, sites, attendance, missingPunchOuts, updateAttendance, refreshData } = useApp();
    const navigate = useNavigate();
    const [isMissingModalOpen, setIsMissingModalOpen] = React.useState(false);
    const [isRecalculating, setIsRecalculating] = React.useState(false);
    const [recalcProgress, setRecalcProgress] = React.useState({ done: 0, total: 0 });
    const [recalcDone, setRecalcDone] = React.useState(false);

    // Generate last 8 weeks as options
    const weekOptions = React.useMemo(() => {
        const opts = [];
        for (let i = 0; i < 8; i++) {
            const anchor = subWeeks(new Date(), i);
            const start = startOfWeek(anchor, { weekStartsOn: 0 }); // Sunday
            const end = endOfWeek(anchor, { weekStartsOn: 0 });   // Saturday
            opts.push({
                label: `${format(start, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}`,
                startDate: format(start, 'yyyy-MM-dd'),
                endDate: format(end, 'yyyy-MM-dd'),
            });
        }
        return opts;
    }, []);
    const [selectedWeekIdx, setSelectedWeekIdx] = React.useState(0);

    const handleRecalculate = async () => {
        const { startDate, endDate } = weekOptions[selectedWeekIdx];
        const eligible = attendance.filter(r =>
            r.punchInTime && r.punchOutTime &&
            r.date >= startDate && r.date <= endDate
        );
        if (eligible.length === 0) { alert(`No completed records found for the week ${weekOptions[selectedWeekIdx].label}.`); return; }

        setIsRecalculating(true);
        setRecalcDone(false);
        setRecalcProgress({ done: 0, total: eligible.length });

        for (let i = 0; i < eligible.length; i++) {
            const record = eligible[i];
            try {
                const newPoints = calculateDutyPoints(
                    new Date(record.punchInTime!),
                    new Date(record.punchOutTime!)
                );
                await updateAttendance({ ...record, dutyPoints: newPoints });
            } catch (e) {
                console.warn('Failed to update:', record.id, e);
            }
            setRecalcProgress({ done: i + 1, total: eligible.length });
        }

        await refreshData();
        setIsRecalculating(false);
        setRecalcDone(true);
        setTimeout(() => setRecalcDone(false), 4000);
    };

    // Statistics
    const totalWorkers = workers.length;
    const activeSites = sites.length;
    const todayAttendance = attendance.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length;

    // Pending Approvals
    const pendingWorkers = workers.filter(w => !w.approved);
    const pendingCount = pendingWorkers.length;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight dark:text-gray-100">Dashboard</h1>

            {/* Pending Approvals Alert */}
            {pendingCount > 0 && (
                <div
                    onClick={() => navigate('/dashboard/workers')}
                    className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm flex items-center justify-between cursor-pointer hover:bg-yellow-100 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-200 p-2 rounded-full text-yellow-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-yellow-800 uppercase tracking-wide">Approvals Pending</h3>
                            <p className="text-sm text-yellow-900 font-medium">
                                {pendingCount} worker{pendingCount !== 1 ? 's are' : ' is'} waiting for registration approval.
                            </p>
                        </div>
                    </div>
                    <div className="text-yellow-700 bg-yellow-200/50 px-3 py-1 rounded-md text-xs font-bold uppercase hover:bg-yellow-300 transition-colors">
                        Review Now &rarr;
                    </div>
                </div>
            )}

            {/* Missing Punch Outs Alert */}
            {missingPunchOuts.length > 0 && (
                <div
                    onClick={() => setIsMissingModalOpen(true)}
                    className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg shadow-sm flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-red-200 p-2 rounded-full text-red-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide">Missing Punch Outs</h3>
                            <p className="text-sm text-red-900 font-medium">
                                {missingPunchOuts.length} worker{missingPunchOuts.length !== 1 ? 's' : ''} forgot to punch out previously.
                            </p>
                        </div>
                    </div>
                    <div className="text-red-700 bg-red-200/50 px-3 py-1 rounded-md text-xs font-bold uppercase hover:bg-red-300 transition-colors">
                        Fix Now &rarr;
                    </div>
                </div>
            )}

            {/* Stats Grid - Compact Mobile Layout */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">

                {/* Total Workers */}
                <div
                    onClick={() => navigate('/dashboard/workers')}
                    className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-all active:scale-95"
                >
                    <div className="bg-blue-50 dark:bg-blue-900/40 p-2 rounded-full mb-2">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Workers</dt>
                    <dd className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{totalWorkers}</dd>
                </div>

                {/* Active Sites */}
                <div
                    onClick={() => navigate('/dashboard/sites')}
                    className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-all active:scale-95"
                >
                    <div className="bg-orange-50 dark:bg-orange-900/40 p-2 rounded-full mb-2">
                        <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Sites</dt>
                    <dd className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{activeSites}</dd>
                </div>

                {/* Today's Attendance - Spans full width on mobile row 2 */}
                <div
                    onClick={() => navigate('/dashboard/report')}
                    className="col-span-2 lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-row lg:flex-col items-center justify-between lg:justify-center px-6 lg:px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-all active:scale-95"
                >
                    <div className="flex items-center gap-3 lg:gap-0 lg:flex-col lg:text-center">
                        <div className="bg-green-50 dark:bg-green-900/40 p-2 rounded-full lg:mb-2">
                            <ClipboardList className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <dt className="text-sm lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Today's Presence</dt>
                    </div>
                    <dd className="text-3xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{todayAttendance}</dd>
                </div>
            </div>

            {/* Quick Actions - 2 Column Grid */}
            <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 px-1">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <button
                        onClick={() => navigate('/dashboard/workers')}
                        className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all active:scale-95 flex flex-col items-center justify-center gap-2 text-center group"
                    >
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                            <Users className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                        </div>
                        <div>
                            <span className="block font-semibold text-gray-900 dark:text-gray-100 text-sm">Register Worker</span>
                            <span className="hidden md:block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Add new personnel</span>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/dashboard/sites')}
                        className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all active:scale-95 flex flex-col items-center justify-center gap-2 text-center group"
                    >
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                            <MapPin className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                        </div>
                        <div>
                            <span className="block font-semibold text-gray-900 dark:text-gray-100 text-sm">Create Site</span>
                            <span className="hidden md:block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Set up location</span>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/dashboard/attendance')}
                        className="col-span-2 bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all active:scale-95 flex flex-row md:flex-col items-center justify-center gap-3 text-center group"
                    >
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                            <ClipboardList className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                        </div>
                        <div className="text-left md:text-center">
                            <span className="block font-semibold text-gray-900 dark:text-gray-100 text-sm">Correction Mode</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fix manual punch errors</span>
                        </div>
                    </button>

                    {/* Recalculate Duty Points */}
                    <div className="col-span-2 bg-white dark:bg-gray-800 border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-xl shadow-sm p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="bg-purple-50 dark:bg-purple-900/40 p-2 rounded-full">
                                <RefreshCw className={`h-5 w-5 text-purple-600 dark:text-purple-400 ${isRecalculating ? 'animate-spin' : ''}`} />
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Recalculate Duty Points</span>
                        </div>
                        <select
                            value={selectedWeekIdx}
                            onChange={e => setSelectedWeekIdx(Number(e.target.value))}
                            disabled={isRecalculating}
                            className="w-full border border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 bg-purple-50 dark:bg-purple-900/20 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
                        >
                            {weekOptions.map((w, i) => (
                                <option key={i} value={i}>{i === 0 ? `This week (${w.label})` : w.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleRecalculate}
                            disabled={isRecalculating}
                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-900 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                            {isRecalculating
                                ? `Recalculating… ${recalcProgress.done} / ${recalcProgress.total}`
                                : recalcDone ? '✓ Duty Points Updated!' : 'Recalculate Selected Week'}
                        </button>
                    </div>
                </div>
            </div>

            <MissingPunchOutsModal isOpen={isMissingModalOpen} onClose={() => setIsMissingModalOpen(false)} />
        </div>
    );
};
