import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';

export const TeamManagement: React.FC = () => {
    // Site Management State
    const [siteModalOpen, setSiteModalOpen] = useState(false);
    const [selectedTeamSites, setSelectedTeamSites] = useState<string[]>([]);

    const { teams, addTeam, updateTeam, deleteTeam, sites } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

    // Role Management State
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleWage, setNewRoleWage] = useState('');
    const [editingRoleIndex, setEditingRoleIndex] = useState<number | null>(null);

    const handleSaveTeam = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingTeamId) {
            // Edit existing team
            updateTeam({
                ...teams.find(t => t.id === editingTeamId)!,
                name: teamName
            });
        } else {
            // Create new team
            addTeam({
                id: Date.now().toString(),
                name: teamName,
                repId: '',
                definedRoles: []
            });
        }

        setTeamName('');
        setEditingTeamId(null);
        setIsModalOpen(false);
    };

    const openCreateModal = () => {
        setEditingTeamId(null);
        setTeamName('');
        setIsModalOpen(true);
    };

    const openEditTeamModal = (team: any) => {
        setEditingTeamId(team.id);
        setTeamName(team.name);
        setIsModalOpen(true);
    };

    const openRoleModal = (team: any) => {
        setSelectedTeam(team);
        setRoleModalOpen(true);
        setNewRoleName('');
        setNewRoleWage('');
        setEditingRoleIndex(null);
    };

    const handleSaveRole = () => {
        if (!selectedTeam || !newRoleName || !newRoleWage) return;

        let updatedRoles = [...(selectedTeam.definedRoles || [])];

        if (editingRoleIndex !== null) {
            // Edit existing
            updatedRoles[editingRoleIndex] = { name: newRoleName, defaultWage: Number(newRoleWage) };
        } else {
            // Add new
            updatedRoles.push({ name: newRoleName, defaultWage: Number(newRoleWage) });
        }

        const updatedTeam = {
            ...selectedTeam,
            definedRoles: updatedRoles
        };

        updateTeam(updatedTeam);
        setSelectedTeam(updatedTeam);

        // Reset form
        setNewRoleName('');
        setNewRoleWage('');
        setEditingRoleIndex(null);
    };

    const handleEditRoleClick = (role: { name: string, defaultWage: number }, index: number) => {
        setNewRoleName(role.name);
        setNewRoleWage(role.defaultWage.toString());
        setEditingRoleIndex(index);
    };

    const handleCancelEdit = () => {
        setNewRoleName('');
        setNewRoleWage('');
        setEditingRoleIndex(null);
    };

    const openSiteModal = (team: any) => {
        setSelectedTeam(team);
        setSelectedTeamSites(team.permittedSiteIds || []);
        setSiteModalOpen(true);
    };

    const handleSaveSites = () => {
        if (!selectedTeam) return;

        const updatedTeam = {
            ...selectedTeam,
            permittedSiteIds: selectedTeamSites
        };

        updateTeam(updatedTeam);
        setSiteModalOpen(false);
        setSelectedTeam(null);
        setSelectedTeamSites([]);
    };

    const toggleSiteSelection = (siteId: string) => {
        setSelectedTeamSites(prev =>
            prev.includes(siteId)
                ? prev.filter(id => id !== siteId)
                : [...prev, siteId]
        );
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Team Management</h2>
                <button
                    onClick={openCreateModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus size={20} />
                    Create Team
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map(team => (
                    <div key={team.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-semibold text-gray-800">{team.name}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEditTeamModal(team)}
                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Rename Team"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => deleteTeam(team.id)}
                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete Team"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">Rep ID: {team.repId || 'Unassigned'}</p>

                        <div className="mt-4">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Defined Roles</h4>
                            <div className="flex flex-wrap gap-2">
                                {team.definedRoles?.map(role => (
                                    <span key={role.name} className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs border border-blue-100">
                                        {role.name} (₹{role.defaultWage})
                                    </span>
                                ))}
                                {(!team.definedRoles || team.definedRoles.length === 0) && (
                                    <span className="text-xs text-gray-400 italic">No roles defined</span>
                                )}
                            </div>
                        </div>

                        {/* Permitted Sites Summary */}
                        <div className="mt-4">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Permitted Sites</h4>
                            <div className="flex flex-wrap gap-2">
                                {team.permittedSiteIds?.map(siteId => {
                                    const site = sites.find(s => s.id === siteId);
                                    return site ? (
                                        <span key={siteId} className="inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-700 text-xs border border-green-100">
                                            {site.name}
                                        </span>
                                    ) : null;
                                })}
                                {(!team.permittedSiteIds || team.permittedSiteIds.length === 0) && (
                                    <span className="text-xs text-gray-400 italic">No sites assigned</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-3 pt-4 border-t border-gray-50 justify-between">
                            <button
                                onClick={() => openRoleModal(team)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                                Manage Roles
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                                onClick={() => openSiteModal(team)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                                Manage Sites
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">{editingTeamId ? 'Edit Team Name' : 'Create New Team'}</h3>
                        <form onSubmit={handleSaveTeam}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                            <input
                                type="text"
                                required
                                className="w-full border rounded-md p-2 mb-4"
                                value={teamName}
                                onChange={e => setTeamName(e.target.value)}
                            />
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-600">Cancel</button>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">{editingTeamId ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Roles Modal */}
            {roleModalOpen && selectedTeam && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-2">Manage Roles for {selectedTeam.name}</h3>
                        <p className="text-sm text-gray-500 mb-6">Define categories and wages for this team.</p>

                        <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                            {selectedTeam.definedRoles?.map((role: { name: string, defaultWage: number }, idx: number) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div
                                        className="cursor-pointer flex-1"
                                        onClick={() => handleEditRoleClick(role, idx)}
                                    >
                                        <div className="font-medium text-gray-900">{role.name}</div>
                                        <div className="text-xs text-gray-500">Default Wage: ₹{role.defaultWage}</div>
                                    </div>
                                    {editingRoleIndex === idx && (
                                        <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">Editing</span>
                                    )}
                                </div>
                            ))}
                            {(!selectedTeam.definedRoles || selectedTeam.definedRoles.length === 0) && (
                                <div className="text-center text-gray-400 py-4 border-2 border-dashed rounded-lg">
                                    No roles defined yet. Add one below.
                                </div>
                            )}
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                                {editingRoleIndex !== null ? 'Edit Role' : 'Add New Role'}
                            </h4>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Role Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Mason"
                                        className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newRoleName}
                                        onChange={e => setNewRoleName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Default Wage</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newRoleWage}
                                        onChange={e => setNewRoleWage(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {editingRoleIndex !== null && (
                                    <button
                                        onClick={handleCancelEdit}
                                        className="w-1/3 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    onClick={handleSaveRole}
                                    disabled={!newRoleName || !newRoleWage}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    {editingRoleIndex !== null ? 'Update Role' : 'Add Role'}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end mt-4 pt-4 border-t">
                            <button onClick={() => setRoleModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Sites Modal */}
            {siteModalOpen && selectedTeam && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-2">Manage Permitted Sites</h3>
                        <p className="text-sm text-gray-500 mb-6">Select sites that {selectedTeam.name} can access for reports & advances.</p>

                        <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto">
                            {sites.map(site => (
                                <div
                                    key={site.id}
                                    onClick={() => toggleSiteSelection(site.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedTeamSites.includes(site.id)
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-white border-gray-100 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedTeamSites.includes(site.id)
                                        ? 'bg-blue-600 border-blue-600'
                                        : 'border-gray-300'
                                        }`}>
                                        {selectedTeamSites.includes(site.id) && <Plus size={14} className="text-white transform rotate-45" strokeWidth={4} />}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{site.name}</div>
                                        <div className="text-xs text-gray-500">Radius: {site.radius}m</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button
                                onClick={() => setSiteModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSites}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
