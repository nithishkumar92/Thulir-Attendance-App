import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export interface Vendor {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    gst_number: string | null;
    category: 'material' | 'labour_contractor' | 'equipment' | 'other';
    address: string | null;
    is_active: boolean;
}

export const Vendors: React.FC = () => {
    const { currentUser } = useApp();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

    const [formData, setFormData] = useState<Partial<Vendor>>({
        name: '',
        phone: '',
        email: '',
        gst_number: '',
        category: 'material',
        address: '',
        is_active: true
    });

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/accounts?resource=vendors');
            if (response.ok) {
                const data = await response.json();
                setVendors(data);
            } else {
                console.error('Failed to fetch vendors');
            }
        } catch (error) {
            console.error('Error fetching vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (vendor?: Vendor) => {
        if (vendor) {
            setEditingVendor(vendor);
            setFormData({ ...vendor });
        } else {
            setEditingVendor(null);
            setFormData({
                name: '',
                phone: '',
                email: '',
                gst_number: '',
                category: 'material',
                address: '',
                is_active: true
            });
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingVendor(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingVendor 
                ? `/api/accounts?resource=vendors&id=${editingVendor.id}` 
                : '/api/accounts?resource=vendors';
                
            const method = editingVendor ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const savedVendor = await response.json();
                if (editingVendor) {
                    setVendors(vendors.map(v => v.id === savedVendor.id ? savedVendor : v));
                } else {
                    setVendors([savedVendor, ...vendors]);
                }
                handleCloseForm();
            } else {
                const err = await response.json();
                alert(`Error: ${err.error || 'Failed to save vendor'}`);
            }
        } catch (error) {
            console.error('Error saving vendor:', error);
            alert('An unexpected error occurred.');
        }
    };

    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.phone && v.phone.includes(searchTerm))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Vendors Directory</h1>
                    <p className="text-gray-500 text-sm">Manage suppliers, labour contractors, and equipment letters.</p>
                </div>
                <button
                    onClick={() => handleOpenForm()}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
                >
                    <Plus size={20} />
                    <span>Add Vendor</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search vendors by name, phone, or category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading vendors...</div>
                    ) : filteredVendors.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {searchTerm ? 'No vendors matching your search.' : 'No vendors found. Add your first vendor!'}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase text-xs tracking-wider">
                                    <th className="p-4 font-semibold">Vendor Name</th>
                                    <th className="p-4 font-semibold text-center mt-0">Status</th>
                                    <th className="p-4 font-semibold">Category</th>
                                    <th className="p-4 font-semibold">Contact</th>
                                    <th className="p-4 font-semibold">GST / Tax Info</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {filteredVendors.map((vendor) => (
                                    <tr key={vendor.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">
                                            {vendor.name}
                                        </td>
                                        <td className="p-4 text-center">
                                            {vendor.is_active ? (
                                                <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 capitalize">
                                            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium tracking-wide">
                                                {vendor.category.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-gray-800">{vendor.phone || '-'}</div>
                                            <div className="text-gray-500 text-xs truncate max-w-[150px]">{vendor.email}</div>
                                        </td>
                                        <td className="p-4 text-gray-600 font-mono text-xs">
                                            {vendor.gst_number || '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleOpenForm(vendor)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit Vendor"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Slide-over Form Overlay */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={handleCloseForm} />
                    <div className="fixed inset-y-0 right-0 max-w-md w-full flex">
                        <div className="w-full h-full bg-white shadow-2xl flex flex-col transform transition-transform border-l border-gray-200">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                                </h2>
                                <button onClick={handleCloseForm} className="text-gray-400 hover:bg-gray-100 hover:text-gray-700 p-2 rounded-full transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto">
                                <div className="p-6 space-y-5 flex-1">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Company/Vendor Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            placeholder="e.g. Acme Bricks"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                                            <select
                                                required
                                                value={formData.category || 'material'}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="material">Material</option>
                                                <option value="labour_contractor">Labour Contractor</option>
                                                <option value="equipment">Equipment Hire</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                            <select
                                                value={formData.is_active ? 'active' : 'inactive'}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={formData.phone || ''}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g. +91 9876543210"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email || ''}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g. contact@acme.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GST/Tax Number</label>
                                        <input
                                            type="text"
                                            value={formData.gst_number || ''}
                                            onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g. 29ABCDE1234FZ5"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <textarea
                                            value={formData.address || ''}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                            placeholder="Full business address..."
                                        />
                                    </div>
                                </div>
                                
                                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                                    >
                                        <CheckCircle size={18} />
                                        <span>{editingVendor ? 'Save Changes' : 'Create Vendor'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
