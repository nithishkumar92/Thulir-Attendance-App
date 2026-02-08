import { User, Team, Site, Worker, AttendanceRecord, AdvancePayment } from './types';

// Hardcoded test site as requested
export const TEST_SITE_LOCATION = { lat: 11.485444, lng: 77.881000 }; // 11°29'07.6"N 77°52'51.6"E

export const INITIAL_DATA = {
    users: [
        {
            id: 'u1',
            username: 'owner',
            password: 'password',
            role: 'OWNER',
            name: 'Owner',
        },
        {
            id: 'u2',
            username: 'rep_mason_a',
            password: 'password',
            role: 'TEAM_REP',
            name: 'Ramesh (Mason Rep)',
            teamId: 't1',
        },
    ] as User[],

    teams: [
        {
            id: 't1',
            name: 'Mason Team A',
            repId: 'u2',
        },
        {
            id: 't2',
            name: 'Electrician Team',
            repId: '',
        }
    ] as Team[],

    sites: [
        {
            id: 's1',
            name: 'Test Site Construction',
            location: TEST_SITE_LOCATION,
            radius: 300,
        },
        {
            id: 's2',
            name: 'City Mall Project',
            location: { lat: 11.490000, lng: 77.890000 }, // Nearby dummy site
            radius: 300,
        }
    ] as Site[],

    workers: [
        {
            id: 'w1',
            name: 'Suresh',
            teamId: 't1',
            role: 'Mason',
            wageType: 'DAILY',
            dailyWage: 800,
            isActive: true,
            approved: true,
        },
        {
            id: 'w2',
            name: 'Ganesh',
            teamId: 't1',
            role: 'Helper',
            wageType: 'DAILY',
            dailyWage: 500,
            isActive: true,
            approved: true,
        }
    ] as Worker[],

    attendance: [] as AttendanceRecord[],

    advances: [] as AdvancePayment[],
};

// Helper to persistence
const STORAGE_KEY = 'erp_db_v1';

export const loadData = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    return INITIAL_DATA;
};

export const saveData = (data: typeof INITIAL_DATA) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};
