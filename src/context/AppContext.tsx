import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Team, Site, Worker, AttendanceRecord, AdvancePayment, Role, Client, Contract, Milestone, EstimateItem, ClientPayment } from '../types';
import { loadData, INITIAL_DATA } from '../services/mockData';
import * as api from '../services/apiService';
import { calculateDutyPoints } from '../utils/wageUtils';
import { getTodayDateString } from '../utils/dateUtils';

interface AppState {
    currentUser: User | null;
    users: User[];
    teams: Team[];
    sites: Site[];
    workers: Worker[];
    attendance: AttendanceRecord[];
    missingPunchOuts: AttendanceRecord[];
    advances: AdvancePayment[];
    clients: Client[];
    contracts: Contract[];
    milestones: Milestone[];
    estimateItems: EstimateItem[];
    clientPayments: ClientPayment[];
    isLoading: boolean;
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
    updateUser: (userId: string, role: Role, teamId?: string) => void;
    updateUserStatus: (userId: string, isLocked: boolean) => void;
    deleteUser: (userId: string) => void;
    deleteAttendance: (id: string) => void;
    updateSite: (site: Site) => void;
    deleteSite: (siteId: string) => void;
    deleteWorker: (workerId: string) => void;
    deleteTeam: (teamId: string) => void;
    refreshData: () => Promise<void>;
    // Client Portal Methods
    addClient: (client: Omit<Client, 'id'>) => Promise<void>;
    updateClient: (id: string, client: Partial<Client>) => Promise<void>;
    addContract: (contract: Omit<Contract, 'id'>) => Promise<void>;
    updateContract: (id: string, contract: Partial<Contract>) => Promise<void>;
    addMilestone: (milestone: Omit<Milestone, 'id'>) => Promise<void>;
    updateMilestone: (id: string, milestone: Partial<Milestone>) => Promise<void>;
    addEstimateItem: (item: Omit<EstimateItem, 'id'>) => Promise<void>;
    updateEstimateItem: (id: string, item: Partial<EstimateItem>) => Promise<void>;
    deleteEstimateItem: (id: string) => Promise<void>;
    addClientPayment: (payment: Omit<ClientPayment, 'id'>) => Promise<void>;
    updateClientPayment: (id: string, payment: Partial<ClientPayment>) => Promise<void>;
    fetchClientData: (contractId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AppState>(() => {
        // Synchronously check localStorage on initialization
        let initialUser = null;
        try {
            const savedUser = localStorage.getItem('thulir_erp_user');
            const savedTimestamp = localStorage.getItem('thulir_erp_auth_time');

            if (savedUser && savedTimestamp) {
                const timeDiff = Date.now() - parseInt(savedTimestamp, 10);
                if (timeDiff < 30 * 60 * 1000) {
                    initialUser = JSON.parse(savedUser);
                } else {
                    localStorage.removeItem('thulir_erp_user');
                    localStorage.removeItem('thulir_erp_auth_time');
                }
            }
        } catch (e) {
            console.error("Failed to parse saved user", e);
        }

        return {
            currentUser: initialUser,
            users: INITIAL_DATA.users,
            teams: [],
            sites: [],
            workers: [],
            attendance: [],
            missingPunchOuts: [],
            advances: [],
            clients: [],
            contracts: [],
            milestones: [],
            estimateItems: [],
            clientPayments: [],
            isLoading: true,
        };
    });

    // Load data from Supabase on mount
    const loadSupabaseData = async () => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            // Calculate date range for bandwidth optimization (last 14 days)
            // This covers almost all active usage scenarios (current week + overlap)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 14);

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // 1. Fetch all data (Simple, no optimization for now to ensure stability)
            const [teams, workers, sites, attendance, advances, dbUsers] = await Promise.all([
                api.fetchTeams(),
                api.fetchWorkers(), // No params, fetch everything
                api.fetchSites(),
                api.fetchAttendance(startDateStr, endDateStr),
                api.fetchAdvances(startDateStr, endDateStr),
                api.fetchAppUsers()
            ]);

            // Removed Smart Image Sync logic to resolve "missing details" bug.

            const freshUsers = dbUsers.length > 0 ? dbUsers : INITIAL_DATA.users;

            // Calculate missing punch outs locally to ensure consistency
            const today = getTodayDateString();
            const derivedMissingPunchOuts = attendance.filter(a => {
                return !a.punchOutTime && a.date < today;
            });

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
                    missingPunchOuts: derivedMissingPunchOuts,
                    advances,
                    users: freshUsers,
                    currentUser: updatedCurrentUser
                };
            });
        } catch (error) {
            console.error("Failed to load data from Supabase:", error);
            // Ensure users are loaded even if DB fails
            setState(prev => ({ ...prev, users: INITIAL_DATA.users }));
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
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

        let user = null;
        try {
            console.log("Verifying credentials via API...");
            user = await api.login(username, password);
        } catch (e) {
            console.error("Login RPC failed", e);
        }

        if (user) {
            if (user.isLocked) {
                console.log("Login failed: User is locked");
                alert("This user is locked. Contact Admin.");
                return null;
            }

            console.log("Login successful:", user);
            // Persist session
            localStorage.setItem('thulir_erp_user', JSON.stringify(user));
            localStorage.setItem('thulir_erp_auth_time', Date.now().toString());

            setState(prev => ({ ...prev, currentUser: user }));
            return user;
        }
        console.log("Login failed");
        return null;
    };

    const logout = () => {
        localStorage.removeItem('thulir_erp_user');
        localStorage.removeItem('thulir_erp_auth_time');
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
            // Attendance Record usually doesn't need ID for update in our specific logic, but let's assume update logic
            // apiService expects a record to create, but for update we might need a specific endpoint
            // Our previous supabase service had updateAttendanceById. apiService has recordAttendance (which is upsert).
            // Let's use recordAttendance as it handles upsert based on worker+date
            await api.recordAttendance(updatedRecord);
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

    const updateSite = async (updatedSite: Site) => {
        try {
            await api.updateSite(updatedSite.id, updatedSite);
            setState(prev => ({
                ...prev,
                sites: prev.sites.map(s => s.id === updatedSite.id ? updatedSite : s)
            }));
        } catch (error) {
            console.error("Error updating site:", error);
            alert("Failed to update site details.");
        }
    };

    const deleteSite = async (siteId: string) => {
        if (!window.confirm("Are you sure you want to delete this site? This cannot be undone.")) return;

        try {
            await api.deleteSite(siteId);
            setState(prev => ({
                ...prev,
                sites: prev.sites.filter(s => s.id !== siteId)
            }));
        } catch (error) {
            console.error("Error deleting site:", error);
            alert("Failed to delete site. Ensure no active punch-ins are linked to it.");
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

    const updateUser = async (userId: string, role: Role, teamId?: string) => {
        try {
            await api.updateAppUser(userId, { role, teamId: teamId || undefined });
            setState(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === userId ? { ...u, role, teamId } : u)
            }));
            alert("User updated successfully");
        } catch (error: any) {
            console.error("Error updating user:", error);
            alert(`Failed to update user: ${error.message}`);
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

    const deleteWorker = async (workerId: string) => {
        if (!window.confirm("Are you sure you want to delete this worker? This cannot be undone.")) return;

        try {
            await api.deleteWorker(workerId);
            setState(prev => ({
                ...prev,
                workers: prev.workers.filter(w => w.id !== workerId)
            }));
        } catch (error) {
            console.error("Error deleting worker:", error);
            alert("Failed to delete worker.");
        }
    };

    const deleteTeam = async (teamId: string) => {
        if (!window.confirm("Are you sure you want to delete this team? This cannot be undone.")) return;

        try {
            await api.deleteTeam(teamId);
            setState(prev => ({
                ...prev,
                teams: prev.teams.filter(t => t.id !== teamId)
            }));
        } catch (error) {
            console.error("Error deleting team:", error);
            alert("Failed to delete team.");
        }
    };

    // Client Portal Methods
    const addClient = async (client: Omit<Client, 'id'>) => {
        try {
            const newClient = await api.createClient(client);
            setState(prev => ({
                ...prev,
                clients: [...prev.clients, newClient]
            }));
        } catch (error) {
            console.error("Error adding client:", error);
            alert("Failed to add client.");
            throw error;
        }
    };

    const updateClient = async (id: string, updates: Partial<Client>) => {
        try {
            await api.updateClient(id, updates);
            setState(prev => ({
                ...prev,
                clients: prev.clients.map(c => c.id === id ? { ...c, ...updates } : c)
            }));
        } catch (error) {
            console.error("Error updating client:", error);
            alert("Failed to update client.");
            throw error;
        }
    };

    const addContract = async (contract: Omit<Contract, 'id'>) => {
        try {
            const newContract = await api.createContract(contract);
            setState(prev => ({
                ...prev,
                contracts: [...prev.contracts, newContract]
            }));
        } catch (error) {
            console.error("Error adding contract:", error);
            alert("Failed to add contract.");
            throw error;
        }
    };

    const updateContract = async (id: string, updates: Partial<Contract>) => {
        try {
            await api.updateContract(id, updates);
            setState(prev => ({
                ...prev,
                contracts: prev.contracts.map(c => c.id === id ? { ...c, ...updates } : c)
            }));
        } catch (error) {
            console.error("Error updating contract:", error);
            alert("Failed to update contract.");
            throw error;
        }
    };

    const addMilestone = async (milestone: Omit<Milestone, 'id'>) => {
        try {
            const newMilestone = await api.createMilestone(milestone);
            setState(prev => ({
                ...prev,
                milestones: [...prev.milestones, newMilestone]
            }));
        } catch (error) {
            console.error("Error adding milestone:", error);
            alert("Failed to add milestone.");
            throw error;
        }
    };

    const updateMilestone = async (id: string, updates: Partial<Milestone>) => {
        try {
            await api.updateMilestone(id, updates);
            setState(prev => ({
                ...prev,
                milestones: prev.milestones.map(m => m.id === id ? { ...m, ...updates } : m)
            }));
        } catch (error) {
            console.error("Error updating milestone:", error);
            alert("Failed to update milestone.");
            throw error;
        }
    };

    const addEstimateItem = async (item: Omit<EstimateItem, 'id'>) => {
        try {
            const newItem = await api.createEstimateItem(item);
            setState(prev => ({
                ...prev,
                estimateItems: [...prev.estimateItems, newItem]
            }));
        } catch (error) {
            console.error("Error adding estimate item:", error);
            alert("Failed to add estimate item.");
            throw error;
        }
    };

    const updateEstimateItem = async (id: string, updates: Partial<EstimateItem>) => {
        try {
            await api.updateEstimateItem(id, updates);
            setState(prev => ({
                ...prev,
                estimateItems: prev.estimateItems.map(i => i.id === id ? { ...i, ...updates } : i)
            }));
        } catch (error) {
            console.error("Error updating estimate item:", error);
            alert("Failed to update estimate item.");
            throw error;
        }
    };

    const deleteEstimateItem = async (id: string) => {
        try {
            await api.deleteEstimateItem(id);
            setState(prev => ({
                ...prev,
                estimateItems: prev.estimateItems.filter(i => i.id !== id)
            }));
        } catch (error) {
            console.error("Error deleting estimate item:", error);
            alert("Failed to delete estimate item.");
            throw error;
        }
    };

    const addClientPayment = async (payment: Omit<ClientPayment, 'id'>) => {
        try {
            const newPayment = await api.createClientPayment(payment);
            setState(prev => ({
                ...prev,
                clientPayments: [...prev.clientPayments, newPayment]
            }));
        } catch (error) {
            console.error("Error adding client payment:", error);
            alert("Failed to add client payment.");
            throw error;
        }
    };

    const updateClientPayment = async (id: string, updates: Partial<ClientPayment>) => {
        try {
            await api.updateClientPayment(id, updates);
            setState(prev => ({
                ...prev,
                clientPayments: prev.clientPayments.map(p => p.id === id ? { ...p, ...updates } : p)
            }));
        } catch (error) {
            console.error("Error updating client payment:", error);
            alert("Failed to update client payment.");
            throw error;
        }
    };

    const fetchClientData = async (contractId: string) => {
        try {
            const [milestones, estimateItems, clientPayments] = await Promise.all([
                api.fetchMilestones(contractId),
                api.fetchEstimateItems(contractId),
                api.fetchClientPayments(contractId, true) // true = client view (RECEIVED only)
            ]);
            setState(prev => ({
                ...prev,
                milestones,
                estimateItems,
                clientPayments
            }));
        } catch (error) {
            console.error("Error fetching client data:", error);
            alert("Failed to load client data.");
            throw error;
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
            updateUser,
            updateUserStatus,
            deleteUser,
            deleteAttendance,
            updateSite,
            deleteSite,
            deleteWorker,
            deleteTeam,
            refreshData,
            // Client Portal Methods
            addClient,
            updateClient,
            addContract,
            updateContract,
            addMilestone,
            updateMilestone,
            addEstimateItem,
            updateEstimateItem,
            deleteEstimateItem,
            addClientPayment,
            updateClientPayment,
            fetchClientData
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
