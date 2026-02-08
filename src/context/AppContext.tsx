import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Team, Site, Worker, AttendanceRecord, AdvancePayment, Role } from '../types';
import { loadData, INITIAL_DATA } from '../services/mockData';
import * as api from '../services/supabaseService';
import { calculateDutyPoints } from '../utils/wageUtils';

interface AppState {
    currentUser: User | null;
    users: User[];
    teams: Team[];
    sites: Site[];
    workers: Worker[];
    attendance: AttendanceRecord[];
    advances: AdvancePayment[];
}

interface AppContextType extends AppState {
    login: (username: string, password: string) => Promise<User | null>;
    logout: () => void;
    addTeam: (team: Team) => void;
    addWorker: (worker: Worker) => void;
    updateWorker: (worker: Worker) => void;
    addSite: (site: Site) => void;
    recordAttendance: (record: AttendanceRecord) => void;
    addAdvance: (advance: Omit<AdvancePayment, 'id'>) => void;
    updateAdvance: (id: string, advance: Partial<AdvancePayment>) => void;
    deleteAdvance: (id: string) => void;
    approveWorker: (workerId: string) => void;
    updateAttendance: (record: AttendanceRecord) => void;
    updateTeam: (team: Team) => void;
    addUser: (user: User) => void;
    updateUserPassword: (userId: string, newPassword: string) => void;
    updateUserStatus: (userId: string, isLocked: boolean) => void;
    deleteUser: (userId: string) => void;
    deleteAttendance: (id: string) => void;
    refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AppState>(() => {
        // Synchronously check localStorage on initialization
        let initialUser = null;
        try {
            const savedUser = localStorage.getItem('eternal_ride_user');
            const savedTimestamp = localStorage.getItem('eternal_ride_auth_time');

            if (savedUser && savedTimestamp) {
                const timeDiff = Date.now() - parseInt(savedTimestamp, 10);
                if (timeDiff < 30 * 60 * 1000) {
                    initialUser = JSON.parse(savedUser);
                } else {
                    localStorage.removeItem('eternal_ride_user');
                    localStorage.removeItem('eternal_ride_auth_time');
                }
            }
        } catch (e) {
            console.error("Error reading from local storage", e);
        }

        return {
            currentUser: initialUser,
            users: INITIAL_DATA.users,
            teams: [],
            sites: [],
            workers: [],
            attendance: [],
            advances: [],
        };
    });

    // Load data from Supabase on mount
    const loadSupabaseData = async () => {
        try {
            const [teams, workers, sites, attendance, advances, dbUsers] = await Promise.all([
                api.fetchTeams(),
                api.fetchWorkers(),
                api.fetchSites(),
                api.fetchAttendance(),
                api.fetchAdvances(),
                api.fetchAppUsers()
            ]);

            const freshUsers = dbUsers.length > 0 ? dbUsers : INITIAL_DATA.users;

            setState(prev => {
                let updatedCurrentUser = prev.currentUser;
                // Sync current user with fresh data
                if (updatedCurrentUser) {
                    const freshUser = freshUsers.find(u => u.id === updatedCurrentUser!.id);
                    if (freshUser) {
                        updatedCurrentUser = freshUser;
                    }
                }

                return {
                    ...prev,
                    teams,
                    workers,
                    sites,
                    attendance,
                    advances,
                    users: freshUsers,
                    currentUser: updatedCurrentUser
                };
            });
        } catch (error) {
            console.error("Failed to load data from Supabase:", error);
            // Ensure users are loaded even if DB fails
            setState(prev => ({ ...prev, users: INITIAL_DATA.users }));
        }
    };

    useEffect(() => {
        loadSupabaseData();
    }, []);

    const refreshData = async () => {
        await loadSupabaseData();
    };

    // Effect to enforce lock status
    useEffect(() => {
        if (state.currentUser?.isLocked) {
            console.log("Enforcing lock on current user");
            logout();
            alert("Your account is locked. Logging out.");
        }
    }, [state.currentUser, state.users]); // Check when user or users list updates

