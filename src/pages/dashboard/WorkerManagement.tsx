import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Check, Loader, Search, SlidersHorizontal, X, Phone, Lock, Unlock } from 'lucide-react';
import { Worker } from '../../types';
import { compressImage } from '../../utils/image';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

// ─── Avatar colour palette ────────────────────────────────────────────────────
const AVATAR_COLORS = [
    '#667eea', '#f5576c', '#4facfe', '#43e97b', '#fa709a',
    '#a18cd1', '#f093fb', '#38f9d7', '#fee140', '#6a11cb', '#2575fc', '#11998e',
];

function getInitials(name: string) {
    return name.replace(/[()]/g, '').trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────
export const WorkerManagement: React.FC = () => {
    const { workers, teams, addWorker, updateWorker, approveWorker, deleteWorker, currentUser } = useApp();

    // ── List filters ──────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
    const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

    // ── Modal / form state ────────────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
    const [newWorkerName, setNewWorkerName] = useState('');
    const [newWorkerTeam, setNewWorkerTeam] = useState('');
    const [newWorkerRole, setNewWorkerRole] = useState('');
    const [newWorkerWage, setNewWorkerWage] = useState('');
    const [newWorkerPhone, setNewWorkerPhone] = useState('');
    const [newWorkerPhoto, setNewWorkerPhoto] = useState('');
    const [newWorkerAadhaar, setNewWorkerAadhaar] = useState('');
    const [isCompressing, setIsCompressing] = useState(false);

    // ── Delete modal ──────────────────────────────────────────────────────────
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [workerToDelete, setWorkerToDelete] = useState<string | null>(null);

    // ── Derived filter options ────────────────────────────────────────────────
    const allTeamNames = useMemo(() => [...new Set(workers.map(w => teams.find(t => t.id === w.teamId)?.name || 'Unknown'))].sort(), [workers, teams]);
    const allRoles = useMemo(() => [...new Set(workers.map(w => w.role))].sort(), [workers]);

    // ── Filtered + grouped list ───────────────────────────────────────────────
    const filteredWorkers = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return workers.filter(w => {
            const teamName = teams.find(t => t.id === w.teamId)?.name || '';
            const matchSearch = !q ||
                (w.name || '').toLowerCase().includes(q) ||
                (w.role || '').toLowerCase().includes(q) ||
                teamName.toLowerCase().includes(q) ||
                (w.phoneNumber || '').includes(q);
            const matchTeam = selectedTeams.size === 0 || selectedTeams.has(teamName);
            const matchRole = selectedRoles.size === 0 || selectedRoles.has(w.role);
            return matchSearch && matchTeam && matchRole;
        });
    }, [workers, teams, searchTerm, selectedTeams, selectedRoles]);

    // Group by team
    const grouped = useMemo(() => {
        const map: Record<string, Worker[]> = {};
        filteredWorkers.forEach(w => {
            const teamName = teams.find(t => t.id === w.teamId)?.name || 'Unknown';
            if (!map[teamName]) map[teamName] = [];
            map[teamName].push(w);
        });
        return map;
    }, [filteredWorkers, teams]);

    const pendingCount = workers.filter(w => !w.approved).length;
    const activeFilters = selectedTeams.size + selectedRoles.size;

    // ── Filter chip helpers ───────────────────────────────────────────────────
    function toggleTeam(name: string) {
        setSelectedTeams(prev => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });
    }
    function toggleRole(name: string) {
        setSelectedRoles(prev => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });
    }
    function clearFilters() {
        setSelectedTeams(new Set());
        setSelectedRoles(new Set());
    }

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openAddModal = () => {
        setEditingWorkerId(null);
        setNewWorkerName(''); setNewWorkerTeam(''); setNewWorkerRole('');
        setNewWorkerWage(''); setNewWorkerPhone(''); setNewWorkerPhoto(''); setNewWorkerAadhaar('');
        setIsModalOpen(true);
    };
    const openEditModal = (worker: Worker) => {
        setEditingWorkerId(worker.id);
        setNewWorkerName(worker.name);
        setNewWorkerTeam(worker.teamId);
        setNewWorkerRole(worker.role);
        setNewWorkerWage(worker.dailyWage?.toString() || '');
        setNewWorkerPhone(worker.phoneNumber || '');
        setNewWorkerPhoto(worker.photoUrl || '');
        setNewWorkerAadhaar(worker.aadhaarPhotoUrl || '');
        setIsModalOpen(true);
    };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setField: (v: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsCompressing(true);
            try {
                const b64 = await compressImage(file, 800, 0.5);
                setField(b64);
            } catch { alert('Failed to process image. Please try again.'); }
            finally { setIsCompressing(false); }
        }
    };
    const handleSaveWorker = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWorkerTeam) return;
        const base = editingWorkerId ? workers.find(w => w.id === editingWorkerId) : {};
        const workerData: Worker = {
            id: editingWorkerId || Date.now().toString(),
            wageType: 'DAILY',
            isActive: true,
            approved: true,
            ...(base as any),
            name: newWorkerName,
            teamId: newWorkerTeam,
            role: newWorkerRole || 'Worker',
            dailyWage: Number(newWorkerWage) || 0,
            phoneNumber: newWorkerPhone,
            photoUrl: newWorkerPhoto,
            aadhaarPhotoUrl: newWorkerAadhaar,
        };
        editingWorkerId ? updateWorker(workerData) : addWorker(workerData);
        setIsModalOpen(false);
    };
    const confirmDelete = (id: string) => { setWorkerToDelete(id); setDeleteModalOpen(true); };
    const handleDeleteWorker = () => {
        if (workerToDelete) { deleteWorker(workerToDelete); setDeleteModalOpen(false); setWorkerToDelete(null); }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col min-h-screen bg-gray-50">

            {/* ── Sticky Header ── */}
            <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-3 sticky top-0 z-10">
                <div className="flex items-center justify-between mb-3">
                    <h1 className="text-xl font-bold text-gray-900">Workers</h1>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm hover:bg-indigo-700 transition-colors"
                    >
                        <Plus size={16} /> Add Worker
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, role or team..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                    />
                </div>

                {/* Filter toggle row */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilterPanelOpen(o => !o)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 ${activeFilters > 0
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-600'
                                : 'bg-white border-gray-200 text-gray-500'
                            }`}
                    >
                        <SlidersHorizontal size={13} />
                        Filter {activeFilters > 0 && `(${activeFilters})`}
                    </button>

                    {/* Active filter chips */}
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
                        {[...selectedTeams].map(t => (
                            <button key={t} onClick={() => toggleTeam(t)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-[11px] font-semibold whitespace-nowrap border border-orange-200">
                                {t} <X size={11} />
                            </button>
                        ))}
                        {[...selectedRoles].map(r => (
                            <button key={r} onClick={() => toggleRole(r)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[11px] font-semibold whitespace-nowrap border border-green-200">
                                {r} <X size={11} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Filter Panel ── */}
            {filterPanelOpen && (
                <div className="bg-white border-b border-gray-100 px-4 py-4 animate-[slideDown_0.18s_ease]">
                    {/* Team filter */}
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Team / Gang</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {allTeamNames.map(t => (
                            <button key={t} onClick={() => toggleTeam(t)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedTeams.has(t)
                                        ? 'bg-orange-50 text-orange-700 border-orange-300'
                                        : 'bg-white text-gray-500 border-gray-200'
                                    }`}>
                                {t}
                            </button>
                        ))}
                    </div>
                    {/* Role filter */}
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Role</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {allRoles.map(r => (
                            <button key={r} onClick={() => toggleRole(r)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedRoles.has(r)
                                        ? 'bg-green-50 text-green-700 border-green-300'
                                        : 'bg-white text-gray-500 border-gray-200'
                                    }`}>
                                {r}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button onClick={clearFilters}
                            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 bg-white">
                            Clear All
                        </button>
                        <button onClick={() => setFilterPanelOpen(false)}
                            className="flex-[2] py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
                            Show Results
                        </button>
                    </div>
                </div>
            )}

            {/* ── Pending Approvals Banner ── */}
            {pendingCount > 0 && (
                <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="bg-amber-100 rounded-full p-1.5">
                        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-amber-800">Action Required</p>
                        <p className="text-[11px] text-amber-700">{pendingCount} worker{pendingCount !== 1 ? 's' : ''} waiting for approval</p>
                    </div>
                </div>
            )}

            {/* ── Stats Strip ── */}
            <div className="grid grid-cols-2 gap-3 px-4 mt-3">
                {[
                    { num: filteredWorkers.length, lbl: 'Showing' },
                    { num: filteredWorkers.filter(w => w.approved).length, lbl: 'Approved' },
                ].map(({ num, lbl }) => (
                    <div key={lbl} className="bg-white rounded-2xl px-4 py-3 text-center shadow-sm border border-gray-100">
                        <div className="text-xl font-black text-indigo-600">{num}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{lbl}</div>
                    </div>
                ))}
            </div>

            {/* ── Worker List ── */}
            <div className="flex flex-col gap-3 px-4 mt-4 pb-28">
                {filteredWorkers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                        <span className="text-5xl mb-3">🔍</span>
                        <p className="text-sm font-medium">No workers match your filters</p>
                    </div>
                ) : (
                    Object.entries(grouped).map(([teamName, members]) => (
                        <React.Fragment key={teamName}>
                            {/* Group label */}
                            {Object.keys(grouped).length > 1 && (
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                    <span>👥 {teamName} ({members.length})</span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>
                            )}

                            {members.map((worker, i) => {
                                const globalIdx = workers.findIndex(w => w.id === worker.id);
                                const avatarColor = AVATAR_COLORS[globalIdx % AVATAR_COLORS.length];
                                const teamDisplay = teams.find(t => t.id === worker.teamId)?.name || 'Unknown';

                                return (
                                    <div key={worker.id}
                                        className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex flex-col gap-3 active:scale-[0.98] transition-transform">

                                        {/* Top row: avatar + info + status badge */}
                                        <div className="flex items-center gap-3">
                                            {/* Avatar */}
                                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden"
                                                style={{ background: avatarColor }}>
                                                {worker.photoUrl
                                                    ? <img src={worker.photoUrl} alt={worker.name} className="w-full h-full object-cover" />
                                                    : getInitials(worker.name || '?')}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{worker.name}</p>
                                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-green-50 text-green-700">{worker.role}</span>
                                                    <span className="text-[11px] text-gray-400">· {teamDisplay}</span>
                                                </div>
                                                {worker.phoneNumber && (
                                                    <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
                                                        <Phone size={9} />
                                                        {worker.phoneNumber}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status */}
                                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${worker.approved
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {worker.approved ? 'Active' : 'Pending'}
                                            </span>
                                        </div>

                                        {/* Bottom row: wage + actions */}
                                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                                            <span className="text-base font-black text-indigo-600">
                                                ₹{(worker.dailyWage || 0).toLocaleString()}
                                                <span className="text-[11px] font-normal text-gray-400 ml-1">/ day</span>
                                            </span>

                                            <div className="flex items-center gap-1.5">
                                                {/* Approve (pending only) */}
                                                {!worker.approved && (
                                                    <button onClick={() => approveWorker(worker.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                                                        <Check size={12} /> Approve
                                                    </button>
                                                )}

                                                {/* Lock / Unlock */}
                                                <button
                                                    onClick={() => updateWorker({ ...worker, isLocked: !worker.isLocked })}
                                                    title={worker.isLocked ? 'Unlock Worker' : 'Lock Worker'}
                                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${worker.isLocked
                                                            ? 'bg-red-50 border-red-200 text-red-600'
                                                            : 'bg-gray-50 border-gray-200 text-gray-500'
                                                        }`}>
                                                    {worker.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                                                </button>

                                                {/* Edit */}
                                                <button onClick={() => openEditModal(worker)}
                                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold border border-indigo-200">
                                                    Edit
                                                </button>

                                                {/* Delete (owner only) */}
                                                {currentUser?.role === 'OWNER' && (
                                                    <button onClick={() => confirmDelete(worker.id)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold border border-red-200">
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))
                )}
            </div>

            {/* ── Add / Edit Modal ── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    {isCompressing && (
                        <div className="absolute inset-0 z-[60] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                            <Loader className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                            <p className="text-sm font-bold text-gray-800">Compressing Image…</p>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] relative">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0 rounded-t-2xl">
                            <h3 className="text-base font-bold text-gray-800">{editingWorkerId ? 'Edit Worker' : 'Add New Worker'}</h3>
                            <button onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="worker-form" onSubmit={handleSaveWorker}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Left: Inputs */}
                                    <div className="md:col-span-2 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input type="text" required
                                                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:border-indigo-500 outline-none"
                                                value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)}
                                                placeholder="Enter worker full name" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                            <input type="tel"
                                                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:border-indigo-500 outline-none"
                                                value={newWorkerPhone} onChange={e => setNewWorkerPhone(e.target.value)}
                                                placeholder="+91 98765 43210" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                                                <select required
                                                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:border-indigo-500 outline-none"
                                                    value={newWorkerTeam}
                                                    onChange={e => { setNewWorkerTeam(e.target.value); setNewWorkerRole(''); setNewWorkerWage(''); }}>
                                                    <option value="">Select Team</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                                {newWorkerTeam ? (
                                                    <select
                                                        className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:border-indigo-500 outline-none"
                                                        value={newWorkerRole}
                                                        onChange={e => {
                                                            const rn = e.target.value;
                                                            setNewWorkerRole(rn);
                                                            const roleDef = teams.find(t => t.id === newWorkerTeam)?.definedRoles?.find(r => r.name === rn);
                                                            if (roleDef) setNewWorkerWage(roleDef.defaultWage.toString());
                                                        }}>
                                                        <option value="">Select Role</option>
                                                        {teams.find(t => t.id === newWorkerTeam)?.definedRoles?.map(r =>
                                                            <option key={r.name} value={r.name}>{r.name}</option>)}
                                                    </select>
                                                ) : (
                                                    <input type="text" disabled placeholder="Select team first"
                                                        className="w-full rounded-xl border border-gray-200 bg-gray-100 p-2.5 text-sm text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Wage (₹)</label>
                                            <input type="number"
                                                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:border-indigo-500 outline-none"
                                                value={newWorkerWage} onChange={e => setNewWorkerWage(e.target.value)} placeholder="0" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Card Photo</label>
                                            <div className="flex items-center gap-4 p-3 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                                                {newWorkerAadhaar
                                                    ? <img src={newWorkerAadhaar} alt="Aadhaar" className="w-20 h-12 rounded object-cover border bg-white" />
                                                    : <div className="w-20 h-12 rounded bg-gray-100 border flex items-center justify-center text-gray-400 text-xs text-center">No Image</div>}
                                                <div className="flex-1">
                                                    <input type="file" accept="image/*"
                                                        onChange={e => handleFileChange(e, setNewWorkerAadhaar)}
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                                                    <p className="text-[11px] text-gray-400 mt-1">Upload front of Aadhaar card</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Photo */}
                                    <div className="md:col-span-1">
                                        <div className="flex flex-col items-center gap-3 p-4 border rounded-xl bg-gray-50 h-full">
                                            <label className="text-sm font-semibold text-gray-700">Worker Photo</label>
                                            <div className="relative group cursor-pointer">
                                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-200 flex items-center justify-center">
                                                    {newWorkerPhoto
                                                        ? <img src={newWorkerPhoto} alt="Worker" className="w-full h-full object-cover" />
                                                        : <span className="text-4xl text-gray-400 font-bold uppercase">{newWorkerName ? newWorkerName.charAt(0) : '?'}</span>}
                                                </div>
                                                <input type="file" accept="image/*"
                                                    onChange={e => handleFileChange(e, setNewWorkerPhoto)}
                                                    className="absolute inset-0 opacity-0 cursor-pointer" title="Click to upload photo" />
                                                <div className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-lg pointer-events-none">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 text-center px-2">Click the circle to upload a clear face photo.</p>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0 rounded-b-2xl">
                            <button type="button" onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors">
                                Cancel
                            </button>
                            <button type="submit" form="worker-form"
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm shadow-sm transition-colors flex items-center gap-2">
                                {editingWorkerId ? 'Save Changes' : <><Plus size={16} /> Add Worker</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteModalOpen}
                title="Delete Worker"
                message="Are you sure you want to delete this worker? They will be archived and removed from active lists."
                confirmText="Delete"
                onConfirm={handleDeleteWorker}
                onCancel={() => setDeleteModalOpen(false)}
            />
        </div>
    );
};
