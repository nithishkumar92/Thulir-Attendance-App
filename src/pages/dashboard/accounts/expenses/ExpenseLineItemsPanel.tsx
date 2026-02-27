import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, Grid, Package, Save } from 'lucide-react';
import { ExpenseHeader } from './index';

interface ExpenseLineItem {
    id: string;
    expense_id: string;
    description: string;
    hsn_sac: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    material_id: string | null;
    material_name?: string;
    tile_id: string | null;
    tile_name?: string;
}

interface ExpenseLineItemsProps {
    expense: ExpenseHeader;
    onClose: () => void;
    materials: any[];
    tiles: any[];
}

export const ExpenseLineItemsPanel: React.FC<ExpenseLineItemsProps> = ({ expense, onClose, materials, tiles }) => {
    const [lineItems, setLineItems] = useState<ExpenseLineItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLineItems();
    }, [expense.id]);

    const fetchLineItems = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/accounts?resource=line-items&expense_id=${expense.id}`);
            if (response.ok) {
                const data = await response.json();
                setLineItems(data);
            } else {
                console.error('Failed to fetch line items');
            }
        } catch (error) {
            console.error('API Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBlankRow = () => {
        const newRow: ExpenseLineItem = {
            id: `temp_${Date.now()}`,
            expense_id: expense.id,
            description: '',
            hsn_sac: '',
            quantity: 1,
            unit_price: 0,
            total_price: 0,
            material_id: null,
            tile_id: null
        };
        setLineItems([...lineItems, newRow]);
    };

    const handleRowChange = (id: string, field: keyof ExpenseLineItem, value: any) => {
        setLineItems(items => items.map(item => {
            if (item.id !== id) return item;
            
            const updated = { ...item, [field]: value };
            
            // Auto-calculate total price
            if (field === 'quantity' || field === 'unit_price') {
                updated.total_price = Number(updated.quantity) * Number(updated.unit_price);
            }
            
            // Auto-fill description based on material/tile selection
            if (field === 'material_id' && value) {
                const mat = materials.find(m => m.id === value);
                if (mat && !updated.description) updated.description = mat.name;
                updated.tile_id = null; // MUTUALLY EXCLUSIVE
            } else if (field === 'tile_id' && value) {
                const tile = tiles.find(t => t.id === value);
                if (tile && !updated.description) updated.description = `${tile.brand} ${tile.size_label}`;
                updated.material_id = null; // MUTUALLY EXCLUSIVE
            }

            return updated;
        }));
    };

    const handleRemoveRow = async (id: string) => {
        // If it's a saved row, delete from DB
        if (!id.startsWith('temp_')) {
            if (!confirm('Are you sure you want to delete this line item? If it is a tile, it will reverse the received quantity.')) return;
            try {
                const res = await fetch(`/api/accounts?resource=line-items&id=${id}`, { method: 'DELETE' });
                if (!res.ok) {
                    alert('Failed to delete line item.');
                    return;
                }
            } catch (e) {
                console.error(e);
                return;
            }
        }
        setLineItems(items => items.filter(item => item.id !== id));
    };

    const handleSaveAll = async () => {
        try {
            // Very simple bulk save loop - ideal for hobby apps
            for (const item of lineItems) {
                // Ensure mutual exclusivity before saving
                const payload = { ...item };
                if (payload.material_id === '') payload.material_id = null;
                if (payload.tile_id === '') payload.tile_id = null;

                const isTemp = payload.id.startsWith('temp_');
                const url = isTemp 
                    ? `/api/accounts?resource=line-items`
                    : `/api/accounts?resource=line-items&id=${payload.id}`;
                const method = isTemp ? 'POST' : 'PATCH';

                // We drop the temporary ID for POST so DB generates it
                if (isTemp) delete (payload as any).id;

                await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            alert('All line items saved successfully!');
            fetchLineItems(); // Refetch to replace temp IDs with real UUIDs
        } catch (error) {
            console.error('Bulk save error:', error);
            alert('An error occurred while saving line items.');
        }
    };

    const totalDistributed = lineItems.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
    const discrepancy = Number(expense.total_amount) - Number(expense.gst_amount) - totalDistributed;

    return (
        <div className="fixed inset-0 z-[70] overflow-hidden">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-full md:w-[85vw] lg:w-[75vw] xl:w-[65vw] flex">
                <div className="w-full h-full bg-gray-50 flex flex-col transform transition-transform shadow-2xl">
                    
                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-gray-900">Line Items Distribution</h2>
                                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
                                    INV: {expense.invoice_number || 'N/A'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                Tag materials and tiles received in this bill to update inventory quantities.
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors">
                            <XCircle size={24} />
                        </button>
                    </div>

                    {/* Summary Bar */}
                    <div className="bg-white border-b border-gray-200 p-4 px-6 grid grid-cols-4 gap-4 text-sm z-10">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Bill</div>
                            <div className="font-bold text-gray-900 text-lg">₹ {Number(expense.total_amount).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Included GST</div>
                            <div className="font-medium text-gray-700 text-lg">₹ {Number(expense.gst_amount).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div className="text-blue-700 text-xs font-semibold uppercase tracking-wider mb-1">Items Distributed</div>
                            <div className="font-bold text-blue-900 text-lg">₹ {totalDistributed.toLocaleString('en-IN')}</div>
                        </div>
                        <div className={`p-3 rounded-lg border ${Math.abs(discrepancy) < 1 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${Math.abs(discrepancy) < 1 ? 'text-green-700' : 'text-red-700'}`}>
                                Discrepancy
                            </div>
                            <div className={`font-bold text-lg ${Math.abs(discrepancy) < 1 ? 'text-green-900' : 'text-red-900'}`}>
                                ₹ {discrepancy.toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {loading ? (
                            <div className="text-center p-12 text-gray-500">Loading line items...</div>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 text-xs uppercase tracking-wider">
                                            <th className="p-3 font-semibold w-64">Item Description</th>
                                            <th className="p-3 font-semibold w-48 text-center text-blue-700 tracking-wider">
                                                <div className="flex items-center justify-center gap-1"><Package size={14}/> Track Material</div>
                                            </th>
                                            <th className="p-3 font-semibold w-48 text-center text-amber-700 tracking-wider">
                                                <div className="flex items-center justify-center gap-1"><Grid size={14}/> Track Tile</div>
                                            </th>
                                            <th className="p-3 font-semibold w-24">HSN/SAC</th>
                                            <th className="p-3 font-semibold w-24 text-right">Qty</th>
                                            <th className="p-3 font-semibold w-32 text-right">Unit Rate (₹)</th>
                                            <th className="p-3 font-semibold w-32 text-right">Total (₹)</th>
                                            <th className="p-3 font-semibold w-16 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {lineItems.map((item, index) => (
                                            <tr key={item.id} className={item.id.startsWith('temp_') ? 'bg-blue-50/30' : 'hover:bg-gray-50 transition-colors'}>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => handleRowChange(item.id, 'description', e.target.value)}
                                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                        placeholder="Item detail..."
                                                    />
                                                </td>
                                                <td className="p-2 bg-blue-50/10 border-l border-blue-50">
                                                    <select
                                                        value={item.material_id || ''}
                                                        disabled={!!item.tile_id}
                                                        onChange={(e) => handleRowChange(item.id, 'material_id', e.target.value)}
                                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                                                    >
                                                        <option value="">-- No Link --</option>
                                                        {materials.map(m => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-2 bg-amber-50/10 border-l border-r border-amber-50">
                                                    <select
                                                        value={item.tile_id || ''}
                                                        disabled={!!item.material_id}
                                                        onChange={(e) => handleRowChange(item.id, 'tile_id', e.target.value)}
                                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                                                    >
                                                        <option value="">-- No Link --</option>
                                                        {tiles.map(t => (
                                                            <option key={t.id} value={t.id}>{t.brand} - {t.size_label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        value={item.hsn_sac || ''}
                                                        onChange={(e) => handleRowChange(item.id, 'hsn_sac', e.target.value)}
                                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.quantity === 0 ? '' : item.quantity}
                                                        onChange={(e) => handleRowChange(item.id, 'quantity', parseFloat(e.target.value))}
                                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.unit_price === 0 ? '' : item.unit_price}
                                                        onChange={(e) => handleRowChange(item.id, 'unit_price', parseFloat(e.target.value))}
                                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="p-2 font-semibold text-right text-gray-900 border-l border-gray-100 bg-gray-50/50">
                                                    {(Number(item.total_price) || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        onClick={() => handleRemoveRow(item.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {lineItems.length === 0 && (
                                    <div className="p-10 text-center text-gray-500">
                                        No line items added yet. Click below to add your first item.
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="flex gap-4">
                            <button
                                onClick={handleAddBlankRow}
                                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-500 hover:text-blue-600 bg-white font-medium transition-colors"
                            >
                                <Plus size={18} />
                                <span>Add Empty Row</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border-t border-gray-200 p-6 flex justify-between items-center z-10">
                        <div className="text-sm text-gray-500">
                            {lineItems.filter(i => i.id.startsWith('temp_')).length > 0 && (
                                <span className="text-amber-600 font-medium flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                                    Unsaved changes
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="px-5 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors">
                                Close Panel
                            </button>
                            <button 
                                onClick={handleSaveAll}
                                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Save size={18} />
                                <span>Save All Changes</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