    const login = async (username: string, password: string) => {
        // Debugging
        console.log("Attempting login:", { username, password });
        console.log("Current Users in State:", state.users);

        const user = state.users.find(u => u.username === username && u.password === password);
        if (user) {
            if (user.isLocked) {
                console.log("Login failed: User is locked");
                alert("This user is locked. Contact Admin.");
                return null;
            }

            console.log("Login successful:", user);
            // Persist session
            localStorage.setItem('eternal_ride_user', JSON.stringify(user));
            localStorage.setItem('eternal_ride_auth_time', Date.now().toString());

            setState(prev => ({ ...prev, currentUser: user }));
            return user;
        }
        console.log("Login failed");
        return null;
    };

    const logout = () => {
        localStorage.removeItem('eternal_ride_user');
        localStorage.removeItem('eternal_ride_auth_time');
        setState(prev => ({ ...prev, currentUser: null }));
    };

    const addTeam = async (team: Team) => {
        try {
            const newTeam = await api.createTeam(team);
            // Re-fetch to ensure sync or push to state
            // For simplicity, we assume success and push to local state to avoid full reload
            // But ideally we use the returned object which might have a different ID if generated by DB
            setState(prev => ({ ...prev, teams: [...prev.teams, { ...team, id: newTeam ? newTeam.id : team.id }] }));
        } catch (error) {
            console.error("Error adding team:", error);
        }
    };

    const addWorker = async (worker: Worker) => {
        try {
            const newWorker = await api.createWorker(worker);
            setState(prev => ({ ...prev, workers: [...prev.workers, { ...worker, id: newWorker ? newWorker.id : worker.id }] }));
        } catch (error) {
            console.error("Error adding worker:", error);
        }
    };

    const updateWorker = async (updatedWorker: Worker) => {
        try {
            await api.updateWorkerStatus(updatedWorker.id, updatedWorker);
            setState(prev => ({
                ...prev,
                workers: prev.workers.map(w => w.id === updatedWorker.id ? updatedWorker : w)
            }));
        } catch (error) {
            console.error("Error updating worker:", error);
        }
    };

    const approveWorker = async (workerId: string) => {
        try {
            await api.updateWorkerStatus(workerId, { approved: true });

            // Optimistic update
            setState(prev => ({
                ...prev,
                workers: prev.workers.map(w => w.id === workerId ? { ...w, approved: true } : w)
            }));

            // Refresh ensure data consistency
            // refreshData(); // Optional: might be too heavy?
        } catch (error) {
            console.error("Error approving worker:", error);
            alert("Failed to approve worker. Please try again.");
            // Revert optimistic update if needed? For now straightforward.
        }
    };

    const updateAttendance = async (updatedRecord: AttendanceRecord) => {
        try {
            await api.updateAttendanceById(updatedRecord.id, updatedRecord);
            setState(prev => ({
                ...prev,
                attendance: prev.attendance.map(a => a.id === updatedRecord.id ? updatedRecord : a)
            }));
        } catch (error) {
            console.error("Error updating attendance:", error);
            throw error;
        }
    };

    const addSite = async (site: Site) => {
        try {
            const newSite = await api.createSite(site);
            setState(prev => ({ ...prev, sites: [...prev.sites, { ...site, id: newSite ? newSite.id : site.id }] }));
        } catch (error) {
            console.error("Error adding site:", error);
        }
    };

    const recordAttendance = async (record: AttendanceRecord) => {
        try {
            let recordToSave = { ...record };

            // Calculate Duty Points if checking out
            if (record.punchInTime && record.punchOutTime) {
                const points = calculateDutyPoints(new Date(record.punchInTime), new Date(record.punchOutTime));
                recordToSave.dutyPoints = points;

                // Auto-update status based on points
                if (points >= 1.0) {
                    recordToSave.status = 'PRESENT';
                } else if (points > 0) {
                    recordToSave.status = 'HALF_DAY';
                } else {
                    // Start with Present? Or Absent? If 0 points but worked, maybe still 'PRESENT' but 0 pay?
                    // User said "prevent earning full day's wage". 
                    // Let's default to HALF_DAY if checked out but 0 points? Or maybe 'PRESENT' but wage calculation uses points?
                    // For now, let's trust the points.
                    recordToSave.status = 'ABSENT'; // Or maybe leave as is?
                }
            }

            const newRecord = await api.recordAttendance(recordToSave);
            // Handle upsert logic locally if needed, but for now just appending or replacing
            setState(prev => {
                const existing = prev.attendance.find(a => a.workerId === record.workerId && a.date === record.date);
                if (existing) {
                    return {
                        ...prev,
                        attendance: prev.attendance.map(a => a.workerId === record.workerId && a.date === record.date ? newRecord || recordToSave : a)
                    };
                }
                return { ...prev, attendance: [...prev.attendance, newRecord || recordToSave] };
            });
        } catch (error) {
            console.error("Error recording attendance:", error);
        }
    };

