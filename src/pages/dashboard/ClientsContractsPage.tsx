import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Client, Contract, EstimateItem, Milestone, ClientPayment } from '../../types';

export const ClientsContractsPage: React.FC = () => {
    const {
        clients,
        contracts,
        sites,
        estimateItems,
        milestones,
        clientPayments,
        addClient,
        updateClient,
        addContract,
        updateContract,
        addEstimateItem,
        updateEstimateItem,
        deleteEstimateItem,
        addMilestone,
        updateMilestone,
        addClientPayment,
        updateClientPayment
    } = useApp();

    const [activeTab, setActiveTab] = useState<'clients' | 'contracts' | 'estimates' | 'payments'>('clients');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [showClientModal, setShowClientModal] = useState(false);
    const [showContractModal, setShowContractModal] = useState(false);
    const [showEstimateModal, setShowEstimateModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Load clients on mount
    useEffect(() => {
        // Clients will be loaded via refreshData in AppContext
    }, []);

    return (
        <div className="min-h-screen bg-[#0f1419] p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Clients & Contracts</h1>
                <p className="text-gray-400">Manage client relationships and project contracts</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
                {['clients', 'contracts', 'estimates', 'payments'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#252d47] text-gray-300 hover:bg-[#2a3350]'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'clients' && (
                <ClientsTab
                    clients={clients}
                    onAddClient={() => setShowClientModal(true)}
                    onSelectClient={setSelectedClient}
                />
            )}

            {activeTab === 'contracts' && (
                <ContractsTab
                    contracts={contracts}
                    clients={clients}
                    sites={sites}
                    onAddContract={() => setShowContractModal(true)}
                    onSelectContract={setSelectedContract}
                />
            )}

            {activeTab === 'estimates' && selectedContract && (
                <EstimatesTab
                    contract={selectedContract}
                    estimateItems={estimateItems.filter(i => i.contractId === selectedContract.id)}
                    onAddItem={() => setShowEstimateModal(true)}
                    onEditItem={(item) => {
                        // Handle edit
                    }}
                    onDeleteItem={deleteEstimateItem}
                />
            )}

            {activeTab === 'payments' && selectedContract && (
                <PaymentsTab
                    contract={selectedContract}
                    payments={clientPayments.filter(p => p.contractId === selectedContract.id)}
                    milestones={milestones.filter(m => m.contractId === selectedContract.id)}
                    onAddPayment={() => setShowPaymentModal(true)}
                    onUpdatePayment={updateClientPayment}
                />
            )}

            {/* Modals */}
            {showClientModal && (
                <ClientModal
                    onClose={() => setShowClientModal(false)}
                    onSave={async (client) => {
                        await addClient(client);
                        setShowClientModal(false);
                    }}
                />
            )}

            {showContractModal && (
                <ContractModal
                    clients={clients}
                    sites={sites}
                    onClose={() => setShowContractModal(false)}
                    onSave={async (contract) => {
                        await addContract(contract);
                        setShowContractModal(false);
                    }}
                />
            )}

            {showEstimateModal && selectedContract && (
                <EstimateItemModal
                    contractId={selectedContract.id}
                    onClose={() => setShowEstimateModal(false)}
                    onSave={async (item) => {
                        await addEstimateItem(item);
                        setShowEstimateModal(false);
                    }}
                />
            )}

            {showPaymentModal && selectedContract && (
                <PaymentModal
                    contractId={selectedContract.id}
                    milestones={milestones.filter(m => m.contractId === selectedContract.id)}
                    onClose={() => setShowPaymentModal(false)}
                    onSave={async (payment) => {
                        await addClientPayment(payment);
                        setShowPaymentModal(false);
                    }}
                />
            )}
        </div>
    );
};

// Clients Tab
const ClientsTab: React.FC<{
    clients: Client[];
    onAddClient: () => void;
    onSelectClient: (client: Client) => void;
}> = ({ clients, onAddClient, onSelectClient }) => {
    return (
        <div className="bg-[#252d47] rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Clients</h2>
                <button
                    onClick={onAddClient}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    + Add Client
                </button>
            </div>

            {clients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map(client => (
                        <div
                            key={client.id}
                            onClick={() => onSelectClient(client)}
                            className="bg-[#1a1f37] rounded-lg p-4 cursor-pointer hover:bg-[#1f2540] transition-colors"
                        >
                            <h3 className="text-white font-semibold">{client.name}</h3>
                            {client.companyName && (
                                <p className="text-gray-400 text-sm">{client.companyName}</p>
                            )}
                            <p className="text-gray-500 text-sm mt-2">{client.email}</p>
                            {client.phone && (
                                <p className="text-gray-500 text-sm">{client.phone}</p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-400 text-center py-8">No clients yet. Add your first client to get started.</p>
            )}
        </div>
    );
};

// Contracts Tab
const ContractsTab: React.FC<{
    contracts: Contract[];
    clients: Client[];
    sites: any[];
    onAddContract: () => void;
    onSelectContract: (contract: Contract) => void;
}> = ({ contracts, clients, sites, onAddContract, onSelectContract }) => {
    return (
        <div className="bg-[#252d47] rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Contracts</h2>
                <button
                    onClick={onAddContract}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    + Add Contract
                </button>
            </div>

            {contracts.length > 0 ? (
                <div className="space-y-3">
                    {contracts.map(contract => {
                        const client = clients.find(c => c.id === contract.clientId);
                        const site = sites.find(s => s.id === contract.siteId);
                        return (
                            <div
                                key={contract.id}
                                onClick={() => onSelectContract(contract)}
                                className="bg-[#1a1f37] rounded-lg p-4 cursor-pointer hover:bg-[#1f2540] transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-white font-semibold">{contract.contractNumber}</h3>
                                        <p className="text-gray-400 text-sm">{client?.name || 'Unknown Client'}</p>
                                        <p className="text-gray-500 text-sm">{site?.name || 'Unknown Site'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-semibold">₹{contract.totalAmount.toLocaleString()}</p>
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${contract.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                                                contract.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {contract.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-gray-400 text-center py-8">No contracts yet. Create a contract to get started.</p>
            )}
        </div>
    );
};

// Estimates Tab
const EstimatesTab: React.FC<{
    contract: Contract;
    estimateItems: EstimateItem[];
    onAddItem: () => void;
    onEditItem: (item: EstimateItem) => void;
    onDeleteItem: (id: string) => void;
}> = ({ contract, estimateItems, onAddItem, onEditItem, onDeleteItem }) => {
    const total = estimateItems.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="bg-[#252d47] rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Estimate Items - {contract.contractNumber}</h2>
                <button
                    onClick={onAddItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    + Add Item
                </button>
            </div>

            {estimateItems.length > 0 ? (
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
                                <th className="text-center text-gray-400 font-medium pb-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estimateItems.map(item => (
                                <tr key={item.id} className="border-b border-gray-700/50">
                                    <td className="py-2 text-gray-300">{item.date || '-'}</td>
                                    <td className="py-2 text-white">{item.description}</td>
                                    <td className="py-2 text-gray-300">{item.unit || '-'}</td>
                                    <td className="py-2 text-right text-gray-300">{item.quantity || '-'}</td>
                                    <td className="py-2 text-right text-gray-300">{item.rate ? `₹${item.rate}` : '-'}</td>
                                    <td className="py-2 text-right text-white font-medium">₹{item.amount.toLocaleString()}</td>
                                    <td className="py-2 text-gray-400 text-xs">{item.remarks || '-'}</td>
                                    <td className="py-2 text-center">
                                        <button
                                            onClick={() => onDeleteItem(item.id)}
                                            className="text-red-400 hover:text-red-300 text-xs"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            <tr className="font-bold">
                                <td colSpan={5} className="py-3 text-right text-white">Total:</td>
                                <td className="py-3 text-right text-white">₹{total.toLocaleString()}</td>
                                <td colSpan={2}></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-400 text-center py-8">No estimate items. Add items to build the estimate.</p>
            )}
        </div>
    );
};

// Payments Tab
const PaymentsTab: React.FC<{
    contract: Contract;
    payments: ClientPayment[];
    milestones: Milestone[];
    onAddPayment: () => void;
    onUpdatePayment: (id: string, updates: Partial<ClientPayment>) => void;
}> = ({ contract, payments, milestones, onAddPayment, onUpdatePayment }) => {
    return (
        <div className="bg-[#252d47] rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Payments - {contract.contractNumber}</h2>
                <button
                    onClick={onAddPayment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    + Request Payment
                </button>
            </div>

            {payments.length > 0 ? (
                <div className="space-y-3">
                    {payments.map(payment => {
                        const milestone = milestones.find(m => m.id === payment.milestoneId);
                        return (
                            <div key={payment.id} className="bg-[#1a1f37] rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-white font-semibold">₹{payment.amount.toLocaleString()}</p>
                                        <p className="text-gray-400 text-sm">{payment.paymentDate}</p>
                                        {milestone && (
                                            <p className="text-gray-500 text-xs">Milestone: {milestone.name}</p>
                                        )}
                                        {payment.notes && (
                                            <p className="text-gray-500 text-xs mt-1">{payment.notes}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${payment.status === 'RECEIVED' ? 'bg-green-500/20 text-green-400' :
                                                payment.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                            }`}>
                                            {payment.status}
                                        </span>
                                        {payment.status === 'PENDING' && (
                                            <button
                                                onClick={() => onUpdatePayment(payment.id, { status: 'RECEIVED' })}
                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                            >
                                                Mark as Received
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-gray-400 text-center py-8">No payment requests. Create a payment request to get started.</p>
            )}
        </div>
    );
};

// Modal Components (Simplified)
const ClientModal: React.FC<{
    onClose: () => void;
    onSave: (client: Omit<Client, 'id'>) => void;
}> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        email: '',
        phone: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#252d47] rounded-xl p-6 max-w-md w-full">
                <h2 className="text-xl font-bold text-white mb-4">Add Client</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Company Name</label>
                        <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ContractModal: React.FC<{
    clients: Client[];
    sites: any[];
    onClose: () => void;
    onSave: (contract: Omit<Contract, 'id'>) => void;
}> = ({ clients, sites, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        clientId: '',
        siteId: '',
        contractNumber: '',
        totalAmount: 0,
        startDate: '',
        endDate: '',
        status: 'ACTIVE' as const
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#252d47] rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-white mb-4">Add Contract</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Client *</label>
                        <select
                            required
                            value={formData.clientId}
                            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Client</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Site *</label>
                        <select
                            required
                            value={formData.siteId}
                            onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Site</option>
                            {sites.map(site => (
                                <option key={site.id} value={site.id}>{site.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Contract Number *</label>
                        <input
                            type="text"
                            required
                            value={formData.contractNumber}
                            onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Total Amount *</label>
                        <input
                            type="number"
                            required
                            value={formData.totalAmount}
                            onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EstimateItemModal: React.FC<{
    contractId: string;
    onClose: () => void;
    onSave: (item: Omit<EstimateItem, 'id'>) => void;
}> = ({ contractId, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        contractId,
        date: '',
        description: '',
        unit: '',
        quantity: 0,
        rate: 0,
        amount: 0,
        remarks: '',
        orderIndex: 0
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#252d47] rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-white mb-4">Add Estimate Item</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description *</label>
                        <input
                            type="text"
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Unit</label>
                            <input
                                type="text"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                            <input
                                type="number"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Rate</label>
                            <input
                                type="number"
                                value={formData.rate}
                                onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Amount *</label>
                            <input
                                type="number"
                                required
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Remarks</label>
                        <textarea
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PaymentModal: React.FC<{
    contractId: string;
    milestones: Milestone[];
    onClose: () => void;
    onSave: (payment: Omit<ClientPayment, 'id'>) => void;
}> = ({ contractId, milestones, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        contractId,
        milestoneId: '',
        amount: 0,
        paymentDate: new Date().toISOString().split('T')[0],
        status: 'PENDING' as const,
        paymentMethod: '',
        transactionReference: '',
        notes: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#252d47] rounded-xl p-6 max-w-md w-full">
                <h2 className="text-xl font-bold text-white mb-4">Request Payment</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Amount *</label>
                        <input
                            type="number"
                            required
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Milestone</label>
                        <select
                            value={formData.milestoneId}
                            onChange={(e) => setFormData({ ...formData, milestoneId: e.target.value })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">None</option>
                            {milestones.map(milestone => (
                                <option key={milestone.id} value={milestone.id}>{milestone.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 bg-[#1a1f37] text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Create Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
