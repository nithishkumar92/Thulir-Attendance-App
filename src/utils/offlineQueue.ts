/**
 * Offline Queue Utility
 * Handles storing punch-in/out data locally when offline
 * and syncing when connection is restored
 */

export interface QueuedPunch {
    id: string;
    workerId: string;
    siteId: string;
    date: string;
    punchInTime?: string;
    punchOutTime?: string;
    punchInLocation?: { lat: number; lng: number };
    punchOutLocation?: { lat: number; lng: number };
    status: string;
    verified: boolean;
    punchInPhoto?: string;
    punchOutPhoto?: string;
    timestamp: number; // When it was queued
    type: 'PUNCH_IN' | 'PUNCH_OUT';
}

const QUEUE_KEY = 'attendance_offline_queue';

/**
 * Add a punch to the offline queue
 */
export const queuePunch = (punchData: Omit<QueuedPunch, 'timestamp'>): void => {
    try {
        const queue = getQueue();
        const queuedPunch: QueuedPunch = {
            ...punchData,
            timestamp: Date.now()
        };
        queue.push(queuedPunch);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        console.log('Punch queued for offline sync:', queuedPunch.id);
    } catch (error) {
        console.error('Failed to queue punch:', error);
    }
};

/**
 * Get all queued punches
 */
export const getQueue = (): QueuedPunch[] => {
    try {
        const queueStr = localStorage.getItem(QUEUE_KEY);
        return queueStr ? JSON.parse(queueStr) : [];
    } catch (error) {
        console.error('Failed to get queue:', error);
        return [];
    }
};

/**
 * Clear the queue after successful sync
 */
export const clearQueue = (): void => {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
        console.log('Offline queue cleared');
    } catch (error) {
        console.error('Failed to clear queue:', error);
    }
};

/**
 * Remove a specific punch from the queue
 */
export const removePunchFromQueue = (punchId: string): void => {
    try {
        const queue = getQueue();
        const filteredQueue = queue.filter(p => p.id !== punchId);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(filteredQueue));
    } catch (error) {
        console.error('Failed to remove punch from queue:', error);
    }
};

/**
 * Check if device is online
 */
export const isOnline = (): boolean => {
    return navigator.onLine;
};

/**
 * Get queue count
 */
export const getQueueCount = (): number => {
    return getQueue().length;
};
