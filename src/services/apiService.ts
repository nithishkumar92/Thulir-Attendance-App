import { User, Worker, Team, Site, AttendanceRecord, AdvancePayment, Client, Contract, Milestone, EstimateItem, ClientPayment } from '../types';
import { INITIAL_DATA } from './mockData';

const API_BASE = '/api'; // Vercel routes /api -> api/ folder
const USE_MOCK_DATA = false; // Set to FALSE to use Real Database

const headers = {
    'Content-Type': 'application/json'
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- AUTH ---

export const login = async (username: string, password: string): Promise<User | null> => {
    if (USE_MOCK_DATA) {
        await delay(500);
        const user = INITIAL_DATA.users.find(u => u.username === username && u.password === password);
        return user || null;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Login failed:', error);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Login network error:', error);
        return null;
    }
};

// --- WORKERS ---

export const fetchWorkers = async (): Promise<Worker[]> => {
    if (USE_MOCK_DATA) {
        await delay(300);
        return INITIAL_DATA.workers;
    }
    // Added no-store to force browser to drop the cached "excludePhotos" response
    // ensuring the user gets the full worker object.
    const response = await fetch(`${API_BASE}/workers`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch workers');
    return response.json();
};

export const fetchWorkerDetails = async (id: string): Promise<Worker> => {
    if (USE_MOCK_DATA) {
        await delay(300);
        return INITIAL_DATA.workers.find(w => w.id === id) as Worker;
    }
    const response = await fetch(`${API_BASE}/workers?id=${id}`);
    if (!response.ok) throw new Error('Failed to fetch worker details');
    return response.json();
}

export const createWorker = async (worker: Partial<Worker>): Promise<Worker> => {
    if (USE_MOCK_DATA) {
        await delay(300);
        return { ...worker, id: `w_${Date.now()}` } as Worker;
    }
    const response = await fetch(`${API_BASE}/workers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(worker)
    });
    if (!response.ok) throw new Error('Failed to create worker');
    return response.json();
};

export const deleteWorker = async (workerId: string) => {
    const response = await fetch(`${API_BASE}/workers?id=${workerId}`, {
        method: 'DELETE',
        headers
    });
    if (!response.ok) console.warn('Delete worker failed or not implemented');
};

export const updateWorkerStatus = async (workerId: string, updates: Partial<Worker>) => {
    // Note: We need to implement PATCH /api/workers or PUT /api/workers/:id
    // For now assuming the endpoint handles it or we'll add it
    // Let's implement a generic update endpoint or specific one
    // We haven't implemented PATCH in api/workers yet, so this might fail unless we add it.
    // For now, let's assume we'll fix the API to support PATCH or ID-based routing
    const response = await fetch(`${API_BASE}/workers?id=${workerId}`, { // Query param for ID if using single file
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: workerId, ...updates }) // Ensure ID is in body too
    });
    // If not implemented, we log warning
    if (response.status === 405 || response.status === 404) {
        console.warn('Update worker API not implemented yet');
    }
};


// --- TEAMS ---

export const fetchTeams = async (): Promise<Team[]> => {
    if (USE_MOCK_DATA) {
        await delay(300);
        return INITIAL_DATA.teams;
    }
    const response = await fetch(`${API_BASE}/teams`);
    if (!response.ok) throw new Error('Failed to fetch teams');
    return response.json();
};

export const createTeam = async (team: Partial<Team>): Promise<Team> => {
    const response = await fetch(`${API_BASE}/teams`, {
        method: 'POST',
        headers,
        body: JSON.stringify(team)
    });
    if (!response.ok) throw new Error('Failed to create team');
    return response.json();
};

export const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    const response = await fetch(`${API_BASE}/teams`, { // Assuming we add PATCH /teams or handle in POST
        method: 'PATCH', // Need to implement this in backend
        headers,
        body: JSON.stringify({ id: teamId, ...updates })
    });
    if (!response.ok) console.warn('Update team failed or not implemented in backend');
};

export const deleteTeam = async (teamId: string) => {
    const response = await fetch(`${API_BASE}/teams?id=${teamId}`, {
        method: 'DELETE',
        headers
    });
    if (!response.ok) console.warn('Delete team failed or not implemented in backend');
};

// --- SITES ---

export const fetchSites = async (): Promise<Site[]> => {
    if (USE_MOCK_DATA) {
        await delay(300);
        return INITIAL_DATA.sites;
    }
    const response = await fetch(`${API_BASE}/sites`);
    if (!response.ok) throw new Error('Failed to fetch sites');
    return response.json();
};

export const createSite = async (site: Partial<Site>): Promise<Site> => {
    const response = await fetch(`${API_BASE}/sites`, {
        method: 'POST',
        headers,
        body: JSON.stringify(site)
    });
    if (!response.ok) throw new Error('Failed to create site');
    return response.json();
};

export const updateSite = async (siteId: string, updates: Partial<Site>) => {
    const response = await fetch(`${API_BASE}/sites`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: siteId, ...updates })
    });
    if (!response.ok) console.warn('Update site failed or not implemented');
};

export const deleteSite = async (siteId: string) => {
    const response = await fetch(`${API_BASE}/sites?id=${siteId}`, {
        method: 'DELETE',
        headers
    });
    if (!response.ok) console.warn('Delete site failed or not implemented');
};


// --- ATTENDANCE ---

export const fetchAttendance = async (startDate?: string, endDate?: string): Promise<AttendanceRecord[]> => {
    if (USE_MOCK_DATA) {
        await delay(300);
        return INITIAL_DATA.attendance;
    }

    let url = `${API_BASE}/attendance`;
    if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch attendance');
    return response.json();
};

export const recordAttendance = async (record: AttendanceRecord): Promise<AttendanceRecord> => {
    if (USE_MOCK_DATA) {
        await delay(300);
        // In real app we upsert, here just return
        return record;
    }
    const response = await fetch(`${API_BASE}/attendance`, {
        method: 'POST',
        headers,
        body: JSON.stringify(record)
    });
    if (!response.ok) throw new Error('Failed to record attendance');
    return response.json();
};

export const deleteAttendance = async (id: string) => {
    const response = await fetch(`${API_BASE}/attendance?id=${id}`, {
        method: 'DELETE',
        headers
    });
    if (!response.ok) console.warn('Delete attendance failed or not implemented');
};


// --- ADVANCES ---

export const fetchAdvances = async (startDate?: string, endDate?: string): Promise<AdvancePayment[]> => {
    if (USE_MOCK_DATA) {
        await delay(300);
        return INITIAL_DATA.advances;
    }

    let url = `${API_BASE}/advances`;
    if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch advances');
    return response.json();
};

export const createAdvance = async (advance: AdvancePayment): Promise<AdvancePayment> => {
    if (USE_MOCK_DATA) {
        await delay(300);
        return { ...advance, id: `adv_${Date.now()}` };
    }
    const response = await fetch(`${API_BASE}/advances`, {
        method: 'POST',
        headers,
        body: JSON.stringify(advance)
    });
    if (!response.ok) throw new Error('Failed to create advance');
    return response.json();
};

export const updateAdvance = async (id: string, updates: Partial<AdvancePayment>) => {
    const response = await fetch(`${API_BASE}/advances`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id, ...updates })
    });
    if (!response.ok) console.warn('Update advance failed or not implemented');
};

export const deleteAdvance = async (id: string) => {
    const response = await fetch(`${API_BASE}/advances?id=${id}`, {
        method: 'DELETE',
        headers
    });
    if (!response.ok) console.warn('Delete advance failed or not implemented');
};


// --- USERS ---

export const fetchAppUsers = async (): Promise<User[]> => {
    if (USE_MOCK_DATA) {
        await delay(300);
        return INITIAL_DATA.users;
    }
    const response = await fetch(`${API_BASE}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
};

export const createAppUser = async (user: Partial<User>): Promise<User> => {
    if (USE_MOCK_DATA) {
        await delay(300);
        return { ...user, id: `u_${Date.now()}` } as User;
    }
    const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(user)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create user');
    }
    return response.json();
};

export const updateAppUser = async (userId: string, updates: Partial<User>) => {
    const response = await fetch(`${API_BASE}/users`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: userId, ...updates })
    });
    if (!response.ok) throw new Error('Failed to update user');
};

