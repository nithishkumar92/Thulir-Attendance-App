import React from 'react';
import { useApp } from '../../context/AppContext';
import { Users, MapPin, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MissingPunchOutsModal } from '../../components/MissingPunchOutsModal';

export const DashboardOverview: React.FC = () => {
    const { workers, sites, attendance, missingPunchOuts } = useApp();
    const navigate = useNavigate();
    const [isMissingModalOpen, setIsMissingModalOpen] = React.useState(false);

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
                </div>
            </div>

            <MissingPunchOutsModal isOpen={isMissingModalOpen} onClose={() => setIsMissingModalOpen(false)} />
        </div>
    );
};
