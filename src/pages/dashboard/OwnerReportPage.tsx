import React, { useState } from 'react';
import { AttendanceReport } from '../../components/attendance/AttendanceReport';
import { PaymentSummary } from '../../components/attendance/PaymentSummary';
import { useApp } from '../../context/AppContext';
import clsx from 'clsx';

type ReportSubTab = 'ATTENDANCE' | 'PAYMENT';

export const OwnerReportPage: React.FC = () => {
    const { sites, teams } = useApp();
    const [reportSubTab, setReportSubTab] = useState<ReportSubTab>('ATTENDANCE');
    const [selectedSiteId, setSelectedSiteId] = useState<string>(''); // Empty string = All Sites
    const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-800">Reports</h1>

            {/* Site and Team Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Site</label>
                    <select
                        value={selectedSiteId}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        className="w-full p-2 border rounded-md bg-white"
                    >
                        <option value="">All Sites</option>
                        {sites.map(site => (
                            <option key={site.id} value={site.id}>{site.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Team</label>
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="w-full p-2 border rounded-md bg-white"
                    >
                        <option value="ALL">All Teams</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="flex border-b">
                    <button
                        onClick={() => setReportSubTab('ATTENDANCE')}
                        className={clsx(
                            "flex-1 py-3 px-4 font-semibold text-sm transition-colors",
                            reportSubTab === 'ATTENDANCE'
                                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                                : "text-gray-600 hover:bg-gray-50"
                        )}
                    >
                        Attendance Report
                    </button>
                    <button
                        onClick={() => setReportSubTab('PAYMENT')}
                        className={clsx(
                            "flex-1 py-3 px-4 font-semibold text-sm transition-colors",
                            reportSubTab === 'PAYMENT'
                                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                                : "text-gray-600 hover:bg-gray-50"
                        )}
                    >
                        Payment Summary
                    </button>
                </div>

                {/* Sub-tab Content - Now using unified components */}
                <div>
                    {reportSubTab === 'ATTENDANCE' && (
                        <AttendanceReport
                            userRole="OWNER"
                            siteId={selectedSiteId || undefined}
                            teamId={selectedTeamId === 'ALL' ? undefined : selectedTeamId}
                            showAddButton={true}
                        />
                    )}
                    {reportSubTab === 'PAYMENT' && (
                        <PaymentSummary
                            userRole="OWNER"
                            siteId={selectedSiteId || undefined}
                            teamId={selectedTeamId === 'ALL' ? undefined : selectedTeamId}
                            showExportButton={true}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
