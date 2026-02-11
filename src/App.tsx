import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './pages/Login';
import { TeamInterface } from './pages/TeamInterface';
// Placeholders for now
import { OwnerDashboard } from './pages/OwnerDashboard';
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { WorkerManagement } from './pages/dashboard/WorkerManagement';
import { SiteManagement } from './pages/dashboard/SiteManagement';
import { WeeklyReport } from './pages/dashboard/WeeklyReport';
import { AttendanceCorrections } from './pages/dashboard/AttendanceCorrections';
import { TeamManagement } from './pages/dashboard/TeamManagement';
import { AdvanceManagement } from './pages/dashboard/AdvanceManagement';
import { UserManagement } from './pages/dashboard/UserManagement';
import { OwnerReportPage } from './pages/dashboard/OwnerReportPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: string[] }> = ({ children, roles }) => {
    const { currentUser } = useApp();

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (roles && !roles.includes(currentUser.role)) {
        return <Navigate to="/" replace />; // Redirect to home or unauthorized page
    }

    return <>{children}</>;
};



function App() {
    return (
        <Router>
            <AppProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute roles={['OWNER']}>
                                <OwnerDashboard />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<DashboardOverview />} />
                        <Route path="workers" element={<WorkerManagement />} />
                        <Route path="teams" element={<TeamManagement />} />
                        <Route path="sites" element={<SiteManagement />} />
                        <Route path="report" element={<OwnerReportPage />} />
                        <Route path="attendance" element={<AttendanceCorrections />} />
                        <Route path="payments" element={<AdvanceManagement />} />
                        <Route path="users" element={<UserManagement />} />
                    </Route>
                    <Route
                        path="/team/*"
                        element={
                            <ProtectedRoute roles={['TEAM_REP']}>
                                <TeamInterface />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/" element={<Navigate to="/login" replace />} />
                </Routes>
            </AppProvider>
        </Router>
    );
}

export default App;
