/**
 * Retries a function that returns a promise.
 * @param fn The async function to retry.
 * @param retries Number of retries (default 3).
 * @param delayMs Delay between retries in ms (default 1000).
 * @returns The result of the function or throws the last error.
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        console.warn(`Operation failed, retrying in ${delayMs}ms... (${retries} left)`, error);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return withRetry(fn, retries - 1, delayMs * 1.5); // Exponential backoffish
    }
}
