
const DB_NAME = 'ThulirERP_ImageCache';
const STORE_NAME = 'worker_photos';
const DB_VERSION = 1;
const CACHE_DURATION_MS = 25 * 24 * 60 * 60 * 1000; // 25 days

interface CachedImage {
    workerId: string;
    photoUrl: string;
    aadhaarPhotoUrl?: string; // Cache this too if needed
    timestamp: number;
}

export const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("ImageCache DB error:", event);
            reject("Failed to open cache DB");
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'workerId' });
            }
        };
    });
};

export const getCachedImages = async (workerIds: string[]): Promise<Map<string, CachedImage>> => {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const resultMap = new Map<string, CachedImage>();

        // We can either get all and filter, or get one by one.
        // Getting all is faster if the store isn't huge. Given < 100 workers, getting all is fine.
        // Assuming we want to check all workers in the list.

        return new Promise((resolve, reject) => {
            const request = store.getAll();

            request.onsuccess = () => {
                const allCached: CachedImage[] = request.result;
                const now = Date.now();

                allCached.forEach(item => {
                    if (workerIds.includes(item.workerId)) {
                        // Check expiry
                        if (now - item.timestamp < CACHE_DURATION_MS) {
                            resultMap.set(item.workerId, item);
                        } else {
                            // Expired - logically we ignore it, maybe physically delete it later
                            // For now just don't return it
                        }
                    }
                });
                resolve(resultMap);
            };

            request.onerror = () => reject("Failed to fetch cached images");
        });

    } catch (e) {
        console.error("Error reading image cache:", e);
        return new Map();
    }
};

export const cacheWorkerImages = async (images: CachedImage[]) => {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        images.forEach(img => {
            store.put(img);
        });

        return new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject("Failed to save images to cache");
        });
    } catch (e) {
        console.error("Error saving to image cache", e);
    }
};

export const clearExpiredCache = async () => {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.getAll();
        request.onsuccess = () => {
            const allCached: CachedImage[] = request.result;
            const now = Date.now();
            allCached.forEach(item => {
                if (now - item.timestamp > CACHE_DURATION_MS) {
                    store.delete(item.workerId);
                }
            });
        };
    } catch (e) {
        console.error("Error clearing expired cache", e);
    }
};
