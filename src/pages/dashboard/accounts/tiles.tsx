import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export interface TileMaster {
    id: string;
    material_id: string;
    material_name?: string; // Joined from material_master
    brand: string;
    size_mm: string;
    size_label: string;
    type: string | null;
    colour: string | null;
    finish: string | null;
    rate_per_sqft: number;
    is_active: boolean;
    created_at?: string;
}

export const Tiles: React.FC = () => {
    const { currentUser } = useApp();
    const [tiles, setTiles] = useState<TileMaster[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTile, setEditingTile] = useState<TileMaster | null>(null);

    const [formData, setFormData] = useState<Partial<TileMaster>>({
        material_id: '',
        brand: '',
        size_mm: '',
        size_label: '',
        type: '',
        colour: '',
        finish: '',
        rate_per_sqft: 0,
        is_active: true
    });

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            setLoading(true);
            const [tilesRes, materialsRes] = await Promise.all([
                fetch('/api/accounts?resource=tiles'),
                fetch('/api/accounts?resource=materials')
            ]);

            if (tilesRes.ok && materialsRes.ok) {
                const tilesData = await tilesRes.json();
                const materialsData = await materialsRes.json();
                setTiles(tilesData);
                // Only keep materials that are marked as tiles for drop-down
                setMaterials(materialsData.filter((m: any) => m.is_tile === true));
            } else {
                console.error('Failed to fetch data');
            }
        } catch (error) {
            console.error('Error fetching resources:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (tile?: TileMaster) => {
        if (tile) {
            setEditingTile(tile);
            setFormData({ ...tile });
        } else {
            setEditingTile(null);
            setFormData({
                material_id: materials.length > 0 ? materials[0].id : '',
                brand: '',
                size_mm: '',
                size_label: '',
                type: '',
                colour: '',
                finish: '',
                rate_per_sqft: 0,
                is_active: true
            });
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingTile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingTile 
                ? `/api/accounts?resource=tiles&id=${editingTile.id}` 
                : '/api/accounts?resource=tiles';
                
            const method = editingTile ? 'PATCH' : 'POST';

            // Ensure numeric cast
            const payload = {
                ...formData,
                rate_per_sqft: Number(formData.rate_per_sqft)
            };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const savedTile = await response.json();
                // Find matching material name to manually inject 
                const matName = materials.find(m => m.id === savedTile.material_id)?.name || '';
                savedTile.material_name = matName;

                if (editingTile) {
                    setTiles(tiles.map(t => t.id === savedTile.id ? savedTile : t));
                } else {
                    setTiles([savedTile, ...tiles]);
                }
                handleCloseForm();
            } else {
                const err = await response.json();
                alert(`Error: ${err.error || 'Failed to save tile'}`);
            }
        } catch (error) {
            console.error('Error saving tile:', error);
            alert('An unexpected error occurred.');
        }
    };

    const filteredTiles = tiles.filter(t =>
        t.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.size_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.material_name && t.material_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tile Master</h1>
                    <p className="text-gray-500 text-sm">Configure tile specifications used in rooms and planner assignments.</p>
                </div>
                <button
                    onClick={() => handleOpenForm()}
                    disabled={materials.length === 0}
                    className={`flex items-center justify-center gap-2 text-white px-4 py-2 rounded-lg transition w-full sm:w-auto ${materials.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    <Plus size={20} />
                    <span>Add Tile Definition</span>
                </button>
            </div>

            {materials.length === 0 && !loading && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <XCircle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-amber-700">
                                You have not defined any Materials marked as "Tile Form". Please add a Material under the Category "Tiles & Marbles" in the Material Master first.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by brand, size, or material..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading tile definitions...</div>
                    ) : filteredTiles.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {searchTerm ? 'No tile matching your search.' : 'No tiles found. Create your first specification!'}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase text-xs tracking-wider">
                                    <th className="p-4 font-semibold">Brand / Name</th>
                                    <th className="p-4 font-semibold text-center mt-0">Status</th>
                                    <th className="p-4 font-semibold">Base Material</th>
                                    <th className="p-4 font-semibold">Dimensions</th>
                                    <th className="p-4 font-semibold">Aesthetics</th>
                                    <th className="p-4 font-semibold text-right">Rate / SqFt</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {filteredTiles.map((tile) => (
                                    <tr key={tile.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">
                                            <div className="font-semibold text-blue-900">{tile.brand}</div>
                                            <div className="text-gray-500 text-xs mt-0.5 max-w-[150px] truncate" title={tile.type || ''}>{tile.type || '-'}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            {tile.is_active ? (
                                                <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-700">
                                            {tile.material_name}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-gray-900">{tile.size_label}</div>
                                            <div className="text-gray-400 text-xs font-mono">{tile.size_mm}</div>
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            <div className="flex items-center gap-2">
                                                {tile.colour && <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: tile.colour.toLowerCase() }}></span>}
                                                <span className="capitalize">{tile.colour || 'N/A'}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1 capitalize">{tile.finish || 'N/A'}</div>
                                        </td>
                                        <td className="p-4 text-right font-medium text-gray-900">
                                            ₹ {Number(tile.rate_per_sqft).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleOpenForm(tile)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit Tile"
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
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white z-10 sticky top-0">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editingTile ? 'Edit Tile Specification' : 'Add New Tile'}
                                </h2>
                                <button onClick={handleCloseForm} className="text-gray-400 hover:bg-gray-100 hover:text-gray-700 p-2 rounded-full transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto">
                                <div className="p-6 space-y-6 flex-1">
                                    
                                    {/* CORE IDENTIFICATION */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">Identification</h3>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Base Material <span className="text-red-500">*</span></label>
                                            <select
                                                required
                                                value={formData.material_id || ''}
                                                onChange={(e) => setFormData({ ...formData, material_id: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                            >
                                                <option value="" disabled>Select a tile material type...</option>
                                                {materials.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.brand || ''}
                                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="e.g. Kajaria, Somany"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tile Type Model</label>
                                            <input
                                                type="text"
                                                value={formData.type || ''}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="e.g. Eternity Series, Digital Glazed"
                                            />
                                        </div>
                                    </div>

                                    {/* DIMENSIONS */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">Dimensions & Sizing</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Size (mm x mm) <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.size_mm || ''}
                                                    onChange={(e) => setFormData({ ...formData, size_mm: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
                                                    placeholder="e.g. 600x600"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Size Label <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.size_label || ''}
                                                    onChange={(e) => setFormData({ ...formData, size_label: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="e.g. 2x2 ft"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* AESTHETICS */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">Aesthetics</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
                                                <input
                                                    type="text"
                                                    value={formData.colour || ''}
                                                    onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 capitalize"
                                                    placeholder="e.g. Ivory, Onyx"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Finish</label>
                                                <select
                                                    value={formData.finish || ''}
                                                    onChange={(e) => setFormData({ ...formData, finish: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Select...</option>
                                                    <option value="gloss">Glossy</option>
                                                    <option value="matte">Matte</option>
                                                    <option value="satin">Satin</option>
                                                    <option value="rustic">Rustic</option>
                                                    <option value="anti_skid">Anti-Skid</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PRICING & STATUS */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">Pricing & Status</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Standard Rate / SqFt <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 sm:text-sm">₹</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        required
                                                        value={formData.rate_per_sqft || ''}
                                                        onChange={(e) => setFormData({ ...formData, rate_per_sqft: parseFloat(e.target.value) })}
                                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        placeholder="0.00"
                                                    />
                                                </div>
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

                                </div>
                                
                                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0 z-10">
                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <CheckCircle size={18} />
                                        <span>{editingTile ? 'Save Tile Specs' : 'Create Tile Spec'}</span>
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
