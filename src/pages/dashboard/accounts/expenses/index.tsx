import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, CheckCircle, XCircle, CreditCard, ExternalLink, Calendar, ChevronRight, PackageOpen } from 'lucide-react';
import { useApp } from '../../../../context/AppContext';
import { format } from 'date-fns';
import { ExpenseLineItemsPanel } from './ExpenseLineItemsPanel';
import { ExpensePaymentsPanel } from './ExpensePaymentsPanel';

export interface ExpenseHeader {
    id: string;
    site_id: string;
    date: string;
    type: 'material_invoice' | 'material_cash' | 'labour_contractor' | 'equipment_hire' | 'petty_cash';
    vendor_id: string | null;
    vendor_name?: string;
    invoice_number: string | null;
    invoice_date: string | null;
    total_amount: number;
    gst_amount: number;
    paid_amount: number;
    payment_status: 'unpaid' | 'partial' | 'paid';
    note: string | null;
    bill_photo_url: string | null;
    bill_pdf_url: string | null;
    recorded_by: string;
    is_deleted: boolean;
}

export const ExpensesAccount: React.FC = () => {
    const { currentUser, sites } = useApp();
    const [expenses, setExpenses] = useState<ExpenseHeader[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSiteId, setActiveSiteId] = useState<string>(sites.length > 0 ? sites[0].id : '');
    
    // Panel/Modal State
    const [isHeaderFormOpen, setIsHeaderFormOpen] = useState(false);
    const [editingHeader, setEditingHeader] = useState<ExpenseHeader | null>(null);
    const [managingLineItemsExp, setManagingLineItemsExp] = useState<ExpenseHeader | null>(null);
    const [managingPaymentsExp, setManagingPaymentsExp] = useState<ExpenseHeader | null>(null);

    // Global Data for Line Items
    const [materials, setMaterials] = useState<any[]>([]);
    const [tiles, setTiles] = useState<any[]>([]);

    // Initial Form State
    const [formData, setFormData] = useState<Partial<ExpenseHeader>>({
        site_id: activeSiteId,
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'material_invoice',
        vendor_id: '',
        invoice_number: '',
        invoice_date: '',
        total_amount: 0,
        gst_amount: 0,
        note: ''
    });

    useEffect(() => {
        if (sites.length > 0 && !activeSiteId) {
            setActiveSiteId(sites[0].id);
        }
    }, [sites]);

    useEffect(() => {
        fetchData();
    }, [activeSiteId]);

    const fetchData = async () => {
        if (!activeSiteId) return;
        try {
            setLoading(true);
            const [expRes, venRes, matRes, tileRes] = await Promise.all([
                fetch(`/api/accounts?resource=expenses&site_id=${activeSiteId}`),
                fetch(`/api/accounts?resource=vendors`),
                fetch(`/api/accounts?resource=materials`),
                fetch(`/api/accounts?resource=tiles`)
            ]);

            if (expRes.ok && venRes.ok) {
                setExpenses(await expRes.json());
                setVendors(await venRes.json());
                if (matRes.ok) setMaterials(await matRes.json());
                if (tileRes.ok) setTiles(await tileRes.json());
            } else {
                console.error('Failed to fetch expense master data');
            }
        } catch (error) {
            console.error('API Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenHeaderForm = (expense?: ExpenseHeader) => {
        if (expense) {
            setEditingHeader(expense);
            setFormData({ 
                ...expense, 
                date: expense.date ? expense.date.substring(0, 10) : '',
                invoice_date: expense.invoice_date ? expense.invoice_date.substring(0, 10) : '' 
            });
        } else {
            setEditingHeader(null);
            setFormData({
                site_id: activeSiteId,
                date: format(new Date(), 'yyyy-MM-dd'),
                type: 'material_invoice',
                vendor_id: vendors.length > 0 ? vendors[0].id : '',
                invoice_number: '',
                invoice_date: '',
                total_amount: 0,
                gst_amount: 0,
                note: '',
                recorded_by: currentUser?.id
            });
        }
        setIsHeaderFormOpen(true);
    };

    const handleSubmitHeader = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingHeader 
                ? `/api/accounts?resource=expenses&id=${editingHeader.id}` 
                : '/api/accounts?resource=expenses';
            const method = editingHeader ? 'PATCH' : 'POST';

            // Clean up vendor ID if it is empty string
            const payload = { ...formData };
            if (!payload.vendor_id || payload.vendor_id === '') {
                 payload.vendor_id = null;
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await fetchData(); // Refresh list to get joined vendor names
                setIsHeaderFormOpen(false);
                setEditingHeader(null);
            } else {
                const err = await response.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('An unexpected error occurred. Please try again.');
        }
    };

    const handleDeleteHeader = async (id: string) => {
        if (!confirm('Are you sure you want to delete this expense? This action cannot be undone and will void all line items.')) return;
        
        try {
             const res = await fetch(`/api/accounts?resource=expenses&id=${id}`, { method: 'DELETE' });
             if (res.ok) {
                 setExpenses(expenses.filter(e => e.id !== id));
             } else {
                 alert('Failed to delete expense.');
             }
        } catch(e) {
             console.error('Delete error', e);
        }
    };

    const filteredExpenses = expenses.filter(e =>
        (e.vendor_name && e.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.invoice_number && e.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        e.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Render Helpers
    const getTypeBadge = (type: string) => {
        const typeMap: Record<string, { label: string, color: string }> = {
            'material_invoice': { label: 'Billed Material', color: 'bg-blue-100 text-blue-800' },
            'material_cash': { label: 'Cash Purchase', color: 'bg-orange-100 text-orange-800' },
            'labour_contractor': { label: 'Contractor Bill', color: 'bg-purple-100 text-purple-800' },
            'equipment_hire': { label: 'Equipment', color: 'bg-emerald-100 text-emerald-800' },
            'petty_cash': { label: 'Petty Cash', color: 'bg-gray-100 text-gray-800' },
        };
        const config = typeMap[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>{config.label}</span>;
    };

    const getStatusBadge = (expense: ExpenseHeader) => {
        const status = expense.payment_status;
        let badge;
        if (status === 'paid') badge = <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-green-200 shadow-sm cursor-pointer hover:bg-green-100 transition-colors inline-block">Paid In Full</span>;
        else if (status === 'partial') badge = <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-200 shadow-sm cursor-pointer hover:bg-amber-100 transition-colors inline-block">Partially Paid</span>;
        else badge = <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-red-200 shadow-sm cursor-pointer hover:bg-red-100 transition-colors inline-block">Unpaid</span>;

        return (
            <div onClick={() => setManagingPaymentsExp(expense)} title="Click to manage payments">
                {badge}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Expense Tracking</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage vendor bills, receipts, and line-item distributions.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={activeSiteId}
                        onChange={(e) => setActiveSiteId(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                        <option value="" disabled>Select Project Site</option>
                        {sites.map(site => (
                            <option key={site.id} value={site.id}>{site.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => handleOpenHeaderForm()}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                        <Plus size={18} />
                        <span>Log Expense</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by vendor or invoice #..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-10 text-center text-gray-500">Loading expense records...</div>
                    ) : expenses.length === 0 ? (
                        <div className="p-10 text-center">
                            <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">No expenses recorded</h3>
                            <p className="text-gray-500 text-sm mt-1">There are no expenses logged for this site yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 text-xs tracking-wider uppercase">
                                    <th className="p-4 font-semibold">Date & Type</th>
                                    <th className="p-4 font-semibold">Vendor & Invoice</th>
                                    <th className="p-4 font-semibold text-right">Bill Amount</th>
                                    <th className="p-4 font-semibold text-right">Paid Amount</th>
                                    <th className="p-4 font-semibold text-center">Payment Status</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-blue-50/40 transition-colors group">
                                        <td className="p-4 align-top">
                                            <div className="font-semibold text-gray-900 mb-1">
                                                {format(new Date(expense.date), 'dd MMM, yyyy')}
                                            </div>
                                            {getTypeBadge(expense.type)}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="font-bold text-blue-900">
                                                {expense.vendor_name || <span className="text-gray-400 italic">No Vendor Linked</span>}
                                            </div>
                                            {expense.invoice_number && (
                                                <div className="text-gray-500 text-xs font-mono mt-0.5">
                                                    INV: {expense.invoice_number}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 align-top text-right">
                                            <div className="font-bold text-gray-900 text-base">₹ {(Number(expense.total_amount) || 0).toLocaleString('en-IN')}</div>
                                            {Number(expense.gst_amount) > 0 && (
                                                <div className="text-xs text-gray-500 mt-0.5">Incl. GST: ₹ {Number(expense.gst_amount).toLocaleString('en-IN')}</div>
                                            )}
                                        </td>
                                        <td className="p-4 align-top text-right">
                                            <div className="font-medium text-gray-700">₹ {(Number(expense.paid_amount) || 0).toLocaleString('en-IN')}</div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                Bal: ₹ {((Number(expense.total_amount) || 0) - (Number(expense.paid_amount) || 0)).toLocaleString('en-IN')}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top text-center" title="Click to manage payments">
                                            {getStatusBadge(expense)}
                                        </td>
                                        <td className="p-4 align-top text-right space-x-2 whitespace-nowrap">
                                             <button
                                                onClick={() => setManagingLineItemsExp(expense)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 font-medium rounded hover:bg-blue-100 transition-colors border border-blue-100"
                                                title="Manage Bill Line Items"
                                            >
                                                <PackageOpen size={16} />
                                                <span>Items</span>
                                            </button>
                                            <button
                                                onClick={() => handleOpenHeaderForm(expense)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit Header"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                             <button
                                                onClick={() => handleDeleteHeader(expense.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-1"
                                                title="Void Expense"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* EXPENSE HEADER FORM SLIDE-OVER */}
            {isHeaderFormOpen && (
                <div className="fixed inset-0 z-[60] overflow-hidden">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsHeaderFormOpen(false)} />
                    <div className="fixed inset-y-0 right-0 max-w-lg w-full flex">
                        <div className="w-full h-full bg-white shadow-2xl flex flex-col transform transition-transform">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {editingHeader ? 'Edit Expense Record' : 'Log New Expense'}
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">Record the bill header to track payments and items.</p>
                                </div>
                                <button onClick={() => setIsHeaderFormOpen(false)} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmitHeader} className="flex-1 flex flex-col overflow-y-auto">
                                <div className="p-6 pb-20 space-y-6 flex-1">
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Date <span className="text-red-500">*</span></label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.date || ''}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type <span className="text-red-500">*</span></label>
                                            <select
                                                required
                                                value={formData.type || ''}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                            >
                                                <option value="material_invoice">Material (With Invoice)</option>
                                                <option value="material_cash">Material (Cash/No GST)</option>
                                                <option value="labour_contractor">Labour Contractor</option>
                                                <option value="equipment_hire">Equipment Hire</option>
                                                <option value="petty_cash">Petty Cash</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/80 p-4 rounded-xl space-y-4 border border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200 pb-2">
                                            Vendor & Billing Details
                                        </h3>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Associated Vendor</label>
                                            <select
                                                value={formData.vendor_id || ''}
                                                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                            >
                                                <option value="">-- No Vendor/Direct Cash --</option>
                                                {vendors.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name} ({v.category.replace('_',' ')})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                                                <input
                                                    type="text"
                                                    value={formData.invoice_number || ''}
                                                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                                                    placeholder="e.g. INV-2023-01"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                                                <input
                                                    type="date"
                                                    value={formData.invoice_date || ''}
                                                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Bill Amount (₹) <span className="text-red-500">*</span></label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    required
                                                    value={formData.total_amount === 0 ? '' : formData.total_amount}
                                                    onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Included GST (₹)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={formData.gst_amount === 0 ? '' : formData.gst_amount}
                                                    onChange={(e) => setFormData({ ...formData, gst_amount: parseFloat(e.target.value) })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Description</label>
                                        <textarea
                                            value={formData.note || ''}
                                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                            placeholder="What was this expense for..."
                                            rows={3}
                                        />
                                    </div>

                                </div>
                                
                                <div className="absolute bottom-0 w-full p-6 border-t border-gray-100 bg-white flex justify-end gap-3 z-20">
                                    <button
                                        type="button"
                                        onClick={() => setIsHeaderFormOpen(false)}
                                        className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors shadow-sm"
                                    >
                                        <CheckCircle size={18} />
                                        <span>{editingHeader ? 'Update Expense' : 'Save Expense Record'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* EXPENSE LINE ITEMS SLIDE-OVER */}
            {managingLineItemsExp && (
                <ExpenseLineItemsPanel
                    expense={managingLineItemsExp}
                    onClose={() => setManagingLineItemsExp(null)}
                    materials={materials}
                    tiles={tiles}
                />
            )}

            {/* EXPENSE PAYMENTS SLIDE-OVER */}
            {managingPaymentsExp && (
                <ExpensePaymentsPanel
                    expense={managingPaymentsExp}
                    onClose={() => setManagingPaymentsExp(null)}
                    onPaymentsUpdated={fetchData} // Refresh master view
                />
            )}
        </div>
    );
};
