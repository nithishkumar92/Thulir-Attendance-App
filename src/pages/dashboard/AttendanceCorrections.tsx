import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Edit2, Save, X, Search, Calendar, Filter, Trash2, CheckSquare, Square } from 'lucide-react';
import { AttendanceRecord } from '../../types';
import clsx from 'clsx';
import { calculateDutyPoints } from '../../utils/wageUtils';
import { useSiteAttendanceData } from '../../hooks/useSiteAttendanceData';
import { SiteAttendanceCard, SiteAttendanceData } from '../../components/SiteAttendanceCard';
import { AttendanceBottomSheet } from '../../components/AttendanceBottomSheet';


export const AttendanceCorrections: React.FC = () => {
    const { attendance, workers, sites, updateAttendance, deleteAttendance } = useApp();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<AttendanceRecord>>({});
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [useDateFilter, setUseDateFilter] = useState(true); // Default to true for Owner View
    const [viewMode, setViewMode] = useState<'CARD' | 'TABLE'>('CARD'); // Mobile-first default

    // Hierarchical Data Hook
    const siteAttendanceData = useSiteAttendanceData(useDateFilter ? filterDate : undefined, searchTerm);
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
    const [selectedSiteData, setSelectedSiteData] = useState<SiteAttendanceData | null>(null);

    const handleCardClick = (data: SiteAttendanceData) => {
        setSelectedSiteData(data);
        setIsBottomSheetOpen(true);
    };

    // Handler Actions from Bottom Sheet
    const handleSheetEdit = (workerId: string) => {
        // Find record for this worker on this date
        // Note: The hook groups by site, but we can look up in 'attendance'
        const record = attendance.find(a => a.workerId === workerId && a.date === filterDate);
        if (record) {
            handleEditClick(record);
            setIsBottomSheetOpen(false); // Close sheet to show edit form (or show modal?)
            // Since edit form is in the main view, we might need to scroll to it or show a modal.
            // For now, let's close sheet and maybe switch to table view or show a modal edit form?
            // Since the current Edit UI is inline in the table, it's tricky.
            // Ideally we should open a dedicated Edit Modal.
            // For this iteration, let's switch to Table View and select the row.
            setViewMode('TABLE');
            setTimeout(() => {
                const element = document.getElementById(`row-${record.id}`);
                if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    };

    const handleSheetDelete = async (workerId: string) => {
        const record = attendance.find(a => a.workerId === workerId && a.date === filterDate);
        if (record) {
            await handleDeleteRow(record.id);
            // Sheet will auto-update if data changes? Yes, useSiteAttendanceData depends on 'attendance'
        }
    };


    const handleEditClick = (record: AttendanceRecord) => {
        setEditingId(record.id);
        setEditForm({ ...record });
    };

    const handleSave = async () => {
        if (editingId && editForm) {
            // Merge existing record with edits
            const original = attendance.find(a => a.id === editingId);
            if (original) {
                const updatedRecord = { ...original, ...editForm } as AttendanceRecord;

                // IMPORTANT: If punchInTime changed, update the 'date' field to match
                // This ensures reports grouping by 'date' see the record on the new day
                if (editForm.punchInTime) {
                    updatedRecord.date = format(parseISO(editForm.punchInTime), 'yyyy-MM-dd');
                }

                // Recalculate Duty Points if times are present
                if (updatedRecord.punchInTime && updatedRecord.punchOutTime) {
                    updatedRecord.dutyPoints = calculateDutyPoints(
                        new Date(updatedRecord.punchInTime),
                        new Date(updatedRecord.punchOutTime)
                    );
                }

                try {
                    await updateAttendance(updatedRecord);
                    setEditingId(null);
                    setEditForm({});
                } catch (error) {
                    alert("Failed to update record. A record for this worker on this date might already exist.");
                }
            }
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    // Selection Handlers
    const toggleSelectRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredAttendance.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredAttendance.map(a => a.id)));
        }
    };

    const handleDeleteRow = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this attendance record?')) {
            await deleteAttendance(id);
            // If selected, remove from selection
            if (selectedIds.has(id)) {
                const newSelected = new Set(selectedIds);
                newSelected.delete(id);
                setSelectedIds(newSelected);
            }
        }
    };

    const handleDeleteSelected = async () => {
        if (window.confirm(`Are you sure you want to delete ${selectedIds.size} records?`)) {
            const idsToDelete = Array.from(selectedIds);
            for (const id of idsToDelete) {
                await deleteAttendance(id);
            }
            setSelectedIds(new Set());
        }
    };

    // Filter & Sort
    const filteredAttendance = useMemo(() => {
        let sorted = [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (searchTerm) {
            sorted = sorted.filter(record => {
                const worker = workers.find(w => w.id === record.workerId);
                return worker?.name.toLowerCase().includes(searchTerm.toLowerCase());
            });
        }

        if (useDateFilter && filterDate) {
            sorted = sorted.filter(record => record.date === filterDate);
        }

        return sorted;
    }, [attendance, workers, searchTerm, filterDate, useDateFilter]);

    const isAllSelected = filteredAttendance.length > 0 && selectedIds.size === filteredAttendance.length;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Attendance Corrections</h2>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={16} />
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}

                    {/* Search & Filters */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('CARD')}
                                className={clsx("px-3 py-1.5 rounded-md text-xs font-medium transition-all", viewMode === 'CARD' ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700")}
                            >
                                Cards
                            </button>
                            <button
                                onClick={() => setViewMode('TABLE')}
                                className={clsx("px-3 py-1.5 rounded-md text-xs font-medium transition-all", viewMode === 'TABLE' ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700")}
                            >
                                Table
                            </button>
                        </div>

                        <div className="relative">

                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search worker..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-white border rounded-lg p-1 dark:bg-gray-800 dark:border-gray-700">
                            <button
                                onClick={() => setUseDateFilter(!useDateFilter)}
                                className={clsx(
                                    "p-1.5 rounded transition-colors",
                                    useDateFilter ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                )}
                                title="Filter by Date"
                            >
                                <Filter size={18} />
                            </button>
                            {useDateFilter && (
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="text-sm border-l pl-2 ml-1 outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {viewMode === 'TABLE' ? (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left dark:text-gray-200">
                            <thead className="bg-gray-50 text-gray-700 font-semibold border-b dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <button onClick={toggleSelectAll} className="flex items-center justify-center text-gray-500 hover:text-gray-700">
                                            {isAllSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Worker</th>
                                    <th className="px-6 py-4">Site</th>
                                    <th className="px-6 py-4">In Time</th>
                                    <th className="px-6 py-4">Out Time</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredAttendance.map(record => {
                                    const isEditing = editingId === record.id;
                                    const worker = workers.find(w => w.id === record.workerId);
                                    const site = sites.find(s => s.id === record.siteId);
                                    const isSelected = selectedIds.has(record.id);

                                    return (
                                        <tr key={record.id} id={`row-${record.id}`} className={clsx("hover:bg-gray-50 transition-colors dark:hover:bg-gray-700/50", (isEditing || isSelected) && "bg-blue-50/50 dark:bg-blue-900/20")}>
                                            <td className="px-6 py-4 w-10">
                                                <button onClick={() => toggleSelectRow(record.id)} className="flex items-center justify-center text-gray-500 hover:text-gray-700">
                                                    {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                                {format(parseISO(record.date), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                                {worker?.name || 'Unknown'}
                                                <div className="text-xs text-gray-400 font-normal dark:text-gray-500">{worker?.role}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {site?.name || 'Unknown'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <input
                                                        type="datetime-local"
                                                        className="border rounded-lg p-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                                                        value={editForm.punchInTime ? format(parseISO(editForm.punchInTime), "yyyy-MM-dd'T'HH:mm") : ''}
                                                        onChange={e => setEditForm({ ...editForm, punchInTime: new Date(e.target.value).toISOString() })}
                                                    />
                                                ) : (
                                                    <span className="font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded dark:bg-gray-700 dark:text-gray-200">
                                                        {record.punchInTime ? format(parseISO(record.punchInTime), 'HH:mm') : '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <input
                                                        type="datetime-local"
                                                        className="border rounded-lg p-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                                                        value={editForm.punchOutTime ? format(parseISO(editForm.punchOutTime), "yyyy-MM-dd'T'HH:mm") : ''}
                                                        onChange={e => setEditForm({ ...editForm, punchOutTime: new Date(e.target.value).toISOString() })}
                                                    />
                                                ) : (
                                                    <span className="font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded dark:bg-gray-700 dark:text-gray-200">
                                                        {record.punchOutTime ? format(parseISO(record.punchOutTime), 'HH:mm') : '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <select
                                                        className="border rounded-lg p-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                                                        value={editForm.status}
                                                        onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                                                    >
                                                        <option value="PRESENT">Present</option>
                                                        <option value="ABSENT">Absent</option>
                                                        <option value="HALF_DAY">Half Day</option>
                                                    </select>
                                                ) : (
                                                    <span className={clsx(
                                                        "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                                                        record.status === 'PRESENT' ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800" :
                                                            record.status === 'ABSENT' ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800" :
                                                                "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800"
                                                    )}>
                                                        {record.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={handleSave} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors dark:bg-green-900/50 dark:text-green-300" title="Save">
                                                            <Save size={16} />
                                                        </button>
                                                        <button onClick={handleCancel} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors dark:bg-red-900/50 dark:text-red-300" title="Cancel">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditClick(record)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors dark:hover:bg-blue-900/30"
                                                            title="Edit Record"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteRow(record.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:hover:bg-red-900/30"
                                                            title="Delete Record"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredAttendance.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search size={32} className="opacity-20" />
                                                <p>No attendance records found covering your criteria</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {siteAttendanceData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                            <Search className="text-gray-300 mb-2" size={48} />
                            <p className="text-gray-500 font-medium">No attendance records found for this date.</p>
                        </div>
                    ) : (
                        siteAttendanceData.map(data => (
                            <SiteAttendanceCard
                                key={data.site_id}
                                data={data}
                                onClick={() => handleCardClick(data)}
                            />
                        ))
                    )}

                    <AttendanceBottomSheet
                        isOpen={isBottomSheetOpen}
                        onClose={() => setIsBottomSheetOpen(false)}
                        data={selectedSiteData}
                        onEdit={handleSheetEdit}
                        onDelete={handleSheetDelete}
                    />
                </div>
            )}

        </div>
    );
};