export const deleteAppUser = async (userId: string) => {
    const response = await fetch(`${API_BASE}/users?id=${userId}`, {
        method: 'DELETE',
        headers
    });
    if (!response.ok) throw new Error('Failed to delete user');
};

// --- CLIENTS ---

export const fetchClients = async (): Promise<Client[]> => {
    const response = await fetch(`${API_BASE}/client-portal?resource=clients`);
    if (!response.ok) throw new Error('Failed to fetch clients');
    return response.json();
};

export const createClient = async (client: Partial<Client>): Promise<Client> => {
    const response = await fetch(`${API_BASE}/client-portal?resource=clients`, {
        method: 'POST',
        headers,
        body: JSON.stringify(client)
    });
    if (!response.ok) throw new Error('Failed to create client');
    return response.json();
};

export const updateClient = async (clientId: string, updates: Partial<Client>) => {
    const response = await fetch(`${API_BASE}/client-portal?resource=clients`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: clientId, ...updates })
    });
    if (!response.ok) throw new Error('Failed to update client');
};

// --- CONTRACTS ---

export const fetchContracts = async (clientId?: string): Promise<Contract[]> => {
    let url = `${API_BASE}/client-portal?resource=contracts`;
    if (clientId) url += `&clientId=${clientId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch contracts');
    return response.json();
};

export const createContract = async (contract: Partial<Contract>): Promise<Contract> => {
    const response = await fetch(`${API_BASE}/client-portal?resource=contracts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(contract)
    });
    if (!response.ok) throw new Error('Failed to create contract');
    return response.json();
};

