import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Contract } from '../types';

export const ClientPortal: React.FC = () => {
    const { currentUser, contracts, fetchClientData } = useApp();
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);

    // For demo purposes, we'll assume the client has contracts
    // In production, you'd fetch contracts for the logged-in client
    useEffect(() => {
        if (contracts.length > 0 && !selectedContract) {
            setSelectedContract(contracts[0]);
        }
    }, [contracts, selectedContract]);

    useEffect(() => {
        if (selectedContract) {
            setLoading(true);
            fetchClientData(selectedContract.id)
                .finally(() => setLoading(false));
        }
    }, [selectedContract]);

    if (!currentUser || currentUser.role !== 'CLIENT') {
        return (
            <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-4">
                <div className="bg-[#1a1f37] rounded-xl p-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-gray-400">This portal is only accessible to clients.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f1419] p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Client Portal</h1>
                <p className="text-gray-400">Welcome, {currentUser.name}</p>
            </div>

            {/* Contract Selector (if multiple contracts) */}
            {contracts.length > 1 && (
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Select Contract
                    </label>
                    <select
                        value={selectedContract?.id || ''}
                        onChange={(e) => {
                            const contract = contracts.find(c => c.id === e.target.value);
                            setSelectedContract(contract || null);
                        }}
                        className="w-full md:w-auto px-4 py-2 bg-[#252d47] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {contracts.map(contract => (
                            <option key={contract.id} value={contract.id}>
                                {contract.contractNumber}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedContract ? (
                <div className="space-y-6">
                    {/* Contract Overview */}
                    <ContractOverview contract={selectedContract} />

                    {/* Milestone Progress */}
                    <MilestoneProgress contractId={selectedContract.id} />

                    {/* Estimate Table */}
                    <EstimateTable contractId={selectedContract.id} />

                    {/* Payment Ledger */}
                    <PaymentLedger contractId={selectedContract.id} />
                </div>
            ) : (
                <div className="bg-[#1a1f37] rounded-xl p-8 text-center">
                    <p className="text-gray-400">No contracts found.</p>
                </div>
            )}
        </div>
    );
};

// Placeholder components - will be implemented next
const ContractOverview: React.FC<{ contract: Contract }> = ({ contract }) => {
    return (
        <div className="bg-[#252d47] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Contract Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <p className="text-gray-400 text-sm">Contract Number</p>
                    <p className="text-white font-semibold">{contract.contractNumber}</p>
                </div>
                <div>
                    <p className="text-gray-400 text-sm">Total Amount</p>
                    <p className="text-white font-semibold">₹{contract.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${contract.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                            contract.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-yellow-500/20 text-yellow-400'
                        }`}>
                        {contract.status}
                    </span>
                </div>
            </div>
        </div>
    );
};

const MilestoneProgress: React.FC<{ contractId: string }> = ({ contractId }) => {
    const { milestones } = useApp();
    const contractMilestones = milestones.filter(m => m.contractId === contractId);

    return (
        <div className="bg-[#252d47] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Milestone Progress</h2>
            {contractMilestones.length > 0 ? (
                <div className="space-y-4">
                    {contractMilestones.map(milestone => {
                        const progress = (milestone.completedAmount / milestone.budgetedAmount) * 100;
                        return (
                            <div key={milestone.id} className="border-b border-gray-700 pb-4 last:border-0">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-white font-medium">{milestone.name}</h3>
                                        {milestone.description && (
                                            <p className="text-gray-400 text-sm">{milestone.description}</p>
                                        )}
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${milestone.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                            milestone.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {milestone.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm text-gray-300">
                                        ₹{milestone.completedAmount.toLocaleString()} / ₹{milestone.budgetedAmount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-gray-400 text-center py-4">No milestones defined</p>
            )}
        </div>
    );
};

const EstimateTable: React.FC<{ contractId: string }> = ({ contractId }) => {
    const { estimateItems } = useApp();
    const contractItems = estimateItems.filter(i => i.contractId === contractId);
    const total = contractItems.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="bg-[#252d47] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Agreement / Estimate</h2>
            {contractItems.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="text-left text-gray-400 font-medium pb-2">Date</th>
                                <th className="text-left text-gray-400 font-medium pb-2">Description</th>
                                <th className="text-left text-gray-400 font-medium pb-2">Unit</th>
                                <th className="text-right text-gray-400 font-medium pb-2">Qty</th>
                                <th className="text-right text-gray-400 font-medium pb-2">Rate</th>
                                <th className="text-right text-gray-400 font-medium pb-2">Amount</th>
                                <th className="text-left text-gray-400 font-medium pb-2">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contractItems.map(item => (
                                <tr key={item.id} className="border-b border-gray-700/50">
                                    <td className="py-2 text-gray-300">{item.date || '-'}</td>
                                    <td className="py-2 text-white">{item.description}</td>
                                    <td className="py-2 text-gray-300">{item.unit || '-'}</td>
                                    <td className="py-2 text-right text-gray-300">{item.quantity || '-'}</td>
                                    <td className="py-2 text-right text-gray-300">{item.rate ? `₹${item.rate}` : '-'}</td>
                                    <td className="py-2 text-right text-white font-medium">₹{item.amount.toLocaleString()}</td>
                                    <td className="py-2 text-gray-400 text-xs">{item.remarks || '-'}</td>
                                </tr>
                            ))}
                            <tr className="font-bold">
                                <td colSpan={5} className="py-3 text-right text-white">Total:</td>
                                <td className="py-3 text-right text-white">₹{total.toLocaleString()}</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-400 text-center py-4">No estimate items</p>
            )}
        </div>
    );
};

const PaymentLedger: React.FC<{ contractId: string }> = ({ contractId }) => {
    const { clientPayments } = useApp();
    const contractPayments = clientPayments.filter(p => p.contractId === contractId);

    return (
        <div className="bg-[#252d47] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Payment History</h2>
            {contractPayments.length > 0 ? (
                <div className="space-y-3">
                    {contractPayments.map(payment => (
                        <div key={payment.id} className="bg-[#1a1f37] rounded-lg p-4 flex justify-between items-center">
                            <div>
                                <p className="text-white font-medium">₹{payment.amount.toLocaleString()}</p>
                                <p className="text-gray-400 text-sm">{payment.paymentDate}</p>
                                {payment.transactionReference && (
                                    <p className="text-gray-500 text-xs">Ref: {payment.transactionReference}</p>
                                )}
                            </div>
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                                Received
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-400 text-center py-4">No payment history</p>
            )}
        </div>
    );
};
