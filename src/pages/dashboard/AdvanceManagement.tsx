import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Plus, Search, IndianRupee, Calendar, FileText, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { AdvancePayment } from '../../types';

export const AdvanceManagement: React.FC = () => {
    const { teams, advances, addAdvance, updateAdvance, deleteAdvance, currentUser, workers, attendance } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Date Filter State
    const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd'));

    // Form State
    const [editingEntry, setEditingEntry] = useState<AdvancePayment | null>(null);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [notes, setNotes] = useState('');
    const [isSettlement, setIsSettlement] = useState(false);

    // Calculate Shifts Helper (Duplicated from WeeklyReport to avoid dependency issues for now)
    const calculateShifts = (record: any) => {
        if (!record || record.status === 'ABSENT') return 0;
        if (!record.punchInTime) return record.status === 'HALF_DAY' ? 0.5 : 1;

        const inTime = new Date(record.punchInTime);
        const outTime = record.punchOutTime ? new Date(record.punchOutTime) : new Date(record.date + 'T18:00:00');

        const getMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();
        const inMin = getMinutes(inTime);
        const outMin = getMinutes(outTime);

        let totalShift = 0;
        // 06:00-09:00
        if (Math.max(0, Math.min(outMin, 540) - Math.max(inMin, 360)) > 30) totalShift += 0.5;
        // 09:00-13:00
        if (Math.max(0, Math.min(outMin, 780) - Math.max(inMin, 540)) > 30) totalShift += 0.5;
        // 13:00-18:00
        if (Math.max(0, Math.min(outMin, 1080) - Math.max(inMin, 780)) > 30) totalShift += 0.5;

        return totalShift;
    };

    // Filter teams based on search
    const filteredTeams = useMemo(() => {
        return teams.filter(t =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (currentUser?.role === 'OWNER' || t.id === currentUser?.teamId)
        );
    }, [teams, searchTerm, currentUser]);

    // Derived Ledger Data for Selected Team (or first visible team)
    const activeTeamId = selectedTeamId || (filteredTeams.length > 0 ? filteredTeams[0].id : '');
    const activeTeam = teams.find(t => t.id === activeTeamId);

    const ledgerData = useMemo(() => {
        if (!activeTeamId) return { entries: [], totalAdvance: 0, totalSettlement: 0, closingBalance: 0, openingBalance: 0 };

        // 1. Get all Manual Transactions (Advances/Settlements)
        const manualTransactions = advances
            .filter(a => a.teamId === activeTeamId)
            .map(t => ({
                id: t.id,
                date: t.date,
                amount: t.amount,
                notes: t.notes,
                type: t.notes?.includes('[SETTLEMENT]') ? 'CREDIT' : 'DEBIT',
                isManual: true,
                original: t
            }));

        // 2. Calculate Daily Labor Credits (Virtual Transactions)
        // Find all days where this team worked
        const teamWorkers = workers.filter(w => w.teamId === activeTeamId);
        const teamWorkerIds = teamWorkers.map(w => w.id);

        // Group attendance by date
        const laborCostsByDate: Record<string, number> = {};

        attendance.forEach(record => {
            if (teamWorkerIds.includes(record.workerId)) {
                const shift = calculateShifts(record);
                if (shift > 0) {
                    const worker = teamWorkers.find(w => w.id === record.workerId);
                    const wage = worker?.dailyWage || 0;
                    const cost = shift * wage;

                    if (cost > 0) {
                        laborCostsByDate[record.date] = (laborCostsByDate[record.date] || 0) + cost;
                    }
                }
            }
        });

        const laborTransactions = Object.entries(laborCostsByDate).map(([date, amount]) => ({
            id: `labor-${date}`,
            date,
            amount,
            notes: `Daily Labor Cost`,
            type: 'CREDIT', // Labor is a Credit to the worker's account (Owner owes them)
            isManual: false,
            displayNotes: `Daily Labor Cost`
        }));

        // 3. Combine and Sort
        const allEntries = [...manualTransactions, ...laborTransactions]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 4. Calculate Opening Balance & Filter by Date Range
        const previousEntries = allEntries.filter(e => e.date < startDate);
        const currentEntries = allEntries.filter(e => e.date >= startDate && e.date <= endDate);

        const openingBalance = previousEntries.reduce((acc, curr) => {
            // Debit (Advance given) increases balance (Worker owes Owner)
            // Credit (Settlement/Labor) decreases balance (Owner owes Worker)
            // Wait, usually Ledger is "Worker's Account in Owner's Books":
            // - Debit: Owner gives money -> Balance increases (Worker owes more)
            // - Credit: Worker does work -> Balance decreases (Worker owes less)
            return acc + (curr.type === 'DEBIT' ? curr.amount : -curr.amount);
        }, 0);

        // 5. Build Ledger Entries with Running Balance
        let runningBalance = openingBalance;
        const entries = currentEntries.map(e => {
            runningBalance += (e.type === 'DEBIT' ? e.amount : -e.amount);
            return {
                ...e,
                runningBalance
            };
        });

        // 6. Totals for the period
        const periodAdvance = currentEntries
            .filter(e => e.type === 'DEBIT')
            .reduce((sum, e) => sum + e.amount, 0);

        const periodSettlement = currentEntries
            .filter(e => e.type === 'CREDIT')
            .reduce((sum, e) => sum + e.amount, 0);

        return {
            entries,
            openingBalance,
            closingBalance: runningBalance,
            totalAdvance: periodAdvance,
            totalSettlement: periodSettlement // Includes both Cash Settlements and Labor Credits
        };
    }, [advances, activeTeamId, startDate, endDate, workers, attendance]);

    const handleEditClick = (entry: any) => {
        if (!entry.isManual) return; // Cannot edit virtual labor entries
        setEditingEntry(entry.original);
        setSelectedTeamId(entry.original.teamId);
        setAmount(entry.original.amount.toString());
        setDate(entry.original.date);
        setNotes(entry.original.notes?.replace('[SETTLEMENT] ', '').replace('[SETTLEMENT]', '') || '');
        setIsSettlement(entry.original.notes?.includes('[SETTLEMENT]') || false);
        setIsModalOpen(true);
    };

    const handleNewEntry = () => {
        setEditingEntry(null);
        setAmount('');
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setNotes('');
        setIsSettlement(false);
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (editingEntry && window.confirm('Are you sure you want to delete this entry?')) {
            await deleteAdvance(editingEntry.id);
            setIsModalOpen(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeamId || !amount || !date) return;

        const finalNotes = isSettlement ? `[SETTLEMENT] ${notes}` : notes;

        if (editingEntry) {
            await updateAdvance(editingEntry.id, {
                teamId: selectedTeamId,
                amount: parseFloat(amount),
                date,
                notes: finalNotes
            });
        } else {
            await addAdvance({
                teamId: selectedTeamId,
                amount: parseFloat(amount),
                date,
                notes: finalNotes
            });
        }

        // Reset form
        setIsModalOpen(false);
        setAmount('');
        setNotes('');
        setIsSettlement(false);
        setEditingEntry(null);
    };

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cash Ledger</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleNewEntry}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        New Entry
                    </button>
                </div>
            </div>

            {/* Filters & Controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 flex-shrink-0 dark:bg-gray-800 dark:border-gray-700">
                {/* Team Selector */}
                <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block dark:text-gray-400">Select Team</label>
                    <div className="relative">
                        <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            className="w-full p-2 border rounded-lg appearance-none bg-gray-50 font-medium dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        >
                            <option value="">-- Select Account --</option>
                            {filteredTeams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* Date Range */}
                <div className="flex gap-2">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block dark:text-gray-400">From</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="p-2 border rounded-lg bg-gray-50 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block dark:text-gray-400">To</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="p-2 border rounded-lg bg-gray-50 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        />
                    </div>
                </div>
            </div>

            {/* Ledger View */}
            {activeTeamId ? (
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                    {/* Header Summary */}
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center flex-shrink-0 dark:bg-gray-700 dark:border-gray-600">
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{activeTeam?.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Statement Period: {format(new Date(startDate), 'dd MMM')} - {format(new Date(endDate), 'dd MMM')}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase font-semibold dark:text-gray-400">Net Balance Due</div>
                            <div className={clsx("text-2xl font-bold", ledgerData.closingBalance > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                                ₹{ledgerData.closingBalance.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse relative dark:text-gray-200">
                            <thead className="bg-gray-100 text-gray-600 font-semibold text-xs uppercase sticky top-0 z-10 shadow-sm dark:bg-gray-700 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-3 w-32">Date</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3 text-right text-red-600 bg-red-50/50 w-32 dark:bg-red-900/30 dark:text-red-300">Debit (Adv)</th>
                                    <th className="px-4 py-3 text-right text-green-600 bg-green-50/50 w-32 dark:bg-green-900/30 dark:text-green-300">Credit (Set)</th>
                                    <th className="px-4 py-3 text-right w-36">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm dark:divide-gray-700">
                                {/* Opening Balance Row */}
                                <tr className="bg-yellow-50 font-medium text-gray-700 dark:bg-yellow-900/20 dark:text-gray-300">
                                    <td className="px-4 py-3 text-gray-500 italic dark:text-gray-400">{format(new Date(startDate), 'yyyy-MM-dd')}</td>
                                    <td className="px-4 py-3 italic">Opening Balance b/f</td>
                                    <td className="px-4 py-3 text-right">-</td>
                                    <td className="px-4 py-3 text-right">-</td>
                                    <td className="px-4 py-3 text-right font-bold">₹{ledgerData.openingBalance.toLocaleString()}</td>
                                </tr>

                                {/* Transactions */}
                                {ledgerData.entries.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        onClick={() => handleEditClick(entry)}
                                        className={clsx(
                                            "transition-colors group border-b border-gray-50 dark:border-gray-700",
                                            entry.isManual ? "hover:bg-blue-50 cursor-pointer dark:hover:bg-gray-700" : "bg-gray-50/50 dark:bg-gray-800/50"
                                        )}
                                    >
                                        <td className="px-4 py-3 text-gray-600 space-nowrap group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-300">
                                            {format(new Date(entry.date), 'dd MMM yyyy')}
                                        </td>
                                        <td className="px-4 py-3 text-gray-800 group-hover:text-blue-600 dark:text-gray-200 dark:group-hover:text-blue-300">
                                            {entry.isManual ? (
                                                <>
                                                    {entry.notes?.replace('[SETTLEMENT]', '') || 'Payment'}
                                                    {entry.type === 'CREDIT' && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800">SETTLEMENT</span>}
                                                </>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-gray-500 italic dark:text-gray-400">
                                                    <CheckCircle size={12} />
                                                    {entry.notes}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono bg-red-50/30 group-hover:bg-red-100/50 dark:bg-red-900/10 dark:group-hover:bg-red-900/30">
                                            {entry.type === 'DEBIT' ? <span className="text-red-600 dark:text-red-300">₹{entry.amount.toLocaleString()}</span> : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono bg-green-50/30 group-hover:bg-green-100/50 dark:bg-green-900/10 dark:group-hover:bg-green-900/30">
                                            {entry.type === 'CREDIT' ? <span className="text-green-600 dark:text-green-300">₹{entry.amount.toLocaleString()}</span> : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900 border-l group-hover:bg-blue-50 dark:text-gray-100 dark:border-gray-700 dark:group-hover:bg-gray-700">
                                            ₹{entry.runningBalance.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}

                                {ledgerData.entries.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                                            No transactions in this period
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold text-gray-900 sticky bottom-0 shadow-[0_-1px_3px_rgba(0,0,0,0.1)] dark:bg-gray-700 dark:text-gray-100">
                                <tr>
                                    <td className="px-4 py-3" colSpan={2}>Period Totals</td>
                                    <td className="px-4 py-3 text-right text-red-700 dark:text-red-300">₹{ledgerData.totalAdvance.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-green-700 dark:text-green-300">₹{ledgerData.totalSettlement.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-blue-700 dark:text-blue-300">₹{ledgerData.closingBalance.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">Select a Team to view Ledger</p>
                </div>
            )}

            {/* Add/Edit Payment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">{editingEntry ? 'Edit Entry' : 'New Ledger Entry'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Team Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Team Account</label>
                                <select
                                    required
                                    value={selectedTeamId}
                                    onChange={(e) => setSelectedTeamId(e.target.value)}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="">Select Team</option>
                                    {filteredTeams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Amount & Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="date"
                                            required
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Type */}
                            <div className="flex gap-3">
                                <label className={clsx(
                                    "flex-1 p-3 rounded-lg border cursor-pointer text-center transition-all",
                                    !isSettlement ? "bg-red-50 border-red-200 text-red-700 ring-2 ring-red-500 ring-offset-1" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                )}>
                                    <input type="radio" className="hidden" checked={!isSettlement} onChange={() => setIsSettlement(false)} />
                                    <div className="font-bold text-sm">DEBIT</div>
                                    <div className="text-[10px] opacity-75">Advance Provided</div>
                                </label>
                                <label className={clsx(
                                    "flex-1 p-3 rounded-lg border cursor-pointer text-center transition-all",
                                    isSettlement ? "bg-green-50 border-green-200 text-green-700 ring-2 ring-green-500 ring-offset-1" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                )}>
                                    <input type="radio" className="hidden" checked={isSettlement} onChange={() => setIsSettlement(true)} />
                                    <div className="font-bold text-sm">CREDIT</div>
                                    <div className="text-[10px] opacity-75">Settlement / Recov</div>
                                </label>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 text-gray-400" size={16} />
                                    <textarea
                                        rows={2}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        placeholder="e.g. Paid via UPI"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                {editingEntry && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="flex-1 bg-red-100 text-red-700 py-2.5 rounded-lg hover:bg-red-200 font-medium transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="flex-[2] bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-transform active:scale-[0.98] shadow-lg shadow-blue-200"
                                >
                                    {editingEntry ? 'Update Entry' : 'Save Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