export const updateContract = async (contractId: string, updates: Partial<Contract>) => {
    const response = await fetch(`${API_BASE}/client-portal?resource=contracts`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: contractId, ...updates })
    });
    if (!response.ok) throw new Error('Failed to update contract');
};

// --- MILESTONES ---

export const fetchMilestones = async (contractId: string): Promise<Milestone[]> => {
    const response = await fetch(`${API_BASE}/client-portal?resource=milestones&contractId=${contractId}`);
    if (!response.ok) throw new Error('Failed to fetch milestones');
    return response.json();
};

export const createMilestone = async (milestone: Partial<Milestone>): Promise<Milestone> => {
    const response = await fetch(`${API_BASE}/client-portal?resource=milestones`, {
        method: 'POST',
        headers,
        body: JSON.stringify(milestone)
    });
    if (!response.ok) throw new Error('Failed to create milestone');
    return response.json();
};

export const updateMilestone = async (milestoneId: string, updates: Partial<Milestone>) => {
    const response = await fetch(`${API_BASE}/client-portal?resource=milestones`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: milestoneId, ...updates })
    });
    if (!response.ok) throw new Error('Failed to update milestone');
};

// --- ESTIMATE ITEMS ---

export const fetchEstimateItems = async (contractId: string): Promise<EstimateItem[]> => {
    const response = await fetch(`${API_BASE}/client-portal?resource=estimate-items&contractId=${contractId}`);
    if (!response.ok) throw new Error('Failed to fetch estimate items');
    return response.json();
};

export const createEstimateItem = async (item: Partial<EstimateItem>): Promise<EstimateItem> => {
    const response = await fetch(`${API_BASE}/client-portal?resource=estimate-items`, {
        method: 'POST',
        headers,
        body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to create estimate item');
    return response.json();
};

export const updateEstimateItem = async (itemId: string, updates: Partial<EstimateItem>) => {
    const response = await fetch(`${API_BASE}/client-portal?resource=estimate-items`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: itemId, ...updates })
    });
    if (!response.ok) throw new Error('Failed to update estimate item');
};

export const deleteEstimateItem = async (itemId: string) => {
    const response = await fetch(`${API_BASE}/client-portal?resource=estimate-items&id=${itemId}`, {
        method: 'DELETE',
        headers
    });
    if (!response.ok) throw new Error('Failed to delete estimate item');
};

// --- CLIENT PAYMENTS ---

export const fetchClientPayments = async (contractId: string, clientView: boolean = false): Promise<ClientPayment[]> => {
    let url = `${API_BASE}/client-portal?resource=client-payments&contractId=${contractId}`;
    if (clientView) url += '&status=RECEIVED'; // Clients only see received payments
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch client payments');
    return response.json();
};

export const createClientPayment = async (payment: Partial<ClientPayment>): Promise<ClientPayment> => {
    const response = await fetch(`${API_BASE}/client-portal?resource=client-payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payment)
    });
    if (!response.ok) throw new Error('Failed to create client payment');
    return response.json();
};

export const updateClientPayment = async (paymentId: string, updates: Partial<ClientPayment>) => {
    const response = await fetch(`${API_BASE}/client-portal?resource=client-payments`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: paymentId, ...updates })
    });
    if (!response.ok) throw new Error('Failed to update client payment');
};
