import { format, eachDayOfInterval } from 'date-fns';
import { calculateShifts, getShiftSymbol } from './attendanceUtils';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { Worker, AttendanceRecord, Team, AdvancePayment } from '../types';

/**
 * Generates the document definition for the Weekly Report PDF.
 * Includes both Attendance Report and Payment Summary.
 */
export const generateWeeklyReportPDF = (
    weekStart: Date,
    weekEnd: Date,
    visibleWorkers: Worker[],
    attendance: AttendanceRecord[],
    teams: Team[],
    advances: AdvancePayment[],
    siteId?: string,
    selectedTeamId: string = 'ALL'
): any => {
    // Initialize pdfMake fonts
    if (!(pdfMake as any).vfs) {
        (pdfMake as any).vfs = pdfFonts;
    }

    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Calculate unique roles and payment data
    // Mason comes first, then all other roles alphabetically
    const uniqueRoles = Array.from(new Set(visibleWorkers.map(w => w.role))).sort((a, b) => {
        if (a === 'Mason') return -1;
        if (b === 'Mason') return 1;
        return a.localeCompare(b);
    });

    const dailyFinancials = weekDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');

        const roleStats: Record<string, { count: number, cost: number }> = {};
        uniqueRoles.forEach(role => roleStats[role] = { count: 0, cost: 0 });

        visibleWorkers.forEach(worker => {
            const record = attendance.find(a =>
                a.workerId === worker.id &&
                a.date === dateStr &&
                (!siteId || a.siteId === siteId)
            );
            const shiftCount = record ? calculateShifts(record) : 0;

            if (uniqueRoles.includes(worker.role)) {
                roleStats[worker.role].count += shiftCount;
                roleStats[worker.role].cost += (worker.dailyWage || 0) * shiftCount;
            }
        });

        const dayAdvances = advances
            .filter(adv => {
                const isDateMatch = adv.date === dateStr;
                const isTypeMatch = !adv.notes?.includes('[SETTLEMENT]');
                const isTeamMatch = selectedTeamId === 'ALL' || adv.teamId === selectedTeamId;
                const isSiteMatch = !siteId || adv.siteId === siteId;
                return isDateMatch && isTypeMatch && isTeamMatch && isSiteMatch;
            })
            .reduce((sum, adv) => sum + adv.amount, 0);

        const daySettlements = advances
            .filter(adv => {
                const isDateMatch = adv.date === dateStr;
                const isTypeMatch = adv.notes?.includes('[SETTLEMENT]');
                const isTeamMatch = selectedTeamId === 'ALL' || adv.teamId === selectedTeamId;
                const isSiteMatch = !siteId || adv.siteId === siteId;
                return isDateMatch && isTypeMatch && isTeamMatch && isSiteMatch;
            })
            .reduce((sum, adv) => sum + adv.amount, 0);

        return {
            date: day,
            roleStats,
            advance: dayAdvances,
            settlement: daySettlements
        };
    });

    const roleTotals: Record<string, { count: number, cost: number }> = {};
    uniqueRoles.forEach(role => {
        roleTotals[role] = dailyFinancials.reduce((acc, day) => {
            const stat = day.roleStats[role] || { count: 0, cost: 0 };
            return {
                count: acc.count + stat.count,
                cost: acc.cost + stat.cost
            };
        }, { count: 0, cost: 0 });
    });

    const totalAdvance = dailyFinancials.reduce((sum, day) => sum + day.advance, 0);
    const totalSettlement = dailyFinancials.reduce((sum, day) => sum + (day.settlement || 0), 0);
    const totalRoleCost = Object.values(roleTotals).reduce((sum, val) => sum + val.cost, 0);
    const balanceToPay = totalRoleCost - totalAdvance - totalSettlement;

    // --- PDF Construction ---

    // 1. Attendance Table
    const attendanceHeaders = ['Worker', 'Role', ...weekDays.map(d => format(d, 'EEE d')), 'Total'];

    // Sort workers: Mason first, then other roles alphabetically, then by name
    const sortedWorkers = [...visibleWorkers].sort((a, b) => {
        if (a.role === 'Mason' && b.role !== 'Mason') return -1;
        if (a.role !== 'Mason' && b.role === 'Mason') return 1;
        if (a.role !== b.role) return a.role.localeCompare(b.role);
        return a.name.localeCompare(b.name);
    });

    const attendanceRows = sortedWorkers.map(worker => {
        const dailyStatuses = weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = attendance.find(a =>
                a.workerId === worker.id &&
                a.date === dateStr &&
                (!siteId || a.siteId === siteId)
            );
            const shiftCount = record ? calculateShifts(record) : 0;
            return getShiftSymbol(shiftCount, record);
        });
        const totalPresent = weekDays.reduce((sum, day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = attendance.find(a =>
                a.workerId === worker.id &&
                a.date === dateStr &&
                (!siteId || a.siteId === siteId)
            );
            return sum + (record ? calculateShifts(record) : 0);
        }, 0);
        return [worker.name, worker.role, ...dailyStatuses, totalPresent.toString()];
    });

    // 2. Payment Table
    const paymentHeaders = ['Date', 'Weekday', ...uniqueRoles, 'Advance', 'Settlement'];
    const paymentRows = dailyFinancials.map(day => {
        const rolesCounts = uniqueRoles.map(role => (day.roleStats[role].count || '').toString());
        return [
            format(day.date, 'dd-MMM'),
            format(day.date, 'EEE'),
            ...rolesCounts,
            (day.advance || '').toString(),
            (day.settlement || '').toString()
        ];
    });

    const totalRow = ['Total Duty', '', ...uniqueRoles.map(role => roleTotals[role].count.toString()), '', ''];
    const amountRow = ['Amount', '', ...uniqueRoles.map(role => roleTotals[role].cost.toLocaleString()), totalAdvance.toLocaleString(), totalSettlement.toLocaleString()];

    // Document Definition
    const content: any[] = [
        { text: 'Weekly Attendance Report', style: 'header' },
        { text: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`, style: 'subheader' }
    ];

    if (selectedTeamId !== 'ALL') {
        const teamName = teams.find(t => t.id === selectedTeamId)?.name;
        content.push({ text: `Team: ${teamName}`, style: 'teamInfo' });
    }

    content.push(
        { text: '\n' },
        {
            table: {
                headerRows: 1,
                widths: Array(attendanceHeaders.length).fill('auto'),
                body: [attendanceHeaders, ...attendanceRows]
            },
            layout: 'lightHorizontalLines',
            style: 'tableStyle'
        },
        { text: '\n' },
        { text: 'Payment Summary', style: 'sectionHeader' },
        { text: '\n' },
        {
            table: {
                headerRows: 1,
                widths: Array(paymentHeaders.length).fill('auto'),
                body: [paymentHeaders, ...paymentRows, totalRow, amountRow]
            },
            layout: 'lightHorizontalLines',
            style: 'tableStyle'
        },
        { text: '\n' },
        { text: `Balance To Pay: ₹${balanceToPay.toLocaleString()}`, style: 'total' }
    );

    const docDefinition: any = {
        content,
        styles: {
            header: {
                fontSize: 18,
                bold: true,
                margin: [0, 0, 0, 5]
            },
            subheader: {
                fontSize: 10,
                margin: [0, 0, 0, 5]
            },
            teamInfo: {
                fontSize: 10,
                margin: [0, 0, 0, 10]
            },
            sectionHeader: {
                fontSize: 14,
                bold: true,
                margin: [0, 10, 0, 5]
            },
            tableStyle: {
                fontSize: 8,
                margin: [0, 5, 0, 15]
            },
            total: {
                fontSize: 12,
                bold: true,
                color: '#2e7d32'
            }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };

    return docDefinition;
};
