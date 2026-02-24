import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    MapPin,
    AlertCircle,
    DollarSign,
    ClipboardList,
    Briefcase,
    Grid,
    Menu,
    X,
    LogOut,
    TrendingUp,
    Bell
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TopNavigation: React.FC = () => {
    const { currentUser, logout, workers, missingPunchOuts } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Calculate alerts
    const pendingApprovals = workers.filter(w => !w.approved).length;
    const missingPunchOutCount = missingPunchOuts.length;
    const totalAlerts = pendingApprovals + missingPunchOutCount;

    // Close mobile menu when location changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
        { path: '/dashboard/teams', label: 'Teams', icon: Briefcase },
        { path: '/dashboard/workers', label: 'Workers', icon: Users },
        { path: '/dashboard/sites', label: 'Sites', icon: MapPin },
        { path: '/dashboard/attendance', label: 'Attendance', icon: AlertCircle },
        { path: '/dashboard/payments', label: 'Payments', icon: DollarSign },
        { path: '/dashboard/report', label: 'Reports', icon: ClipboardList },
        { path: '/dashboard/tiles', label: 'Tiles', icon: Grid },
        { path: '/dashboard/users', label: 'Users', icon: Users },
    ];

    const isActive = (item: { path: string, exact?: boolean }) => {
        return item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
    };

    return (
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center bg-white relative z-50">
                {/* Logo Area */}
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => navigate('/dashboard')}
                >
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                    <h1 className="text-xl font-bold text-gray-900">Thulir ERP</h1>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-1">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${isActive(item)
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* User & Desktop Logout */}
                <div className="hidden lg:flex items-center gap-4">
                    {/* Notification Bell */}
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-100 relative"
                        title="Notifications"
                    >
                        <Bell size={20} />
                        {totalAlerts > 0 && (
                            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center border-2 border-white">
                                {totalAlerts}
                            </span>
                        )}
                    </button>

                    <span className="text-sm text-gray-600">Hi, {currentUser?.name}</span>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-gray-100"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <div className="lg:hidden flex items-center">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 -mr-2 text-gray-600 hover:text-gray-900 focus:outline-none rounded-md hover:bg-gray-100"
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Drawer Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Mobile Navigation Drawer Content */}
            <div
                className={`fixed top-0 right-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 lg:hidden flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Drawer Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                    <span className="font-semibold text-gray-900">Menu</span>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 -mr-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* User Info Section */}
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{currentUser?.role?.toLowerCase()}</p>
                        </div>
                        {/* Mobile Notification Bell */}
                        <button
                            onClick={() => {
                                navigate('/dashboard');
                                setIsMobileMenuOpen(false);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-200 relative"
                        >
                            <Bell size={20} />
                            {totalAlerts > 0 && (
                                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center border-2 border-gray-50">
                                    {totalAlerts}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-2">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4 ${isActive(item)
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Logout Button */}
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </div>
        </header>
    );
};
