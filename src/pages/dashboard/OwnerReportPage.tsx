import React, { useState } from 'react';
import { AttendanceReportView } from './AttendanceReportView';
import { PaymentSummaryView } from './PaymentSummaryView';
import clsx from 'clsx';

type ReportSubTab = 'ATTENDANCE' | 'PAYMENT';

export const OwnerReportPage: React.FC = () => {
    const [reportSubTab, setReportSubTab] = useState<ReportSubTab>('ATTENDANCE');

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-800">Reports</h1>

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

                {/* Sub-tab Content */}
                <div className="p-4">
                    {reportSubTab === 'ATTENDANCE' && (
                        <AttendanceReportView />
                    )}
                    {reportSubTab === 'PAYMENT' && (
                        <PaymentSummaryView />
                    )}
                </div>
            </div>
        </div>
    );
};