    const addAdvance = async (advance: Omit<AdvancePayment, 'id'>) => {
        try {
            const newAdvance = await api.createAdvance(advance as AdvancePayment); // Type assertion as service expects object to insert
            setState(prev => ({
                ...prev,
                advances: [...prev.advances, { ...advance, id: newAdvance ? newAdvance.id : 'temp-id-' + Date.now() }]
            }));
        } catch (error) {
            console.error("Error adding advance:", error);
        }
    };

    const updateAdvance = async (id: string, advance: Partial<AdvancePayment>) => {
        try {
            await api.updateAdvance(id, advance);
            setState(prev => ({
                ...prev,
                advances: prev.advances.map(a => a.id === id ? { ...a, ...advance } : a)
            }));
        } catch (error) {
            console.error("Error updating advance:", error);
        }
    };

    const deleteAdvance = async (id: string) => {
        try {
            await api.deleteAdvance(id);
            setState(prev => ({
                ...prev,
                advances: prev.advances.filter(a => a.id !== id)
            }));
        } catch (error) {
            console.error("Error deleting advance:", error);
        }
    };

    const updateTeam = async (updatedTeam: Team) => {
        try {
            await api.updateTeam(updatedTeam.id, updatedTeam);
            setState(prev => ({
                ...prev,
                teams: prev.teams.map(t => t.id === updatedTeam.id ? updatedTeam : t)
            }));
        } catch (error) {
            console.error("Error updating team:", error);
            alert("Failed to update team settings");
        }
    };

    // User Management Functions
    const addUser = async (user: User) => {
        try {
            const newUser = await api.createAppUser(user);
            setState(prev => ({
                ...prev,
                users: [...prev.users, { ...user, id: newUser ? newUser.id : user.id }]
            }));
        } catch (error: any) {
            console.error("Error adding user:", error);
            alert(`Failed to add user: ${error.message}`);
        }
    };

    const updateUserPassword = async (userId: string, newPassword: string) => {
        try {
            await api.updateAppUser(userId, { password: newPassword });
            setState(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === userId ? { ...u, password: newPassword } : u)
            }));
            alert("Password updated successfully");
        } catch (error: any) {
            console.error("Error updating password:", error);
            alert(`Failed to update password: ${error.message}`);
        }
    };

    const updateUserStatus = async (userId: string, isLocked: boolean) => {
        try {
            await api.updateAppUser(userId, { isLocked });
            setState(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === userId ? { ...u, isLocked } : u)
            }));
        } catch (error: any) {
            console.error("Error updating user status:", error);
            alert(`Failed to update user status: ${error.message}`);
        }
    };

    const deleteUser = async (userId: string) => {
        try {
            await api.deleteAppUser(userId);
            setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
        } catch (error: any) {
            console.error("Error deleting user:", error);
            alert(`Failed to delete user: ${error.message}`);
        }
    };

    const deleteAttendance = async (id: string) => {
        try {
            await api.deleteAttendance(id);
            setState(prev => ({
                ...prev,
                attendance: prev.attendance.filter(a => a.id !== id)
            }));
        } catch (error) {
            console.error("Error deleting attendance:", error);
            alert("Failed to delete attendance record");
        }
    };

    return (
        <AppContext.Provider value={{
            ...state,
            login,
            logout,
            addTeam,
            addWorker,
            updateWorker,
            addSite,
            recordAttendance,
            addAdvance,
            updateAdvance,
            deleteAdvance,
            approveWorker,
            updateAttendance,
            updateTeam,
            addUser,
            updateUserPassword,
            updateUserStatus,
            deleteUser,
            deleteAttendance,
            refreshData
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
