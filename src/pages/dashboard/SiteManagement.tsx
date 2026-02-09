import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, MapPin, Trash2, Edit2 } from 'lucide-react';
import { Site } from '../../types';

export const SiteManagement: React.FC = () => {
    const { sites, addSite, updateSite, deleteSite } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSiteId, setEditingSiteId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [radius, setRadius] = useState('300');

    const [loading, setLoading] = useState(false);

    const handleSaveSite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const siteData: Site = {
                id: editingSiteId || Date.now().toString(),
                name,
                location: {
                    lat: parseFloat(lat),
                    lng: parseFloat(lng)
                },
                radius: parseInt(radius)
            };

            if (editingSiteId) {
                await updateSite(siteData);
            } else {
                // @ts-ignore
                await addSite(siteData);
            }

            closeModal();
        } catch (error) {
            // Error is alerted by context
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingSiteId(null);
        setName('');
        setLat('');
        setLng('');
        setRadius('300');
        setIsModalOpen(true);
    };

    const openEditModal = (site: Site) => {
        setEditingSiteId(site.id);
        setName(site.name);
        setLat(site.location.lat.toString());
        setLng(site.location.lng.toString());
        setRadius(site.radius.toString());
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSiteId(null);
        setName('');
        setLat('');
        setLng('');
        setRadius('300');
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Site Management</h2>
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus size={20} />
                    Add Site
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sites.map(site => (
                    <div key={site.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">{site.name}</h3>
                                    <p className="text-sm text-gray-500">Radius: {site.radius}m</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEditModal(site)}
                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Edit Site"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => deleteSite(site.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    title="Delete Site"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                            <div className="flex justify-between">
                                <span>Latitude:</span>
                                <span className="font-medium">{site.location.lat}</span>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span>Longitude:</span>
                                <span className="font-medium">{site.location.lng}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{editingSiteId ? 'Edit Site' : 'Add New Site'}</h3>
                        <form onSubmit={handleSaveSite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Site Name</label>
                                <input
                                    type="text" required
                                    className="mt-1 block w-full border rounded-md p-2"
                                    value={name} onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Latitude</label>
                                    <input
                                        type="number" step="any" required
                                        className="mt-1 block w-full border rounded-md p-2"
                                        value={lat} onChange={e => setLat(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Longitude</label>
                                    <input
                                        type="number" step="any" required
                                        className="mt-1 block w-full border rounded-md p-2"
                                        value={lng} onChange={e => setLng(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Radius (meters)</label>
                                <input
                                    type="number" required
                                    className="mt-1 block w-full border rounded-md p-2"
                                    value={radius} onChange={e => setRadius(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-md">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-400"
                                >
                                    {loading ? 'Saving...' : 'Save Site'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
