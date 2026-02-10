export type Role = 'OWNER' | 'TEAM_REP' | 'WORKER';

export interface User {
    id: string;
    username: string; // For login
    password?: string;
    role: Role;
    name: string;
    teamId?: string; // If Rep or Worker
    isLocked?: boolean;
}

export interface TeamRole {
    name: string;
    defaultWage: number;
}

export interface Team {
    id: string;
    name: string;
    repId?: string; // User ID of the representative
    definedRoles?: TeamRole[];
    permittedSiteIds?: string[]; // Array of Site IDs
    isActive: boolean;
}

export interface Worker {
    id: string; // Links to User.id if they can login, or independent ID
    name: string;
    teamId: string;
    role: string; // e.g., Mason, Electrician
    wageType: 'DAILY' | 'PIECE_WORK';
    dailyWage?: number;
    isActive: boolean;
    isLocked?: boolean;
    registeredBy?: string; // User ID
    approved: boolean;
    photoUrl?: string; // Base64 or URL
    aadhaarPhotoUrl?: string; // Base64 or URL
    phoneNumber?: string;
}

export interface Site {
    id: string;
    name: string;
    location: {
        lat: number;
        lng: number;
    };
    radius: number; // in meters, default 300
    isActive: boolean;
}

export interface AttendanceRecord {
    id: string;
    workerId: string;
    siteId: string;
    date: string; // ISO Date YYYY-MM-DD
    punchInTime?: string; // ISO Timestamp
    punchOutTime?: string; // ISO Timestamp
    punchInLocation?: { lat: number, lng: number };
    punchOutLocation?: { lat: number, lng: number };
    punchInPhoto?: string; // base64 or url
    punchOutPhoto?: string;
    status: 'PRESENT' | 'ABSENT' | 'HALF_DAY';
    dutyPoints?: number;
    verified: boolean; // Location verified
}

export interface AdvancePayment {
    id: string;
    teamId: string; // Changed from workerId to teamId
    amount: number;
    date: string;
    notes?: string;
    siteId?: string; // Optional for backward compatibility, but should be populated going forward
}
