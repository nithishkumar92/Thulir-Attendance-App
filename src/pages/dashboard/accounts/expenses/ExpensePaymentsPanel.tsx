import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, CreditCard, Save, MapPin } from 'lucide-react';
import { ExpenseHeader } from './index';
import { format } from 'date-fns';
import { useApp } from '../../../../context/AppContext';

interface ExpensePayment {
    id: string;
    expense_id: string;
    date: string;
    amount: number;
    payment_method: 'bank_transfer' | 'cash' | 'upi' | 'cheque';
    reference_number: string | null;
    recorded_by: string;
    notes: string | null;
}

interface ExpensePaymentsProps {
    expense: ExpenseHeader;
    onClose: () => void;
    onPaymentsUpdated: () => void; // Callback to refresh master list
}

export const ExpensePaymentsPanel: React.FC<ExpensePaymentsProps> = ({ expense, onClose, onPaymentsUpdated }) => {
    const { currentUser } = useApp();
    const [payments, setPayments] = useState<ExpensePayment[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state for new payment
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [newPayment, setNewPayment] = useState<Partial<ExpensePayment>>({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: Math.max(0, Number(expense.total_amount) - Number(expense.paid_amount)), // Suggest remaining balance
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: ''
    });

    useEffect(() => {
        fetchPayments();
    }, [expense.id]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/accounts?resource=expense-payments&expense_id=${expense.id}`);
            if (response.ok) {
                const data = await response.json();
                setPayments(data);
            } else {
                console.error('Failed to fetch payments');
            }
        } catch (error) {
            console.error('API Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNewPayment = async () => {
        if (!newPayment.amount || newPayment.amount <= 0) {
            alert('Please enter a valid payment amount.');
            return;
        }

        try {
            const payload = {
                ...newPayment,
                expense_id: expense.id,
                recorded_by: currentUser?.id
            };

            const response = await fetch(`/api/accounts?resource=expense-payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await fetchPayments();
                setIsAddingMode(false);
                onPaymentsUpdated(); // Triggers a refetch in the parent to update header Paid states
            } else {
                const err = await response.json();
                alert(`Error saving payment: ${err.error}`);
            }
        } catch (error) {
            console.error('Payment save error:', error);
            alert('An error occurred while saving the payment.');
        }
    };

    const handleDeletePayment = async (id: string, amount: number) => {
        if (!confirm(`Are you sure you want to delete this payment of ₹${amount}? This will increase the outstanding balance.`)) return;
        
        try {
            const res = await fetch(`/api/accounts?resource=expense-payments&id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchPayments();
                onPaymentsUpdated(); // Triggers a refetch in the parent
            } else {
                alert('Failed to delete payment.');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingBalance = Number(expense.total_amount) - totalPaid;

    return (
        <div className="fixed inset-0 z-[70] overflow-hidden">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-full md:w-[600px] flex">
                <div className="w-full h-full bg-gray-50 flex flex-col transform transition-transform shadow-2xl border-l border-gray-200">
                    
                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <CreditCard size={18} className="text-blue-600"/>
                                <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
                            </div>
                            <p className="text-sm font-medium text-gray-600">
                                {expense.vendor_name || 'Unlinked Vendor'} 
                                {expense.invoice_number && ` • INV: ${expense.invoice_number}`}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors">
                            <XCircle size={24} />
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="bg-white border-b border-gray-200 p-5 grid grid-cols-2 gap-4 z-10">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Bill Amount</div>
                            <div className="font-bold text-gray-900 text-xl">₹ {Number(expense.total_amount).toLocaleString('en-IN')}</div>
                        </div>
                        <div className={`p-4 rounded-xl border ${remainingBalance <= 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${remainingBalance <= 0 ? 'text-green-700' : 'text-amber-700'}`}>
                                Remaining Balance
                            </div>
                            <div className={`font-bold text-xl ${remainingBalance <= 0 ? 'text-green-900' : 'text-amber-900'}`}>
                                ₹ {Math.max(0, remainingBalance).toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>

                    {/* Payments List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-800">Recorded Transactions</h3>
                            {!isAddingMode && remainingBalance > 0 && (
                                <button
                                    onClick={() => setIsAddingMode(true)}
                                    className="flex items-center gap-1.5 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-100 font-medium transition-colors"
                                >
                                    <Plus size={16} /> Record Payment
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="text-center p-8 text-gray-500">Loading payment history...</div>
                        ) : (
                            <div className="space-y-3">
                                {isAddingMode && (
                                    <div className="bg-white p-5 rounded-xl border-2 border-blue-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                        <h4 className="font-semibold text-gray-900 mb-4 flex justify-between items-center">
                                            New Payment Entry
                                            <button onClick={() => setIsAddingMode(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={18}/></button>
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                                    <input
                                                        type="date"
                                                        value={newPayment.date || ''}
                                                        onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
                                                    <input
                                                        type="number"
                                                        value={newPayment.amount || ''}
                                                        onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm font-semibold"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Method</label>
                                                    <select
                                                        value={newPayment.payment_method || 'bank_transfer'}
                                                        onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value as any })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm capitalize"
                                                    >
                                                        <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                                                        <option value="upi">UPI / GPay</option>
                                                        <option value="cheque">Cheque</option>
                                                        <option value="cash">Cash</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Reference (UTR/Chk#)</label>
                                                    <input
                                                        type="text"
                                                        value={newPayment.reference_number || ''}
                                                        onChange={(e) => setNewPayment({ ...newPayment, reference_number: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm"
                                                        placeholder="Optional ID"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-2">
                                                <button
                                                    onClick={handleSaveNewPayment}
                                                    className="bg-blue-600 text-white px-4 py-2 rounded font-medium text-sm hover:bg-blue-700 flex items-center gap-1.5 transition-colors"
                                                >
                                                    <CheckCircle size={16} /> Save Entry
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {payments.length === 0 && !isAddingMode ? (
                                    <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-400 mb-3">
                                            <CreditCard size={24} />
                                        </div>
                                        <p className="text-gray-500 text-sm">No payments recorded against this invoice yet.</p>
                                    </div>
                                ) : (
                                    payments.map((payment) => (
                                        <div key={payment.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between group hover:border-blue-100 transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-gray-900 text-lg">₹ {Number(payment.amount).toLocaleString('en-IN')}</span>
                                                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">
                                                        {payment.payment_method.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    Paid on {format(new Date(payment.date), 'dd MMM, yyyy')}
                                                </div>
                                                {payment.reference_number && (
                                                    <div className="text-xs text-gray-400 font-mono mt-1 flex items-center gap-1">
                                                        Ref: {payment.reference_number}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDeletePayment(payment.id, Number(payment.amount))}
                                                className="text-gray-300 hover:text-red-500 p-2 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Payment"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
