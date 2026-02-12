import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getCurrentLocation, calculateDistance } from '../utils/geo'; // Assuming this utility exists or is imported correctly
import { CheckCircle, XCircle, MapPin, Camera, User as UserIcon, LogOut, FileText, CreditCard, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Site, Worker } from '../types';
import { useNavigate } from 'react-router-dom';
import { WeeklyReport } from './dashboard/WeeklyReport';
import { AttendanceReport } from '../components/attendance/AttendanceReport';
import { PaymentSummary } from '../components/attendance/PaymentSummary';
import clsx from 'clsx';
import { startOfWeek, endOfWeek, format, isSameDay, addWeeks, subWeeks, parseISO } from 'date-fns';
import { getTodayDateString } from '../utils/dateUtils';
import { SiteAttendanceCard, SiteAttendanceData, WorkerRoleGroup, GroupedWorker } from '../components/SiteAttendanceCard';
import { AttendanceBottomSheet } from '../components/AttendanceBottomSheet';


type Tab = 'PUNCH_IN' | 'PUNCH_OUT' | 'REPORT' | 'ADVANCE';
type ReportSubTab = 'ATTENDANCE' | 'PAYMENT';

export const TeamInterface: React.FC = () => {
    const { currentUser, workers, sites, recordAttendance, updateAttendance, attendance, addAdvance, advances, logout, refreshData, teams, addWorker } = useApp();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('PUNCH_IN');
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState('');
    const [selectedSite, setSelectedSite] = useState<Site | null>(null);
    const [isLocationVerified, setIsLocationVerified] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // UI State for processing

    // Advances Tab State
    const [selectedAdvanceWeek, setSelectedAdvanceWeek] = useState(new Date());

    const handlePrevAdvanceWeek = () => setSelectedAdvanceWeek(prev => subWeeks(prev, 1));
    const handleNextAdvanceWeek = () => setSelectedAdvanceWeek(prev => addWeeks(prev, 1));

    const advanceWeekStart = startOfWeek(selectedAdvanceWeek, { weekStartsOn: 0 });
    const advanceWeekEnd = endOfWeek(selectedAdvanceWeek, { weekStartsOn: 0 });

    const [photo, setPhoto] = useState<string | null>(null); // Placeholder for photo logic
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

    // Multi-Site State
    const [reportSiteId, setReportSiteId] = useState<string>('');
    const [reportSubTab, setReportSubTab] = useState<ReportSubTab>('ATTENDANCE');
    const [advanceSiteId, setAdvanceSiteId] = useState<string>('');

    // Bottom Sheet State
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
    const [selectedSiteData, setSelectedSiteData] = useState<SiteAttendanceData | null>(null);

    const openBottomSheet = (data: SiteAttendanceData) => {
        setSelectedSiteData(data);
        setIsBottomSheetOpen(true);
    };

    // Derived Permitted Sites
    const permittedSites = React.useMemo(() => {
        if (!currentUser?.teamId) return [];
        const team = teams.find(t => t.id === currentUser.teamId);
        // If no specifically permitted sites, maybe show all? Or none? 
        // For now, if empty, maybe they can't see specific site reports? 
        // Or assume they can see all if not restricted?
        // Let's assume if array is empty/undefined, they only see what they punch into? 
        // Actually, requirement says "permitted by owner". 
        if (!team?.permittedSiteIds || team.permittedSiteIds.length === 0) return [];
        return sites.filter(s => team.permittedSiteIds?.includes(s.id));
    }, [currentUser, teams, sites]);

    // Initialize logic - Removed auto-selection to keep "All Sites" as default
    // reportSiteId and advanceSiteId default to empty string = "All Sites"

    // Add Worker Modal State
    const [isAddWorkerModalOpen, setIsAddWorkerModalOpen] = useState(false);
    const [newWorkerName, setNewWorkerName] = useState('');
    const [newWorkerPhone, setNewWorkerPhone] = useState('');
    const [newWorkerRole, setNewWorkerRole] = useState('');
    const [newWorkerPhoto, setNewWorkerPhoto] = useState<string>('');
    const [newWorkerAadhaar, setNewWorkerAadhaar] = useState<string>('');

    const handleAddWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.teamId) return;

        const currentTeam = teams.find(t => t.id === currentUser?.teamId);
        const roleDef = currentTeam?.definedRoles?.find(r => r.name === newWorkerRole);
        const defaultWage = roleDef?.defaultWage || 0;

        await addWorker({
            id: Date.now().toString(),
            name: newWorkerName,
            teamId: currentUser.teamId,
            role: newWorkerRole,
            dailyWage: defaultWage,
            wageType: 'DAILY',
            phoneNumber: newWorkerPhone,
            photoUrl: newWorkerPhoto,
            aadhaarPhotoUrl: newWorkerAadhaar,
            isActive: true,
            approved: false,
            isLocked: false
        });

        setIsAddWorkerModalOpen(false);
        setNewWorkerName('');
        setNewWorkerPhone('');
        setNewWorkerRole('');
        setNewWorkerPhoto('');
        setNewWorkerAadhaar('');
        alert("Worker added! Waiting for admin approval.");
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setNewWorkerPhoto(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    // Pull to Refresh State
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullStartY, setPullStartY] = useState<number | null>(null);
    const [pullDistance, setPullDistance] = useState(0);
    const CONTENT_REF = React.useRef<HTMLDivElement>(null);
    const MIN_PULL_DISTANCE = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (CONTENT_REF.current && CONTENT_REF.current.scrollTop === 0) {
            setPullStartY(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!pullStartY) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - pullStartY;

        if (diff > 0 && CONTENT_REF.current?.scrollTop === 0) {
            // Resistance effect
            setPullDistance(Math.min(diff * 0.5, 150));
            // Prevent default only if we are pulling down at the top? 
            // Browsers might handle this differently, but let's try to let it flow naturally or prevent if needed.
            // e.preventDefault(); // Verify if this blocks scrolling too much
        } else {
            setPullDistance(0);
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance > MIN_PULL_DISTANCE) {
            setIsRefreshing(true);
            setPullDistance(MIN_PULL_DISTANCE); // Snap to loading position
            try {
                await refreshData();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
                setPullStartY(null);
            }
        } else {
            setPullDistance(0);
            setPullStartY(null);
        }
    };

    const toggleWorkerSelection = (workerId: string) => {
        setSelectedWorkerIds(prev =>
            prev.includes(workerId)
                ? prev.filter(id => id !== workerId)
                : [...prev, workerId]
        );
    };

    const handleBulkPunchOut = async () => {
        if (!selectedSite || selectedWorkerIds.length === 0) return;
        setIsSubmitting(true);


        // Fallback: If verification succeeded but currentLocation lost, use site location
        const finalLocation = currentLocation || selectedSite.location;

        if (!finalLocation) {
            alert("Location data missing. Please re-verify.");
            verifyLocation();
            return;
        }

        const today = getTodayDateString();
        const now = new Date().toISOString();
        let successCount = 0;
        let failCount = 0;

        try {
            // Process all selected workers
            for (const workerId of selectedWorkerIds) {
                const existingRecord = attendance.find(r => r.workerId === workerId && r.date === today);

                if (existingRecord) {
                    try {
                        await updateAttendance({
                            ...existingRecord,
                            punchOutTime: now,
                            punchOutLocation: finalLocation, // Use fallback
                            status: existingRecord.status, // Keep status, will be updated by AppContext logic
                            verified: true
                        });

                        successCount++;
                    } catch (err) {
                        console.error(`Failed to punch out worker ${workerId}`, err);
                        failCount++;
                    }
                } else {
                    console.warn(`No attendance record found for worker ${workerId} today.`);
                    // Optionally alert or just log?
                }
            }

            if (successCount > 0) {
                // Refresh data to ensure UI sync
                await refreshData();
                setSuccessMessage(`Successfully punched out ${successCount} workers.`);
                if (failCount > 0) {
                    alert(`Punched out ${successCount} workers, but failed for ${failCount}. Please check.`);
                }
                setSelectedWorkerIds([]); // Reset selection only if some success
            } else if (failCount > 0) {
                alert(`Failed to punch out selected workers. Please try again.`);
            }
        } finally {
            setIsSubmitting(false);
        }

        setTimeout(() => setSuccessMessage(''), 3000);
    };

    // Filter workers for this team
    // Filter workers:
    // - If OWNER, show all (or could restrict, but usually owner sees all)
    // - If TEAM_REP, strictly show only workers with matching teamId
    const teamWorkers = currentUser?.role === 'OWNER'
        ? workers.filter(w => !w.isLocked)
        : workers.filter(w => w.teamId === currentUser?.teamId && !w.isLocked);

    useEffect(() => {
        // Attempt to get location on mount or tab change to 'PUNCH_IN'/'PUNCH_OUT'
        if (activeTab === 'PUNCH_IN' || activeTab === 'PUNCH_OUT') {
            verifyLocation();
        }
        setSelectedWorkerIds([]); // Clear selection on tab change
        setPhoto(null);
    }, [activeTab]);

    const verifyLocation = async () => {
        setIsVerifying(true);
        setLocationError('');
        setIsLocationVerified(false);
        setSelectedSite(null);
        try {
            const location = await getCurrentLocation();
            setCurrentLocation(location);

            // 1. Find the nearest site from ALL sites
            const nearestSite = sites.find(site => {
                const distance = calculateDistance(location.lat, location.lng, site.location.lat, site.location.lng);
                return distance <= site.radius;
            });

            if (nearestSite) {
                // 2. Check if this site is permitted
                const isPermitted = permittedSites.some(s => s.id === nearestSite.id);

                if (isPermitted) {
                    setSelectedSite(nearestSite);
                    setIsLocationVerified(true);
                } else {
                    setLocationError(`You are at "${nearestSite.name}", but this site is not permitted for your team.`);
                }
            } else {
                setLocationError('You are far from any site.');
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 1) {
                setLocationError('BLOCKED: Browser blocked location. Click lock icon in url bar.');
            } else if (err.code === 2) {
                setLocationError('GPS signal lost. Please move outside.');
            } else if (err.code === 3) {
                setLocationError('Location timed out. Please try again.');
            } else {
                setLocationError('GPS failed. Ensure it is turned on.');
            }
        } finally {
            setIsVerifying(false);
        }
    };

    const handleBulkPunchIn = async () => {
        if (!selectedSite || selectedWorkerIds.length === 0) return;
        setIsSubmitting(true);

        const today = getTodayDateString();
        const now = new Date().toISOString();

        for (const workerId of selectedWorkerIds) {
            // Double check if already punched in
            const existing = attendance.find(r => r.workerId === workerId && r.date === today);
            if (existing) continue;

            await recordAttendance({
                id: Date.now().toString() + Math.random(),
                workerId,
                siteId: selectedSite.id,
                date: today,
                punchInTime: now,
                punchInLocation: currentLocation || selectedSite.location, // Fallback
                status: 'PRESENT',
                verified: true,
                punchInPhoto: photo || undefined
            });
        }

        // Refresh data to ensure UI sync
        await refreshData();

        setSuccessMessage(`Successfully punched in ${selectedWorkerIds.length} workers.`);
        setSelectedWorkerIds([]);
        setPhoto(null);
        setTimeout(() => setSuccessMessage(''), 3000);
        setIsSubmitting(false);
    };

    // ... (rest of code) ...
    // Note: Skipping handlePunchOut as it is further down, focusing on replace boundaries.
    // Need to match lines for content replacement.
    // The previous block ended at 110, so I will replace from 68 to 138 (handlePunchIn end).

    // Let's refine the replacement content to match the target block exactly.
    // The target covers lines 68 to 138.




    // Helper to transform data for Site Cards
    const getSiteAttendanceData = (): SiteAttendanceData[] => {
        const today = getTodayDateString();
        // Get all verification punches for today (or attendance records)
        // We want to show sites where workers are PRESENT or have ATTENDED today.

        // 1. Identify distinct sites from today's attendance
        const todayAttendance = attendance.filter(a => a.date === today);
        const relatedSiteIds = Array.from(new Set(todayAttendance.map(a => a.siteId)));

        // 2. Map sites to data structure
        return relatedSiteIds.map(siteId => {
            const site = sites.find(s => s.id === siteId);
            const siteName = site ? site.name : 'Unknown Site';

            const siteRecords = todayAttendance.filter(a => a.siteId === siteId);
            const activeWorkers = workers.filter(w => siteRecords.some(r => r.workerId === w.id));

            // Summary Stats
            const total = activeWorkers.length;
            const present = siteRecords.length; // Actually all records imply present at some point
            // Logic for "Late" or "Issue" - placeholder logic for now
            // Example: Issue if no punch out by 6PM? Or just arbitrary for demo?
            // Let's count "Missing Punch Out" if needed.
            const issues = siteRecords.filter(r => !r.punchOutTime && new Date().getHours() > 18).length;

            // Calculate Wages (Estimated)
            const estimatedWages = activeWorkers.reduce((sum, w) => sum + (w.dailyWage || 0), 0);

            // Group by Role
            // Get unique roles from active workers
            const roles = Array.from(new Set(activeWorkers.map(w => w.role)));

            const teams: WorkerRoleGroup[] = roles.map(role => {
                const roleWorkers = activeWorkers.filter(w => w.role === role);

                const groupedWorkers: GroupedWorker[] = roleWorkers.map(w => {
                    const record = siteRecords.find(r => r.workerId === w.id);
                    // Format times
                    const inTime = record?.punchInTime ? format(new Date(record.punchInTime), 'hh:mm a') : '-';
                    const outTime = record?.punchOutTime ? format(new Date(record.punchOutTime), 'hh:mm a') : null;

                    let status: GroupedWorker['status'] = 'present';
                    let issueText = '';

                    if (!record?.punchOutTime && new Date().getHours() > 18) {
                        status = 'issue';
                        issueText = 'Missing Punch Out';
                    }

                    return {
                        id: w.id,
                        name: w.name,
                        avatar: w.photoUrl || '',
                        role: w.role,
                        in_time: inTime,
                        out_time: outTime,
                        status,
                        issue_text: issueText
                    };
                });

                // Icon mapping (simple generic fallback if not strictly defined)
                const icon = role.toLowerCase().includes('mason') ? '🧱' : (role.toLowerCase().includes('helper') ? '🛠️' : '👷');

                return {
                    role_name: role + (role.endsWith('s') ? '' : 'S'), // Pluralize lazily
                    icon,
                    count: groupedWorkers.length,
                    workers: groupedWorkers
                };
            });

            return {
                site_id: siteId,
                site_name: siteName,
                date: format(new Date(), 'MMM dd, yyyy'),
                summary: {
                    total_workers: total,
                    present: present,
                    issues: issues,
                    estimated_wages: estimatedWages
                },
                teams
            };
        });
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="h-[100dvh] bg-gray-50 flex flex-col font-sans overflow-hidden">
            <AttendanceBottomSheet
                isOpen={isBottomSheetOpen}
                onClose={() => setIsBottomSheetOpen(false)}
                data={selectedSiteData}
            />
            {/* Header */}
            <div className="bg-white shadow px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] flex justify-between items-center z-20 shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                    <h1 className="text-lg font-bold text-gray-800 truncate">Team: {currentUser?.name}</h1>
                    <button
                        onClick={() => setIsAddWorkerModalOpen(true)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-700 flex items-center gap-1.5 text-xs font-bold shadow-sm transition-all active:scale-95 shrink-0 whitespace-nowrap"
                    >
                        <Plus size={14} strokeWidth={3} />
                        Add
                    </button>
                </div>
                <button onClick={handleLogout} className="text-gray-600 hover:text-red-600">
                    <LogOut size={20} />
                </button>
            </div>


            {/* Content */}
            <div
                ref={CONTENT_REF}
                className="flex-1 p-4 overflow-y-auto overscroll-y-contain pb-24 relative"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Pull Indicator */}
                <div
                    style={{
                        height: pullDistance,
                        opacity: pullDistance > 0 ? 1 : 0,
                        transition: isRefreshing ? 'height 0.2s ease-out' : 'none'
                    }}
                    className="w-full flex items-end justify-center overflow-hidden -mt-4 mb-4"
                >
                    <div className={`transition-transform duration-200 ${pullDistance > MIN_PULL_DISTANCE ? 'rotate-180' : ''}`}>
                        {isRefreshing ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                        ) : (
                            <LogOut size={24} className="text-gray-400 rotate-90 mb-2" /> // Using generic icon downward
                        )}
                    </div>
                </div>

                {successMessage && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        {successMessage}
                    </div>
                )}

                {activeTab === 'PUNCH_IN' && (
                    <div className="space-y-6">
                        {/* Location Header */}
                        <div className={`p-4 rounded-xl flex items-center justify-center gap-3 shadow-sm ${isLocationVerified ? 'bg-green-600 text-white' : 'bg-red-50 border border-red-100'}`}>
                            {isLocationVerified ? (
                                <>
                                    <MapPin className="text-white" size={24} />
                                    <span className="font-bold text-lg">Location Verified: {selectedSite?.name}</span>
                                    <div className="bg-white/20 p-1 rounded-full">
                                        <CheckCircle className="text-white" size={20} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <MapPin className="text-red-600" size={24} />
                                    <div className="text-center">
                                        <p className="font-bold text-red-800">Location Not Verified</p>
                                        <p className="text-xs text-red-600 cursor-pointer underline" onClick={verifyLocation}>Tap to Retry</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {isLocationVerified && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">WHO ARE YOU?</h2>
                                    <p className="text-xs text-gray-500 font-medium">(Select your profile)</p>
                                </div>

                                {/* Worker Carousel */}
                                <div className="flex overflow-x-auto pb-4 gap-4 px-2 snap-x scrollbar-hide">
                                    {teamWorkers.map(worker => {
                                        const today = getTodayDateString();
                                        const todayRecord = attendance.find(r => r.workerId === worker.id && r.date === today);
                                        const isAlreadyPunchedIn = !!todayRecord;
                                        const isSelected = selectedWorkerIds.includes(worker.id);

                                        return (
                                            <div
                                                key={worker.id}
                                                onClick={() => !isAlreadyPunchedIn && worker.approved && toggleWorkerSelection(worker.id)}
                                                className={`flex-shrink-0 w-32 snap-center flex flex-col items-center gap-2 transition-all duration-200 cursor-pointer ${isAlreadyPunchedIn || !worker.approved
                                                    ? 'opacity-60 grayscale cursor-not-allowed'
                                                    : isSelected
                                                        ? 'scale-110'
                                                        : 'opacity-100 scale-95'
                                                    }`}
                                            >
                                                <div className={`relative w-24 h-24 rounded-full border-4 shadow-md overflow-hidden ${isAlreadyPunchedIn
                                                    ? 'border-gray-300 bg-gray-100'
                                                    : isSelected
                                                        ? 'border-green-500 ring-4 ring-green-100'
                                                        : 'border-gray-200'
                                                    }`}>
                                                    <img
                                                        src={worker.photoUrl || `https://ui-avatars.com/api/?name=${worker.name}&background=random&size=128`}
                                                        alt={worker.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    {isSelected && !isAlreadyPunchedIn && (
                                                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                                            <div className="bg-green-500 rounded-full p-1">
                                                                <CheckCircle className="text-white w-6 h-6" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {isAlreadyPunchedIn && !todayRecord?.punchOutTime && (
                                                        <div className="absolute inset-0 bg-gray-500/10 flex items-center justify-center">
                                                            <span className="bg-green-100/90 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-300 shadow-sm">PUNCHED IN</span>
                                                        </div>
                                                    )}
                                                    {isAlreadyPunchedIn && todayRecord?.punchOutTime && (
                                                        <div className="absolute inset-0 bg-gray-500/40 flex items-center justify-center">
                                                            <span className="bg-gray-100/90 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-300 shadow-sm">COMPLETED</span>
                                                        </div>
                                                    )}
                                                    {!worker.approved && (
                                                        <div className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center">
                                                            <span className="bg-yellow-100/90 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-300">PENDING</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-center">
                                                    <p className={`font-bold text-sm leading-tight ${isSelected || isAlreadyPunchedIn ? 'text-gray-900' : 'text-gray-500'}`}>{worker.name}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-medium">{worker.role}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Photo & Action */}
                                <div className="space-y-4 px-2">
                                    {!photo ? (
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setPhoto(reader.result as string);
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className="hidden"
                                                id="photo-upload"
                                            />
                                            <label
                                                htmlFor="photo-upload"
                                                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                                            >
                                                <Camera className="text-gray-400" size={32} />
                                                <span className="text-sm font-medium text-gray-500">Take Daily Photo (Optional)</span>
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="relative rounded-xl overflow-hidden shadow-sm aspect-video bg-black">
                                            <img src={photo} alt="Preview" className="w-full h-full object-contain" />
                                            <button
                                                onClick={() => setPhoto(null)}
                                                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                                            >
                                                <XCircle size={20} />
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        disabled={selectedWorkerIds.length === 0}
                                        onClick={handleBulkPunchIn}
                                        className="w-full group bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-full font-bold shadow-lg shadow-green-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3"
                                    >
                                        <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                                            <LogOut className="rotate-180" size={24} />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-lg leading-none">PUNCH IN {selectedWorkerIds.length > 0 ? `(${selectedWorkerIds.length})` : ''}</span>
                                            <span className="text-[10px] opacity-80 font-medium uppercase tracking-wider">Start Work Day + Selfie</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'PUNCH_OUT' && (
                    <div className="space-y-6">
                        {/* Location Header */}
                        <div className={`p-4 rounded-xl flex items-center justify-center gap-3 shadow-sm ${isLocationVerified ? 'bg-orange-600 text-white' : 'bg-red-50 border border-red-100'}`}>
                            {isLocationVerified ? (
                                <>
                                    <MapPin className="text-white" size={24} />
                                    <span className="font-bold text-lg">Location Verified: {selectedSite?.name}</span>
                                    <div className="bg-white/20 p-1 rounded-full">
                                        <CheckCircle className="text-white" size={20} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <MapPin className="text-red-600" size={24} />
                                    <div className="text-center">
                                        <p className="font-bold text-red-800">Location Not Verified</p>
                                        <p className="text-xs text-red-600 cursor-pointer underline" onClick={verifyLocation}>Tap to Retry</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {isLocationVerified && (() => {
                            // Filter workers eligible for punch out
                            const today = getTodayDateString();
                            const eligibleWorkers = teamWorkers.filter(worker => {
                                const todayRecord = attendance.find(r =>
                                    r.workerId === worker.id &&
                                    r.date === today &&
                                    r.siteId === selectedSite?.id
                                );
                                // Worker must have punched in but not punched out
                                return todayRecord && todayRecord.punchInTime && !todayRecord.punchOutTime;
                            });

                            return (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">WHO'S LEAVING?</h2>
                                        <p className="text-xs text-gray-500 font-medium">(Select workers to punch out)</p>
                                    </div>

                                    {eligibleWorkers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                                            <CheckCircle className="text-gray-300 mb-2" size={48} />
                                            <p className="text-gray-500 font-medium">No workers to punch out</p>
                                            <p className="text-xs text-gray-400 mt-1">All workers have already punched out or haven't punched in yet</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Worker Carousel */}
                                            <div className="flex overflow-x-auto pb-4 gap-4 px-2 snap-x scrollbar-hide">
                                                {eligibleWorkers.map(worker => {
                                                    const isSelected = selectedWorkerIds.includes(worker.id);
                                                    const todayRecord = attendance.find(r =>
                                                        r.workerId === worker.id &&
                                                        r.date === today &&
                                                        r.siteId === selectedSite?.id
                                                    );

                                                    return (
                                                        <div
                                                            key={worker.id}
                                                            onClick={() => toggleWorkerSelection(worker.id)}
                                                            className={`flex-shrink-0 w-32 snap-center flex flex-col items-center gap-2 transition-all duration-200 cursor-pointer ${isSelected ? 'scale-110' : 'opacity-100 scale-95'
                                                                }`}
                                                        >
                                                            <div className={`relative w-24 h-24 rounded-full border-4 shadow-md overflow-hidden ${isSelected
                                                                ? 'border-orange-500 ring-4 ring-orange-100'
                                                                : 'border-gray-200'
                                                                }`}>
                                                                <img
                                                                    src={worker.photoUrl || `https://ui-avatars.com/api/?name=${worker.name}&background=random&size=128`}
                                                                    alt={worker.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                {isSelected && (
                                                                    <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                                                                        <div className="bg-orange-500 rounded-full p-1">
                                                                            <CheckCircle className="text-white w-6 h-6" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {!isSelected && todayRecord && (
                                                                    <div className="absolute top-1 right-1 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                                                        IN
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-center">
                                                                <p className={`font-bold text-sm leading-tight ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{worker.name}</p>
                                                                <p className="text-[10px] text-gray-400 uppercase font-medium">{worker.role}</p>
                                                                {todayRecord?.punchInTime && (
                                                                    <p className="text-[9px] text-green-600 font-medium mt-0.5">
                                                                        In: {format(new Date(todayRecord.punchInTime), 'h:mm a')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Photo & Action */}
                                            <div className="space-y-4 px-2">
                                                {!photo ? (
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            capture="environment"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => setPhoto(reader.result as string);
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                            className="hidden"
                                                            id="punch-out-photo-input"
                                                        />
                                                        <label
                                                            htmlFor="punch-out-photo-input"
                                                            className="flex items-center justify-center gap-3 p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                                                        >
                                                            <Camera className="text-gray-400" size={32} />
                                                            <div className="text-center">
                                                                <p className="font-bold text-gray-700">Take Photo (Optional)</p>
                                                                <p className="text-xs text-gray-500">Tap to capture</p>
                                                            </div>
                                                        </label>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <img src={photo} alt="Punch out" className="w-full h-48 object-cover rounded-xl shadow-md" />
                                                        <button
                                                            onClick={() => setPhoto(null)}
                                                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={async () => {
                                                        if (selectedWorkerIds.length === 0) {
                                                            alert('Please select at least one worker to punch out');
                                                            return;
                                                        }

                                                        setIsSubmitting(true);
                                                        const today = getTodayDateString();
                                                        const punchOutTime = new Date().toISOString();

                                                        try {
                                                            for (const workerId of selectedWorkerIds) {
                                                                const record = attendance.find(r =>
                                                                    r.workerId === workerId &&
                                                                    r.date === today &&
                                                                    r.siteId === selectedSite?.id
                                                                );

                                                                if (record && record.id) {
                                                                    // Update the full record object
                                                                    await updateAttendance({
                                                                        ...record,
                                                                        punchOutTime,
                                                                        punchOutPhoto: photo || undefined
                                                                    });
                                                                }
                                                            }

                                                            setSuccessMessage(`Successfully punched out ${selectedWorkerIds.length} worker(s)`);
                                                            setSelectedWorkerIds([]);
                                                            setPhoto(null);
                                                            setTimeout(() => setSuccessMessage(''), 3000);
                                                        } catch (error) {
                                                            console.error('Punch out error:', error);
                                                            alert('Failed to punch out. Please try again.');
                                                        } finally {
                                                            setIsSubmitting(false);
                                                        }
                                                    }}
                                                    disabled={selectedWorkerIds.length === 0 || isSubmitting}
                                                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${selectedWorkerIds.length === 0 || isSubmitting
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 active:scale-95'
                                                        }`}
                                                >
                                                    {isSubmitting ? 'PUNCHING OUT...' : `PUNCH OUT ${selectedWorkerIds.length > 0 ? `(${selectedWorkerIds.length})` : ''}`}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}



                {activeTab === 'ADVANCE' && (
                    <div className="space-y-6">
                        {/* Site Selector for Advances */}
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Filter by Site</label>
                            {permittedSites.length > 0 ? (
                                <select
                                    value={advanceSiteId}
                                    onChange={(e) => setAdvanceSiteId(e.target.value)}
                                    className="w-full p-2 border rounded-md bg-white"
                                >
                                    {permittedSites.map(site => (
                                        <option key={site.id} value={site.id}>{site.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-sm text-gray-500 italic p-2 border rounded-md bg-gray-50">
                                    All Sites (No specific assignment)
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Team Advances</h3>

                            {/* Week Navigation */}
                            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg mb-4 border border-gray-200">
                                <button onClick={handlePrevAdvanceWeek} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="text-center">
                                    <div className="text-sm font-bold text-gray-800">
                                        {format(advanceWeekStart, 'MMM d')} - {format(advanceWeekEnd, 'MMM d, yyyy')}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
                                        {isSameDay(advanceWeekStart, startOfWeek(new Date(), { weekStartsOn: 0 })) ? 'Current Week' : 'Selected Week'}
                                    </div>
                                </div>
                                <button onClick={handleNextAdvanceWeek} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            {/* Summary Card (Filtered by Week) */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-red-50 p-3 rounded-lg text-center border border-red-100">
                                    <div className="text-xs text-red-600 font-medium uppercase">Total Advances</div>
                                    <div className="text-xl font-bold text-red-700">
                                        ₹{advances
                                            .filter(a => {
                                                const d = parseISO(a.date);
                                                return a.teamId === currentUser?.teamId &&
                                                    !a.notes?.includes('[SETTLEMENT]') &&
                                                    d >= advanceWeekStart && d <= advanceWeekEnd &&
                                                    (!advanceSiteId || a.siteId === advanceSiteId);
                                            })
                                            .reduce((sum, a) => sum + a.amount, 0)
                                            .toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg text-center border border-green-100">
                                    <div className="text-xs text-green-600 font-medium uppercase">Settlements</div>
                                    <div className="text-xl font-bold text-green-700">
                                        ₹{advances
                                            .filter(a => {
                                                const d = parseISO(a.date);
                                                return a.teamId === currentUser?.teamId &&
                                                    a.notes?.includes('[SETTLEMENT]') &&
                                                    d >= advanceWeekStart && d <= advanceWeekEnd &&
                                                    (!advanceSiteId || a.siteId === advanceSiteId);
                                            })
                                            .reduce((sum, a) => sum + a.amount, 0)
                                            .toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Add Advance Form */}
                            <div className="mb-6 border-t pt-4">
                                <h4 className="font-semibold text-gray-700 mb-2">Request New Advance</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-500">Amount (₹)</label>
                                        <input
                                            type="number"
                                            placeholder="Enter Amount"
                                            className="w-full p-2 border rounded-md"
                                            id="rep-advance-amount"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Date</label>
                                        <input
                                            type="date"
                                            defaultValue={getTodayDateString()}
                                            className="w-full p-2 border rounded-md"
                                            id="rep-advance-date"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Notes (Optional)</label>
                                        <textarea
                                            placeholder="Reason for advance..."
                                            className="w-full p-2 border rounded-md resize-none"
                                            rows={2}
                                            id="rep-advance-notes"
                                        />
                                    </div>
                                    <button
                                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                                        onClick={async () => {
                                            const amountInput = document.getElementById('rep-advance-amount') as HTMLInputElement;
                                            const dateInput = document.getElementById('rep-advance-date') as HTMLInputElement;
                                            const notesInput = document.getElementById('rep-advance-notes') as HTMLTextAreaElement;

                                            if (!amountInput.value || !dateInput.value) {
                                                alert('Please enter amount and date');
                                                return;
                                            }

                                            await addAdvance({
                                                teamId: currentUser?.teamId || '',
                                                amount: parseFloat(amountInput.value),
                                                date: dateInput.value,
                                                notes: notesInput.value,
                                                siteId: advanceSiteId // Include siteId
                                            });

                                            amountInput.value = '';
                                            notesInput.value = '';
                                            alert('Advance Recorded Successfully');
                                        }}
                                    >
                                        Record Advance
                                    </button>
                                </div>
                            </div>

                            {/* History (Filtered by Week) */}
                            <div className="border-t pt-2">
                                <h4 className="font-semibold text-gray-700 mb-2 text-sm">History ({format(advanceWeekStart, 'MMM d')} - {format(advanceWeekEnd, 'MMM d')})</h4>
                                <div className="space-y-2">
                                    {advances
                                        .filter(a => {
                                            const d = parseISO(a.date);
                                            return a.teamId === currentUser?.teamId &&
                                                d >= advanceWeekStart && d <= advanceWeekEnd &&
                                                (!advanceSiteId || a.siteId === advanceSiteId);
                                        })
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map(adv => (
                                            <div key={adv.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                                                <div>
                                                    <div className="font-medium text-gray-800">{format(new Date(adv.date), 'dd MMM')}</div>
                                                    <div className="text-xs text-gray-500 truncate max-w-[150px]">{adv.notes?.replace('[SETTLEMENT]', '') || 'No notes'}</div>
                                                </div>
                                                <div className={adv.notes?.includes('[SETTLEMENT]') ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                                    {adv.notes?.includes('[SETTLEMENT]') ? '+' : '-'}₹{adv.amount}
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {advances.filter(a => {
                                        const d = parseISO(a.date);
                                        return a.teamId === currentUser?.teamId &&
                                            d >= advanceWeekStart && d <= advanceWeekEnd &&
                                            (!advanceSiteId || a.siteId === advanceSiteId);
                                    }).length === 0 && (
                                            <div className="text-center text-xs text-gray-400 py-2">No transaction history for this week</div>
                                        )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'REPORT' && (
                    <div className="space-y-4 p-4">
                        {/* Site Filter */}
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">View Report For</label>
                            <select
                                value={reportSiteId}
                                onChange={(e) => setReportSiteId(e.target.value)}
                                className="w-full p-2 border rounded-md bg-white"
                            >
                                <option value="">All Sites</option>
                                {permittedSites.map(site => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
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

                            {/* Sub-tab Content */}
                            <div className="p-4">
                                {reportSubTab === 'ATTENDANCE' && (
                                    <AttendanceReport
                                        userRole={currentUser?.role === 'OWNER' ? 'OWNER' : 'TEAM_REP'}
                                        teamId={currentUser?.teamId}
                                        siteId={reportSiteId || undefined}
                                    />
                                )}
                                {reportSubTab === 'PAYMENT' && (
                                    <PaymentSummary
                                        userRole={currentUser?.role === 'OWNER' ? 'OWNER' : 'TEAM_REP'}
                                        teamId={currentUser?.teamId}
                                        siteId={reportSiteId || undefined}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Location Persistence Modal */}
                {(!isLocationVerified && (locationError || isVerifying) && (activeTab === 'PUNCH_IN' || activeTab === 'PUNCH_OUT')) && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center shadow-xl">

                            {isVerifying ? (
                                <div className="py-8">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <h3 className="text-lg font-bold text-gray-900">Requesting Location...</h3>
                                    <p className="text-sm text-gray-500 mt-2">Please click "Allow" if prompted.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4 bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                        <MapPin className="h-8 w-8 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Location Required</h3>
                                    <p className="text-gray-600 mb-6 leading-relaxed">
                                        We need your location to mark attendance.
                                    </p>

                                    {locationError && (
                                        <div className="mb-6 bg-red-50 border border-red-100 p-3 rounded-lg text-left">
                                            <p className="text-xs text-red-600 font-bold mb-1">Error:</p>
                                            <p className="text-sm text-red-800">{locationError}</p>

                                            {/* Secure Context Warning */}
                                            {!window.isSecureContext && (
                                                <div className="mt-2 pt-2 border-t border-red-200">
                                                    <p className="text-xs text-red-600">
                                                        <strong>Note:</strong> You are on an "insecure" connection (HTTP). Browsers block location on HTTP.
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            setIsLocationVerified(true);
                                                            // Auto-select the first site for testing purposes when bypassing
                                                            if (sites.length > 0) setSelectedSite(sites[0]);
                                                        }}
                                                        className="mt-2 text-xs bg-red-200 hover:bg-red-300 text-red-800 px-2 py-1 rounded w-full"
                                                    >
                                                        [DEV ONLY] Bypass Location Check
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <button
                                            onClick={verifyLocation}
                                            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all text-lg"
                                        >
                                            Yes, Request Again
                                        </button>
                                        <button
                                            onClick={() => navigate('/login')}
                                            className="w-full bg-white text-gray-500 py-3 rounded-xl font-medium hover:text-gray-700 border border-gray-200"
                                        >
                                            No, Log Out
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Add Worker Modal */}
            {
                isAddWorkerModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col max-h-[90vh]">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                                <h3 className="text-lg font-bold text-gray-800">Add New Worker</h3>
                                <button
                                    onClick={() => setIsAddWorkerModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <form id="add-worker-form" onSubmit={handleAddWorker} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                                            value={newWorkerName}
                                            onChange={e => setNewWorkerName(e.target.value)}
                                            placeholder="Enter name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                        <select
                                            required
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                                            value={newWorkerRole}
                                            onChange={e => setNewWorkerRole(e.target.value)}
                                        >
                                            <option value="">Select Role</option>
                                            {teams.find(t => t.id === currentUser?.teamId)?.definedRoles?.map(r => (
                                                <option key={r.name} value={r.name}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                                        <input
                                            type="tel"
                                            required
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                                            value={newWorkerPhone}
                                            onChange={e => setNewWorkerPhone(e.target.value)}
                                            placeholder="Enter phone number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Worker Photo */}
                                            <div className="flex flex-col items-center gap-2 p-3 border rounded-lg bg-gray-50 border-dashed border-gray-300">
                                                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 border flex items-center justify-center shrink-0 relative">
                                                    {newWorkerPhoto ? (
                                                        <img src={newWorkerPhoto} alt="Worker" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon className="text-gray-400" size={24} />
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => setNewWorkerPhoto(reader.result as string);
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                                <span className="text-xs text-center text-gray-500 font-medium">Profile Photo</span>
                                            </div>

                                            {/* Aadhaar Photo */}
                                            <div className="flex flex-col items-center gap-2 p-3 border rounded-lg bg-gray-50 border-dashed border-gray-300">
                                                <div className="w-full h-16 rounded overflow-hidden bg-gray-200 border flex items-center justify-center relative">
                                                    {newWorkerAadhaar ? (
                                                        <img src={newWorkerAadhaar} alt="Aadhaar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <CreditCard className="text-gray-400" size={24} />
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => setNewWorkerAadhaar(reader.result as string);
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                                <span className="text-xs text-center text-gray-500 font-medium">Aadhaar Card</span>
                                            </div>
                                        </div>
                                    </div>

                                </form>
                            </div>

                            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white rounded-b-xl">
                                <button
                                    type="button"
                                    onClick={() => setIsAddWorkerModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="add-worker-form"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm text-sm"
                                >
                                    Add Worker
                                </button>
                            </div>
                        </div>
                    </div >
                )
            }

            {/* Processing Overlay */}
            {isSubmitting && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-[100]">
                    <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center animate-bounce-subtle">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <h3 className="text-lg font-bold text-gray-800">Processing...</h3>
                        <p className="text-sm text-gray-500">Syncing with server</p>
                    </div>
                </div>
            )}

            {/* Bottom Nav */}
            <div className="bg-white border-t flex justify-around p-2 pb-safe shrink-0 z-[60] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <NavButton icon={<LogOut className="rotate-180" />} label="Punch In" active={activeTab === 'PUNCH_IN'} onClick={() => setActiveTab('PUNCH_IN')} />
                <NavButton icon={<LogOut />} label="Punch Out" active={activeTab === 'PUNCH_OUT'} onClick={() => setActiveTab('PUNCH_OUT')} />
                <NavButton icon={<CreditCard />} label="Advance" active={activeTab === 'ADVANCE'} onClick={() => setActiveTab('ADVANCE')} />
                <NavButton icon={<FileText />} label="Report" active={activeTab === 'REPORT'} onClick={() => setActiveTab('REPORT')} />
            </div>
        </div >
    );
};

const NavButton = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={clsx("flex flex-col items-center p-2 rounded-lg w-full", active ? "text-blue-600" : "text-gray-400 hover:text-gray-600")}>
        <div className="mb-1">{icon}</div>
        <span className="text-xs font-medium">{label}</span>
    </button>
);
