import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import * as apiService from '../../services/apiService';

export const MaterialReqPage: React.FC = () => {
    const { sites } = useApp();
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSiteId, setSelectedSiteId] = useState<string>('');

    // Initialize with first site if available
    useEffect(() => {
        if (sites.length > 0 && !selectedSiteId) {
            setSelectedSiteId(sites[0].id);
        }
    }, [sites, selectedSiteId]);

    // Fetch rooms when site changes
    useEffect(() => {
        if (!selectedSiteId) return;
        
        const fetchRooms = async () => {
            setLoading(true);
            try {
                const fetched = await apiService.fetchTileRooms(selectedSiteId);
                setRooms(fetched);
            } catch (err) {
                console.error('Failed to load rooms:', err);
                alert('Failed to load tile rooms.');
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
    }, [selectedSiteId]);

    const selectedSite = sites.find(s => s.id === selectedSiteId);

    // Aggregate all shortage reports
    const allShortages = rooms.flatMap(room =>
        (room.shortageReports || []).map((report: any) => ({ ...report, roomName: room.name, roomId: room.id }))
    );
    const pendingShortages = allShortages.filter((r: any) => r.status === 'pending');

    // Aggregate tile requirements per brand
    const tileReqMap: Record<string, { brand: string; tileKey: string; size: string; uniqueId: string; totalArea: number; totalQty: number; rooms: string[] }> = {};
    rooms.forEach(room => {
        const tc = (room as any).tilesConfig || {};
        const gridEntries = Object.entries((room as any).gridData || {});
        const tileAreas: Record<string, number> = { tile1: 0, tile2: 0, tile3: 0, tile4: 0 };
        gridEntries.forEach(([, v]) => { const k = String(v).split('|')[0]; if (k in tileAreas) tileAreas[k]++; });

        Object.entries(tileAreas).forEach(([tk, area]) => {
            if (area <= 0) return;
            const config = tc[tk] || {};
            const brand = config.purchaseName || tk;
            const size = config.size || '';
            const uid = config.uniqueId || '';
            const key = `${brand}__${size}`;
            if (!tileReqMap[key]) {
                tileReqMap[key] = { brand, tileKey: tk, size, uniqueId: uid, totalArea: 0, totalQty: 0, rooms: [] };
            }
            tileReqMap[key].totalArea += area;
            // Calculate qty
            const wastage = parseFloat(String(config.wastage)) || 0;
            const areaWithWastage = area * (1 + wastage / 100);
            let tileSqft = 0;
            if (size.includes('600x600')) tileSqft = 4;
            else if (size.includes('600x1200')) tileSqft = 8;
            else if (size.includes('800x800')) tileSqft = 7;
            else if (size.includes('300x300')) tileSqft = 1;
            else if (size.includes('Custom') && config.customLength && config.customWidth) {
                tileSqft = (parseFloat(config.customLength) * parseFloat(config.customWidth)) / (304.8 * 304.8);
            }
            if (tileSqft > 0) tileReqMap[key].totalQty += Math.ceil(areaWithWastage / tileSqft);
            tileReqMap[key].rooms.push(room.name);
        });
    });
    const tileReqs = Object.values(tileReqMap);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">📦 Material Requirement</h1>
                    <p className="text-sm text-gray-500 mt-1">Tile & material summary</p>
                </div>
                
                {/* Site Selector */}
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Select Site</label>
                    <select
                        value={selectedSiteId}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 sm:min-w-[220px]"
                    >
                        {sites.length === 0 && <option value="">No sites available</option>}
                        {sites.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedSiteId ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                    <p className="text-5xl mb-3">🏢</p>
                    <p className="text-sm font-medium">Please select a site to view material requirements.</p>
                </div>
            ) : loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                    <p className="text-4xl mb-3 animate-spin">⏳</p>
                    <p className="text-sm font-medium">Loading requirements…</p>
                </div>
            ) : (
                <>
                    {/* Pending Shortage Alerts */}
                    {pendingShortages.length > 0 && (
                        <div>
                            <h2 className="text-base font-bold text-red-700 mb-3">⚠️ Pending Shortage Reports ({pendingShortages.length})</h2>
                            <div className="flex flex-col gap-3">
                                {pendingShortages.map((report: any) => (
                                    <div key={report.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-red-900">{report.roomName}</p>
                                            <p className="text-sm text-red-800">
                                                <span className="font-extrabold">{report.quantity}</span> of <span className="font-extrabold">{report.material}</span>
                                                {report.note ? ` — ${report.note}` : ''}
                                            </p>
                                            <p className="text-xs text-red-400 mt-1 font-semibold">
                                                {new Date(report.date).toLocaleDateString()} {new Date(report.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const room = rooms.find(r => r.id === report.roomId);
                                                if (!room) return;
                                                const updatedReports = (room.shortageReports || []).filter((r: any) => r.id !== report.id);
                                                try {
                                                    const updatedRoom = await apiService.updateTileRoom(String(room.id), { shortageReports: updatedReports });
                                                    setRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
                                                } catch (e) {
                                                    alert('Failed to acknowledge report.');
                                                }
                                            }}
                                            className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
                                        >
                                            ✓ Acknowledge
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tile Requirement Summary */}
                    <div>
                        <h2 className="text-base font-bold text-gray-700 mb-3">🧱 Tile Requirements Summary</h2>
                        {tileReqs.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
                                <p className="text-4xl mb-2">📭</p>
                                <p className="text-sm font-medium">No tile data found for {selectedSite?.name}. Add rooms with tile configurations first.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-w-[800px]">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Brand / Tile</th>
                                            <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Size</th>
                                            <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">ID</th>
                                            <th className="text-right px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Area (sq.ft)</th>
                                            <th className="text-right px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Qty (pcs)</th>
                                            <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Rooms</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {tileReqs.map((req, i) => (
                                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm font-bold text-gray-900">{req.brand}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{req.size || '—'}</td>
                                                <td className="px-4 py-3 text-sm font-mono text-indigo-600 font-semibold">{req.uniqueId || '—'}</td>
                                                <td className="px-4 py-3 text-sm font-bold text-gray-800 text-right">{req.totalArea.toFixed(1)}</td>
                                                <td className="px-4 py-3 text-sm font-extrabold text-emerald-700 text-right">{req.totalQty}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500">{[...new Set(req.rooms)].join(', ')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* All Shortage History */}
                    {allShortages.length > 0 && (
                        <div>
                            <h2 className="text-base font-bold text-gray-700 mb-3">📋 All Shortage Reports ({allShortages.length})</h2>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                                <table className="w-full min-w-[800px]">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Room</th>
                                            <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Material</th>
                                            <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Qty</th>
                                            <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Note</th>
                                            <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {allShortages.map((report: any) => (
                                            <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm font-bold text-gray-900">{report.roomName}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{report.material}</td>
                                                <td className="px-4 py-3 text-sm font-bold text-gray-800">{report.quantity}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{report.note || '—'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-400 font-semibold">{new Date(report.date).toLocaleDateString()}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-extrabold uppercase ${
                                                        report.status === 'pending'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-green-100 text-green-700'
                                                    }`}>
                                                        {report.status || 'pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
