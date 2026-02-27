import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export interface Material {
    id: string;
    name: string;
    category: 'sand' | 'cement' | 'steel' | 'pipe' | 'fitting' | 'tile' | 'electrical' | 'equipment' | 'other';
    unit: string;
    is_tile: boolean;
    is_active: boolean;
}

export const Materials: React.FC = () => {
    const { currentUser } = useApp();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

    const [formData, setFormData] = useState<Partial<Material>>({
        name: '',
        category: 'other',
        unit: '',
        is_tile: false,
        is_active: true
    });

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/accounts?resource=materials');
            if (response.ok) {
                const data = await response.json();
                setMaterials(data);
            } else {
                console.error('Failed to fetch materials');
            }
        } catch (error) {
            console.error('Error fetching materials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (material?: Material) => {
        if (material) {
            setEditingMaterial(material);
            setFormData({ ...material });
        } else {
            setEditingMaterial(null);
            setFormData({
                name: '',
                category: 'other',
                unit: '',
                is_tile: false,
                is_active: true
            });
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingMaterial(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Auto toggle validation to ensure is_tile is true ONLY if category is 'tile'
            const submissionData = { ...formData };
            if (submissionData.category === 'tile') {
                submissionData.is_tile = true;
            } else {
                submissionData.is_tile = false;
            }

            const url = editingMaterial 
                ? `/api/accounts?resource=materials&id=${editingMaterial.id}` 
                : '/api/accounts?resource=materials';
                
            const method = editingMaterial ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });

            if (response.ok) {
                const savedMaterial = await response.json();
                if (editingMaterial) {
                    setMaterials(materials.map(m => m.id === savedMaterial.id ? savedMaterial : m));
                } else {
                    setMaterials([savedMaterial, ...materials]);
                }
                handleCloseForm();
            } else {
                const err = await response.json();
                alert(`Error: ${err.error || 'Failed to save material'}`);
            }
        } catch (error) {
            console.error('Error saving material:', error);
            alert('An unexpected error occurred.');
        }
    };

    const filteredMaterials = materials.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categories = [
        { value: 'sand', label: 'Sand & Aggregates' },
        { value: 'cement', label: 'Cement' },
        { value: 'steel', label: 'Steel & Rebar' },
        { value: 'pipe', label: 'Plumbing Pipes' },
        { value: 'fitting', label: 'Plumbing Fittings' },
        { value: 'tile', label: 'Tiles & Marbles' },
        { value: 'electrical', label: 'Electricals' },
        { value: 'equipment', label: 'Equipment & Tools' },
        { value: 'other', label: 'Other/Misc' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Material Master</h1>
                    <p className="text-gray-500 text-sm">Define types of materials, tracking units, and tile indicators.</p>
                </div>
                <button
                    onClick={() => handleOpenForm()}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
                >
                    <Plus size={20} />
                    <span>Add Material</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search materials by name or category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading materials...</div>
                    ) : filteredMaterials.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {searchTerm ? 'No materials matching your search.' : 'No materials found. Add your first material!'}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase text-xs tracking-wider">
                                    <th className="p-4 font-semibold">Material Name</th>
                                    <th className="p-4 font-semibold text-center mt-0">Status</th>
                                    <th className="p-4 font-semibold">Category</th>
                                    <th className="p-4 font-semibold text-center">Measurement Unit</th>
                                    <th className="p-4 font-semibold text-center">Is Tile Form?</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {filteredMaterials.map((material) => (
                                    <tr key={material.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900 border-l-4 border-transparent hover:border-blue-500">
                                            {material.name}
                                        </td>
                                        <td className="p-4 text-center">
                                            {material.is_active ? (
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
                                            <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium tracking-wide border border-gray-200">
                                                {categories.find(c => c.value === material.category)?.label || material.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-gray-600 font-mono">
                                            {material.unit}
                                        </td>
                                        <td className="p-4 text-center">
                                            {material.is_tile ? (
                                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs">Yes</span>
                                            ) : (
                                                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs">No</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleOpenForm(material)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit Material"
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
                                    {editingMaterial ? 'Edit Material' : 'Add New Material'}
                                </h2>
                                <button onClick={handleCloseForm} className="text-gray-400 hover:bg-gray-100 hover:text-gray-700 p-2 rounded-full transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto">
                                <div className="p-6 space-y-5 flex-1">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Material Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            placeholder="e.g. Portland Cement 43 Grade"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                                        <select
                                            required
                                            value={formData.category || 'other'}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="" disabled>Select category...</option>
                                            {categories.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                        {formData.category === 'tile' && (
                                            <p className="mt-1 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                                Note: Creating a material under "Tiles & Marbles" will mark it as a Tile. You will need to define variants inside the Tile Master directory.
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Unit <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.unit || ''}
                                                onChange={(e) => setFormData({ ...formData, unit: e.target.value.toLowerCase() })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="e.g. bags, loads, kg"
                                            />
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
                                        <span>{editingMaterial ? 'Save Changes' : 'Create Material'}</span>
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
