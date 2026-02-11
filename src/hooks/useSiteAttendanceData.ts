import { useMemo } from 'react';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';
import { getTodayDateString } from '../utils/dateUtils';
import { SiteAttendanceData, WorkerRoleGroup, GroupedWorker } from '../components/SiteAttendanceCard';

export const useSiteAttendanceData = (dateFilter?: string, searchTerm?: string) => {
    const { attendance, workers, sites, teams: teamsData } = useApp();

    return useMemo(() => {

        const targetDate = dateFilter || getTodayDateString();

        // 1. Filter Attendance by Date
        const dateAttendance = attendance.filter(a => a.date === targetDate);

        // 2. Identify relevant sites
        // If searchTerm is present, we need to find sites that contain matching workers
        // Otherwise, use sites from attendance

        let relatedSiteIds = Array.from(new Set(dateAttendance.map(a => a.siteId)));

        // If no attendance, but we want to show active sites?
        // Current logic in TeamInterface showed "Active Sites" based on attendance.
        // We stick to that.

        return relatedSiteIds.map(siteId => {
            const site = sites.find(s => s.id === siteId);
            const siteName = site ? site.name : 'Unknown Site';

            const siteRecords = dateAttendance.filter(a => a.siteId === siteId);

            // Filter workers involved in this site's attendance
            let activeWorkers = workers.filter(w => siteRecords.some(r => r.workerId === w.id));

            // Apply Search Filter if exists
            if (searchTerm) {
                activeWorkers = activeWorkers.filter(w =>
                    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    w.role.toLowerCase().includes(searchTerm.toLowerCase())
                );

                // If search results in no workers for this site, we might want to skip the site?
                // Let's keep the site if there are any matches, otherwise filter it out later.
                if (activeWorkers.length === 0) return null;
            }

            // Summary Stats (based on filtered workers or total? usually total for the site on that day)
            // But if searching, maybe summary should reflect search?
            // Let's keep summary for the SITE context, but teams will show filtered.
            // Actually, for consistency, let's recalculate based on activeWorkers (filtered).

            const total = activeWorkers.length;
            const present = siteRecords.filter(r => activeWorkers.some(w => w.id === r.workerId)).length;
            const issues = siteRecords.filter(r =>
                activeWorkers.some(w => w.id === r.workerId) &&
                !r.punchOutTime &&
                new Date().getHours() > 18
            ).length;

            const estimatedWages = activeWorkers.reduce((sum, w) => sum + (w.dailyWage || 0), 0);

            // Group by Team
            const teamIds = Array.from(new Set(activeWorkers.map(w => w.teamId)));


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
                    } else if (record?.status === 'ABSENT') {
                        status = 'absent';
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

                const icon = role.toLowerCase().includes('mason') ? '🧱' : (role.toLowerCase().includes('helper') ? '🛠️' : '👷');

                return {
                    role_name: role + (role.endsWith('s') ? '' : 'S'),
                    icon,
                    count: groupedWorkers.length,
                    workers: groupedWorkers
                };
            });

            return {
                site_id: siteId,
                site_name: siteName,
                date: format(new Date(targetDate), 'MMM dd, yyyy'),
                summary: {
                    total_workers: total,
                    present: present,
                    issues: issues,
                    estimated_wages: estimatedWages
                },
                teams
            };
        }).filter(Boolean) as SiteAttendanceData[]; // Remove nulls from search filter
    }, [attendance, workers, sites, teamsData, dateFilter, searchTerm]); // Added teamsData dependency
};

