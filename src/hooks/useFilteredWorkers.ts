import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { filterWorkersByRole } from '../utils/filterUtils';

interface UseFilteredWorkersOptions {
    teamId?: string;
    includeInactive?: boolean;
}

/**
 * Reusable hook for filtering workers based on current user role.
 * Eliminates duplicate worker filtering logic across components.
 * 
 * @param options - Filtering options
 * @returns Filtered workers array
 */
export const useFilteredWorkers = (options: UseFilteredWorkersOptions = {}) => {
    const { workers, currentUser } = useApp();
    const { teamId, includeInactive = false } = options;

    const filteredWorkers = useMemo(() => {
        return filterWorkersByRole(workers, currentUser, teamId, includeInactive);
    }, [workers, currentUser, teamId, includeInactive]);

    return filteredWorkers;
};
