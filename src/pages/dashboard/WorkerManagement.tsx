import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Check, Search, Lock, Unlock, Loader, Trash2 } from 'lucide-react';
import { Worker } from '../../types';
import { compressImage } from '../../utils/image';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

export const WorkerManagement: React.FC = () => {
    const { workers, teams, addWorker, updateWorker, approveWorker, deleteWorker } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPendingOnly, setShowPendingOnly] = useState(false); // New state filter

    // Form State
    const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
    const [newWorkerName, setNewWorkerName] = useState('');
    const [newWorkerTeam, setNewWorkerTeam] = useState('');
    const [newWorkerRole, setNewWorkerRole] = useState('');
    const [newWorkerWage, setNewWorkerWage] = useState('');
    const [newWorkerPhone, setNewWorkerPhone] = useState('');
    const [newWorkerPhoto, setNewWorkerPhoto] = useState<string>('');
    const [newWorkerAadhaar, setNewWorkerAadhaar] = useState<string>('');

    // Compression State
    const [isCompressing, setIsCompressing] = useState(false);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [workerToDelete, setWorkerToDelete] = useState<string | null>(null);

    const { currentUser } = useApp();

    const openAddModal = () => {
        setEditingWorkerId(null);
        setNewWorkerName('');
        setNewWorkerTeam('');
        setNewWorkerRole('');
        setNewWorkerWage('');
        setNewWorkerPhone('');
        setNewWorkerPhoto('');
        setNewWorkerAadhaar('');
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setField: (val: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsCompressing(true);
            try {
                // Compress image to max 800px width/height and 0.5 quality (JPEG)
                const compressedBase64 = await compressImage(file, 800, 0.5);
                setField(compressedBase64);
            } catch (error) {
                console.error("Image compression failed:", error);
                alert("Failed to process image. Please try again.");
            } finally {
                setIsCompressing(false);
            }
        }
    };

    const handleSaveWorker = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWorkerTeam) return;

        const workerData: Worker = {
            id: editingWorkerId || Date.now().toString(),
            name: newWorkerName,
            teamId: newWorkerTeam,
            role: newWorkerRole || 'Worker',
            wageType: 'DAILY',
            dailyWage: Number(newWorkerWage) || 0,
            phoneNumber: newWorkerPhone,
            photoUrl: newWorkerPhoto,
            aadhaarPhotoUrl: newWorkerAadhaar,
            isActive: true,
            approved: true, // Auto-approve for simplicity in this flow
            // Preserve existing fields if editing
            ...(editingWorkerId ? workers.find(w => w.id === editingWorkerId) : {}) as any
        };

        // Explicitly overwrite with form values
        workerData.name = newWorkerName;
        workerData.teamId = newWorkerTeam;
        workerData.role = newWorkerRole;
        workerData.dailyWage = Number(newWorkerWage);
        workerData.phoneNumber = newWorkerPhone;
        workerData.photoUrl = newWorkerPhoto;
        workerData.aadhaarPhotoUrl = newWorkerAadhaar;

        if (editingWorkerId) {
            updateWorker(workerData);
        } else {
            addWorker(workerData);
        }

        setIsModalOpen(false);
        setNewWorkerName('');
        setNewWorkerTeam('');
        setNewWorkerRole('');
        setNewWorkerWage('');
        setNewWorkerPhone('');
        setNewWorkerPhoto('');
        setNewWorkerAadhaar('');
        setEditingWorkerId(null);
    };

    const confirmDelete = (workerId: string) => {
        setWorkerToDelete(workerId);
        setDeleteModalOpen(true);
    };

    const handleDeleteWorker = () => {
        if (workerToDelete) {
            deleteWorker(workerToDelete);
            setDeleteModalOpen(false);
            setWorkerToDelete(null);
        }
    };

    const pendingWorkers = workers.filter(w => !w.approved);
    const pendingCount = pendingWorkers.length;

    const filteredWorkers = workers.filter(w => {
        const nameMatch = (w.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const roleMatch = (w.role || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = nameMatch || roleMatch;

        if (showPendingOnly) {
            return matchesSearch && !w.approved;
        }
        return matchesSearch;
    });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Worker Management</h2>
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus size={20} />
                    Add
                </button>

            </div>

            {/* Pending Approvals Banner */}
            {pendingCount > 0 && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-100 p-2 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-yellow-800">Action Required</h3>
                            <p className="text-xs text-yellow-700">
                                {pendingCount} worker{pendingCount !== 1 ? 's' : ''} waiting for approval.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPendingOnly(!showPendingOnly)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${showPendingOnly
                            ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                            : 'bg-white text-yellow-700 border border-yellow-300 hover:bg-yellow-50 shadow-sm'}`}
                    >
                        {showPendingOnly ? 'Show All' : 'Review Requests'}
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search workers..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Worker List - Responsive */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {/* Desktop Table - Hidden on Mobile */}
                <table className="min-w-full hidden md:table">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredWorkers.map((worker) => (
                            <tr key={worker.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold uppercase overflow-hidden ring-1 ring-gray-300">
                                            {worker.photoUrl ? (
                                                <img src={worker.photoUrl} alt={worker.name} className="w-full h-full object-cover" />
                                            ) : (
                                                (worker.name || '?').charAt(0)
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                                            {worker.phoneNumber && (
                                                <div className="text-xs text-gray-500">{worker.phoneNumber}</div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{worker.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {teams.find(t => t.id === worker.teamId)?.name || 'Unknown Team'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {worker.approved ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                            Pending
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    {!worker.approved && (
                                        <button
                                            onClick={() => approveWorker(worker.id)}
                                            className="text-green-600 hover:text-green-900 mr-4 inline-flex items-center gap-1"
                                        >
                                            <Check size={16} /> Approve
                                        </button>
                                    )}
                                    <button
                                        onClick={() => updateWorker({ ...worker, isLocked: !worker.isLocked })}
                                        className={`${worker.isLocked ? 'text-red-600' : 'text-gray-400'} hover:text-red-800 mr-4`}
                                        title={worker.isLocked ? "Unlock Worker" : "Lock Worker"}
                                    >
                                        {worker.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                    </button>
                                    <button
                                        onClick={() => openEditModal(worker)}
                                        className="text-blue-600 hover:text-blue-900 mr-4"
                                    >
                                        Edit
                                    </button>
                                    {currentUser?.role === 'OWNER' && (
                                        <button
                                            onClick={() => confirmDelete(worker.id)}
                                            className="text-gray-400 hover:text-red-600"
                                            title="Delete Worker"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Mobile Cards - Hidden on Desktop */}
                <div className="md:hidden divide-y divide-gray-100">
                    {filteredWorkers.map((worker) => (
                        <div key={worker.id} className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase overflow-hidden ring-1 ring-blue-200">
                                        {worker.photoUrl ? (
                                            <img src={worker.photoUrl} alt={worker.name} className="w-full h-full object-cover" />
                                        ) : (
                                            (worker.name || '?').charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">{worker.name}</h3>
                                        <p className="text-xs text-gray-500">{worker.role} • {teams.find(t => t.id === worker.teamId)?.name}</p>
                                        {worker.phoneNumber && (
                                            <p className="text-xs text-gray-400 mt-0.5">{worker.phoneNumber}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {worker.approved ? (
                                        <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-100">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs font-semibold border border-yellow-100">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="text-xs text-gray-500">
                                    Wage: ₹{worker.dailyWage} / day
                                </div>
                                <div className="flex items-center gap-3">
                                    {!worker.approved && (
                                        <button
                                            onClick={() => approveWorker(worker.id)}
                                            className="text-green-600 text-xs font-bold uppercase tracking-wide border border-green-200 px-3 py-1.5 rounded bg-green-50"
                                        >
                                            Approve
                                        </button>
                                    )}
                                    <button
                                        onClick={() => updateWorker({ ...worker, isLocked: !worker.isLocked })}
                                        className={`${worker.isLocked ? 'text-red-600 border-red-200 bg-red-50' : 'text-gray-600 border-gray-200 bg-gray-50'} text-xs font-bold uppercase tracking-wide border px-3 py-1.5 rounded`}
                                    >
                                        {worker.isLocked ? 'Unlock' : 'Lock'}
                                    </button>
                                    <button
                                        onClick={() => openEditModal(worker)}
                                        className="text-blue-600 text-xs font-bold uppercase tracking-wide border border-blue-200 px-3 py-1.5 rounded bg-blue-50"
                                    >
                                        Edit
                                    </button>
                                    {currentUser?.role === 'OWNER' && (
                                        <button
                                            onClick={() => confirmDelete(worker.id)}
                                            className="text-red-600 text-xs font-bold uppercase tracking-wide border border-red-200 px-3 py-1.5 rounded bg-red-50"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredWorkers.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            No workers found.
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Worker Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    {/* Compression Overlay */}
                    {isCompressing && (
                        <div className="absolute inset-0 z-[60] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                            <div className="flex flex-col items-center animate-bounce-subtle">
                                <Loader className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                                <h3 className="text-lg font-bold text-gray-800">Compressing Image...</h3>
                                <p className="text-sm text-gray-500">Optimizing for storage</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] relative">
                        {/* Header - Fixed */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                            <h3 className="text-lg font-bold text-gray-800">{editingWorkerId ? 'Edit Worker' : 'Add New Worker'}</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="worker-form" onSubmit={handleSaveWorker}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Left Column: Inputs */}
                                    <div className="md:col-span-2 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                                                value={newWorkerName}
                                                onChange={e => setNewWorkerName(e.target.value)}
                                                placeholder="Enter worker full name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                            <input
                                                type="tel"
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                                                value={newWorkerPhone}
                                                onChange={e => setNewWorkerPhone(e.target.value)}
                                                placeholder="+91 98765 43210"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                                                <select
                                                    required
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                                                    value={newWorkerTeam}
                                                    onChange={e => {
                                                        setNewWorkerTeam(e.target.value);
                                                        if (e.target.value !== newWorkerTeam) {
                                                            setNewWorkerRole('');
                                                            setNewWorkerWage('');
                                                        }
                                                    }}
                                                >
                                                    <option value="">Select Team</option>
                                                    {teams.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                                {newWorkerTeam ? (
                                                    <select
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                                                        value={newWorkerRole}
                                                        onChange={e => {
                                                            const roleName = e.target.value;
                                                            setNewWorkerRole(roleName);
                                                            const team = teams.find(t => t.id === newWorkerTeam);
                                                            const roleDef = team?.definedRoles?.find(r => r.name === roleName);
                                                            if (roleDef) {
                                                                setNewWorkerWage(roleDef.defaultWage.toString());
                                                            }
                                                        }}
                                                    >
                                                        <option value="">Select Role</option>
                                                        {teams.find(t => t.id === newWorkerTeam)?.definedRoles?.map(r => (
                                                            <option key={r.name} value={r.name}>{r.name}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        placeholder="Select team first"
                                                        disabled
                                                        className="w-full rounded-lg border-gray-300 bg-gray-100 p-2.5 text-gray-500 text-sm"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Wage (₹)</label>
                                            <input
                                                type="number"
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                                                value={newWorkerWage}
                                                onChange={e => setNewWorkerWage(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>

                                        {/* Aadhaar Upload moved to bottom left */}
                                        <div className="pt-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Card Photo</label>
                                            <div className="flex items-center gap-4 p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                                                {newWorkerAadhaar ? (
                                                    <img src={newWorkerAadhaar} alt="Aadhaar" className="w-20 h-12 rounded object-cover border bg-white" />
                                                ) : (
                                                    <div className="w-20 h-12 rounded bg-gray-100 border flex items-center justify-center text-gray-400 text-xs text-center leading-tight p-1">No<br />Image</div>
                                                )}
                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileChange(e, setNewWorkerAadhaar)}
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">Upload front side of Aadhaar card</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Photo Upload */}
                                    <div className="md:col-span-1">
                                        <div className="flex flex-col items-center gap-4 p-4 border rounded-xl bg-gray-50 h-full">
                                            <label className="text-sm font-semibold text-gray-700">Worker Photo</label>

                                            <div className="relative group cursor-pointer">
                                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-200 flex items-center justify-center">
                                                    {newWorkerPhoto ? (
                                                        <img src={newWorkerPhoto} alt="Worker" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-4xl text-gray-400 font-bold uppercase">
                                                            {newWorkerName ? newWorkerName.charAt(0) : '?'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Hidden File Input covering the area */}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileChange(e, setNewWorkerPhoto)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    title="Click to upload photo"
                                                />

                                                {/* Edit Overlay */}
                                                <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg transform translate-x-1 translate-y-1 pointer-events-none">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                                </div>
                                            </div>

                                            <p className="text-xs text-gray-500 text-center px-4">
                                                Click the circle to upload a clear face photo. This will be used for profile identification.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer - Fixed */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0 z-10 rounded-b-xl">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="worker-form"
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors flex items-center gap-2"
                            >
                                {editingWorkerId ? 'Save Changes' : (
                                    <>
                                        <Plus size={18} /> Add
                                    </>
                                )}
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
