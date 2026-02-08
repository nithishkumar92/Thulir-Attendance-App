import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavigation } from '../components/dashboard/TopNavigation';

export const OwnerDashboard: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <TopNavigation />

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>
        </div>
    );
};

