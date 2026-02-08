import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Role } from '../../types';
import { Plus, Edit, Trash2, Key, Save, X, Lock, Unlock } from 'lucide-react';

export const UserManagement: React.FC = () => {
    const { users, teams, addUser, updateUserPassword, deleteUser, updateUserStatus } = useApp();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Form States
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<Role>('TEAM_REP');
    const [newTeamId, setNewTeamId] = useState('');

    const [passwordUpdate, setPasswordUpdate] = useState('');

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        const newUser: User = {
            id: Date.now().toString(), // Temp ID until DB sync
            username: newUsername,
            password: newPassword,
            name: newName,
            role: newRole,
            teamId: newRole === 'TEAM_REP' ? newTeamId : undefined
        };
        addUser(newUser);
        setIsAddModalOpen(false);
        resetForm();
    };

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedUser && passwordUpdate) {
            updateUserPassword(selectedUser.id, passwordUpdate);
            setIsPasswordModalOpen(false);
            setPasswordUpdate('');
            setSelectedUser(null);
        }
    };

    const resetForm = () => {
        setNewUsername('');
        setNewPassword('');
        setNewName('');
        setNewRole('TEAM_REP');
        setNewTeamId('');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">User Management</h2>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    <Plus size={20} />
                    Add User
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Username</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Associated Team</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Password</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 text-gray-600">{user.username}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs rounded-full ${user.role === 'OWNER' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    {user.teamId ? teams.find(t => t.id === user.teamId)?.name || 'Unknown Team' : '-'}
                                </td>
                                <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                                    {user.password}
                                    {/* Displaying plain text as requested for full control */}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setIsPasswordModalOpen(true);
                                        }}
                                        className="text-gray-400 hover:text-blue-600"
                                        title="Change Password"
                                    >
                                        <Key size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Are you sure you want to ${user.isLocked ? 'unlock' : 'lock'} user ${user.username}?`)) {
                                                updateUserStatus(user.id, !user.isLocked);
                                            }
                                        }}
                                        className={`${user.isLocked ? 'text-red-600' : 'text-green-600'} hover:opacity-80`}
                                        title={user.isLocked ? "Unlock User" : "Lock User"}
                                    >
                                        {user.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                                    </button>
                                    {user.role !== 'OWNER' && (
                                        <button
                                            onClick={() => {
                                                if (confirm(`Delete user ${user.username}?`)) deleteUser(user.id);
                                            }}
                                            className="text-gray-400 hover:text-red-600"
                                            title="Delete User"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Add New User</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newRole}
                                    onChange={e => setNewRole(e.target.value as Role)}
                                >
                                    <option value="TEAM_REP">Team Representative</option>
                                    <option value="OWNER">Owner (Admin)</option>
                                </select>
                            </div>
                            {newRole === 'TEAM_REP' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign Team</label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newTeamId}
                                        onChange={e => setNewTeamId(e.target.value)}
                                        required
                                    >
                                        <option value="">Select a team...</option>
                                        {teams.map(team => (
                                            <option key={team.id} value={team.id}>{team.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {isPasswordModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Change Password for {selectedUser.username}</h3>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={passwordUpdate}
                                    onChange={e => setPasswordUpdate(e.target.value)}
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
