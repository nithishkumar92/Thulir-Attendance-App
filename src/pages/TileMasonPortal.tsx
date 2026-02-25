import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { fetchTileRooms, fetchAdvances } from '../services/apiService';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────── helpers ─────────────────────────── */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</p>
);

const TILE_COLORS: Record<string, string> = {
    tile1: '#6366f1', tile2: '#9333ea', tile3: '#0d9488', tile4: '#ea580c',
};
const TILE_NAMES: Record<string, string> = {
    tile1: 'Main Field', tile2: 'Border', tile3: 'Highlight 1', tile4: 'Highlight 2',
};
const TILE_BG: Record<string, string> = {
    tile1: '#eef2ff', tile2: '#faf5ff', tile3: '#f0fdfa', tile4: '#fff7ed',
};
const TILE_SIZES_MAP: Record<string, number> = {
    '600x600 mm (2x2 ft)': 4, '600x1200 mm (2x4 ft)': 8,
    '800x800 mm (32x32 in)': 7.11, '800x1600 mm (32x64 in)': 14.22,
    '1200x1200 mm (4x4 ft)': 16,
};
const calcReq = (area: number, size: string, wastage: number) => {
    const sqft = TILE_SIZES_MAP[size] || 1;
    return Math.ceil((area / sqft) * (1 + (wastage || 0) / 100));
};

function mapDbRoom(raw: any) {
    return {
        id: raw.id,
        name: raw.name || raw.room_name || 'Unnamed Room',
        area: raw.floorArea?.toString() || raw.floor_area?.toString() || raw.area || '0',
        totalArea: raw.totalArea?.toString() || raw.total_area?.toString() || raw.area || '0',
        length: raw.length || '0',
        width: raw.width || '0',
        totalTiles: raw.reqQty || raw.tiles_required || 0,
        instructions: raw.instructions || raw.notes || '',
        photos: (() => {
            const p = raw.photos || [];
            if (Array.isArray(p)) return p.map((ph: any) => typeof ph === 'string' ? ph : ph?.url || '').filter(Boolean);
            return [];
        })(),
        gridData: raw.gridData || raw.grid_data || {},
        tilesConfig: raw.tilesConfig || raw.tiles_config || {},
        surfaceType: raw.surfaceType || raw.surface_type || 'floor',
        hasSkirting: raw.hasSkirting || false,
        skirtingArea: raw.skirtingArea || '0',
        tileName: raw.tileName || '',
        tileSize: raw.tileSize || '',
        reqQty: raw.reqQty || 0,
        wastage: raw.wastage || '0',
    };
}

type Room = ReturnType<typeof mapDbRoom>;

/* ─────────────────────────── component ─────────────────────────── */
export const TileMasonPortal: React.FC = () => {
    const { currentUser, sites, teams, advances, logout } = useApp();
    const navigate = useNavigate();

    const [tab, setTab] = useState<'work' | 'pay'>('work');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [roomError, setRoomError] = useState('');
    const [myAdvances, setMyAdvances] = useState<any[]>([]);

    // expanded room id
    const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
    // image modal
    const [imageModal, setImageModal] = useState<string | null>(null);
    // shortage modal
    const [shortageRoom, setShortageRoom] = useState<Room | null>(null);
    const [shortageMat, setShortageMat] = useState('');
    const [shortageQty, setShortageQty] = useState('');
    const [shortageOther, setShortageOther] = useState('');
    const [shortageNote, setShortageNote] = useState('');

    const assignedTeam = teams.find(t => t.id === currentUser?.teamId);
    const siteId = currentUser?.siteId || assignedTeam?.permittedSiteIds?.[0] || '';
    const siteName = sites.find(s => s.id === siteId)?.name || 'Your Site';

    // Load rooms
    useEffect(() => {
        if (!siteId) { setLoading(false); setRoomError('No site assigned. Contact your admin.'); return; }
        setLoading(true);
        fetchTileRooms(siteId)
            .then(data => { setRooms(data.map(mapDbRoom)); setRoomError(''); })
            .catch(() => setRoomError('Failed to load rooms. Please refresh.'))
            .finally(() => setLoading(false));
    }, [siteId]);

    // Load advances
    useEffect(() => {
        const today = new Date();
        const from = new Date(); from.setMonth(today.getMonth() - 6);
        fetchAdvances(from.toISOString().split('T')[0], today.toISOString().split('T')[0])
            .then(data => setMyAdvances(data || []))
            .catch(() => {});
    }, []);

    // Payments calc
    const totalReqTiles = rooms.reduce((s, r) => s + (r.reqQty || 0), 0);
    const workerRate = 22;
    const totalFloorArea = rooms.reduce((s, r) => s + parseFloat(r.area || '0'), 0);
    const totalEarned = Math.round(totalFloorArea * workerRate);
    const totalPaid = myAdvances.reduce((s, p) => s + (p.amount || 0), 0);
    const balance = totalEarned - totalPaid;
    const totalArea = rooms.reduce((s, r) => s + parseFloat(r.totalArea || '0'), 0);

    const handleShortageSubmit = () => {
        if (!shortageMat) return;
        if (!shortageQty) return;
        alert(`Shortage reported for ${shortageRoom?.name}:\n${shortageQty} of ${shortageMat === 'other' ? shortageOther : shortageMat}${shortageNote ? `\nNote: ${shortageNote}` : ''}\n\nEngineer has been notified.`);
        setShortageRoom(null); setShortageMat(''); setShortageQty(''); setShortageOther(''); setShortageNote('');
    };

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div style={{ fontFamily: "'Inter',sans-serif", background: '#f1f5f9', minHeight: '100vh', maxWidth: 430, margin: '0 auto', color: '#0f172a', paddingBottom: 80 }}>

            {/* ── HEADER ── */}
            <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '20px 20px 28px', color: '#fff', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧱</div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Tile Worker Portal</h1>
                                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>👷 {currentUser?.name}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%' }} />
                            <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>{siteName}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >Logout</button>
                </div>

                {/* Quick stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[
                        { label: 'Rooms', value: rooms.length, icon: '🏠' },
                        { label: 'Total Area', value: `${totalArea.toFixed(0)} sqft`, icon: '📐' },
                        { label: 'Balance', value: `₹${Math.abs(balance).toLocaleString()}`, icon: '💰' },
                    ].map(s => (
                        <div key={s.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                            <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 900, color: '#f8fafc' }}>{s.value}</p>
                            <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</p>
                        </div>
                    ))}
                </div>

                <p style={{ margin: '14px 0 0', fontSize: 11, color: '#475569', textAlign: 'right' }}>{today}</p>
            </div>

            {/* ── BODY ── */}
            <div style={{ padding: '18px 14px' }}>

                {/* ══════════ WORK TAB ══════════ */}
                {tab === 'work' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Assigned Rooms</h2>
                            <span style={{ background: '#eef2ff', color: '#4f46e5', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 800 }}>
                                {rooms.length} Rooms · {totalReqTiles.toLocaleString()} Tiles
                            </span>
                        </div>

                        {loading && (
                            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                                <div style={{ fontSize: 28, marginBottom: 8, animation: 'spin 1s linear infinite' }}>⏳</div>
                                Loading rooms…
                            </div>
                        )}
                        {roomError && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: 16, color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>
                                {roomError}
                            </div>
                        )}
                        {!loading && !roomError && rooms.length === 0 && (
                            <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>🏠</div>
                                <p style={{ margin: 0, fontWeight: 700 }}>No rooms assigned yet</p>
                                <p style={{ margin: '4px 0 0', fontSize: 13 }}>Your engineer will set up rooms soon.</p>
                            </div>
                        )}

                        {rooms.map(room => {
                            const isOpen = expandedRoom === room.id;
                            const gridEntries = Object.entries(room.gridData || {});
                            const hasGrid = gridEntries.length > 0;
                            const tc = room.tilesConfig || {};
                            const W = parseFloat(room.width) || 10;
                            const L = parseFloat(room.length) || 12;

                            // per-type tile areas
                            const areas: Record<string, number> = { tile1: 0, tile2: 0, tile3: 0, tile4: 0 };
                            gridEntries.forEach(([, v]) => { if (v in areas) areas[v]++; });
                            const activeTypes = Object.keys(areas).filter(k => areas[k] > 0);

                            return (
                                <div key={room.id} style={{ background: '#fff', borderRadius: 20, marginBottom: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>

                                    {/* Room card header — always visible */}
                                    <div
                                        onClick={() => setExpandedRoom(isOpen ? null : room.id)}
                                        style={{ padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                                                    {room.surfaceType === 'wall' ? '🧱' : '🟦'}
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{room.name}</h3>
                                                    <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                                                        {W} × {L} ft · {parseFloat(room.area || '0').toFixed(0)} sq.ft
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Mini type badges */}
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {activeTypes.map(k => (
                                                    <span key={k} style={{ background: TILE_BG[k], color: TILE_COLORS[k], fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>
                                                        {TILE_NAMES[k]}
                                                    </span>
                                                ))}
                                                {!hasGrid && room.tileName && (
                                                    <span style={{ background: '#eef2ff', color: '#4f46e5', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>{room.tileName}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', marginLeft: 10 }}>
                                            <p style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{room.reqQty} <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>nos</span></p>
                                            <p style={{ margin: '0 0 8px', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>REQUIRED</p>
                                            <span style={{ fontSize: 16, color: isOpen ? '#6366f1' : '#94a3b8' }}>{isOpen ? '▲' : '▼'}</span>
                                        </div>
                                    </div>

                                    {/* Expanded section */}
                                    {isOpen && (
                                        <div style={{ borderTop: '1px solid #f1f5f9', padding: 16 }}>

                                            {/* Grid layout preview */}
                                            {hasGrid && (
                                                <div style={{ marginBottom: 16 }}>
                                                    <Label>{room.surfaceType === 'wall' ? '🧱 Wall Elevation' : '🪟 Floor Layout'}</Label>
                                                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: 10, border: '1px solid #e2e8f0' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${W}, 1fr)`, gap: 1, background: '#cbd5e1', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                                                            {Array.from({ length: L }).flatMap((_, y) =>
                                                                Array.from({ length: W }).map((_, x) => {
                                                                    const ct = room.gridData[`${x}-${y}`];
                                                                    let bg = '#f8fafc';
                                                                    if (ct === 'deduct') bg = 'repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1 2px,#f8fafc 2px,#f8fafc 5px)';
                                                                    else if (ct && TILE_COLORS[ct]) bg = TILE_COLORS[ct];
                                                                    return <div key={`${x}-${y}`} style={{ aspectRatio: '1/1', background: bg }} />;
                                                                })
                                                            )}
                                                        </div>
                                                        {/* Legend */}
                                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                            {activeTypes.map(k => (
                                                                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    <div style={{ width: 10, height: 10, background: TILE_COLORS[k], borderRadius: 3 }} />
                                                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>{TILE_NAMES[k]}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Tile type breakdown */}
                                            {activeTypes.length > 0 && (
                                                <div style={{ marginBottom: 16 }}>
                                                    <Label>Tile Type Breakdown</Label>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        {activeTypes.map(k => {
                                                            const area = areas[k];
                                                            const cfg = (tc as any)[k] || {};
                                                            const req = calcReq(area, cfg.size || '', parseFloat(cfg.wastage) || 0);
                                                            return (
                                                                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: TILE_BG[k], borderRadius: 12, padding: '10px 12px' }}>
                                                                    <div style={{ width: 28, height: 28, background: TILE_COLORS[k], borderRadius: 8, flexShrink: 0 }} />
                                                                    <div style={{ flex: 1 }}>
                                                                        <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 800, color: TILE_COLORS[k] }}>{TILE_NAMES[k]}</p>
                                                                        <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 600 }}>{cfg.size || 'Size not set'}</p>
                                                                    </div>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{req} <span style={{ fontSize: 10, color: '#94a3b8' }}>nos</span></p>
                                                                        <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>{area} sq.ft</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Simple tile info when no grid */}
                                            {!hasGrid && room.tileName && (
                                                <div style={{ background: '#eef2ff', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800, color: '#4f46e5' }}>{room.tileName}</p>
                                                            <p style={{ margin: 0, fontSize: 11, color: '#6366f1' }}>{room.tileSize}</p>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#4f46e5' }}>{room.reqQty}</p>
                                                            <p style={{ margin: 0, fontSize: 10, color: '#818cf8' }}>nos (+{room.wastage}%)</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Engineer notes */}
                                            {room.instructions && (
                                                <div style={{ background: '#fffbeb', borderLeft: '3px solid #f59e0b', padding: '10px 12px', borderRadius: '0 10px 10px 0', marginBottom: 16 }}>
                                                    <p style={{ margin: '0 0 4px', fontSize: 10, color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>📝 Engineer Notes</p>
                                                    <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>{room.instructions}</p>
                                                </div>
                                            )}

                                            {/* Reference photos */}
                                            {room.photos.length > 0 && (
                                                <div style={{ marginBottom: 16 }}>
                                                    <Label>Reference Photos</Label>
                                                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                                                        {room.photos.map((url, i) => (
                                                            <div key={i} onClick={() => setImageModal(url)} style={{ width: 76, height: 76, flexShrink: 0, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '1px solid #e2e8f0' }}>
                                                                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Shortage button */}
                                            <button
                                                onClick={() => { setShortageRoom(room); setShortageMat(''); setShortageQty(''); setShortageOther(''); setShortageNote(''); }}
                                                style={{ width: '100%', padding: '12px', background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fecaca', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                                            >⚠️ Report Material Shortage</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}

                {/* ══════════ PAYMENTS TAB ══════════ */}
                {tab === 'pay' && (
                    <>
                        {/* Earnings card */}
                        <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: 20, padding: 20, color: '#fff', marginBottom: 16, boxShadow: '0 8px 24px rgba(79,70,229,0.3)' }}>
                            <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Total Earned ({totalFloorArea.toFixed(0)} sq.ft × ₹{workerRate})
                            </p>
                            <h2 style={{ margin: '0 0 20px', fontSize: 32, fontWeight: 900 }}>₹{totalEarned.toLocaleString()}</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14 }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase' }}>Advances Paid</p>
                                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#6ee7b7' }}>₹{totalPaid.toLocaleString()}</p>
                                </div>
                                <div style={{ background: balance < 0 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14 }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase' }}>{balance < 0 ? 'Overpaid' : 'Balance Due'}</p>
                                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: balance < 0 ? '#fca5a5' : '#fff' }}>
                                        ₹{Math.abs(balance).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Rooms breakdown */}
                        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid #f1f5f9' }}>
                            <Label>Area by Room</Label>
                            {rooms.length === 0 ? (
                                <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 16 }}>No rooms yet</p>
                            ) : rooms.map(r => {
                                const earned = Math.round(parseFloat(r.area || '0') * workerRate);
                                return (
                                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                                        <div>
                                            <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{r.name}</p>
                                            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{parseFloat(r.area || '0').toFixed(1)} sq.ft</p>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#4f46e5' }}>₹{earned.toLocaleString()}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Advance history */}
                        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>Advance History</h3>
                        {myAdvances.length === 0 ? (
                            <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
                                <p style={{ margin: 0, fontWeight: 700 }}>No advance payments recorded</p>
                            </div>
                        ) : (
                            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                                {myAdvances.map((p, i) => (
                                    <div key={p.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i !== myAdvances.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 38, height: 38, background: '#ecfdf5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💵</div>
                                            <div>
                                                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800 }}>Advance</p>
                                                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{p.date}{p.notes ? ` · ${p.notes}` : ''}</p>
                                            </div>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#10b981' }}>+₹{(p.amount || 0).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── STICKY BOTTOM NAV ── */}
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', zIndex: 50, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
                {([
                    { key: 'work', label: 'Site Work', icon: '📋' },
                    { key: 'pay',  label: 'Payments',  icon: '₹' },
                ] as const).map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: tab === t.key ? '#6366f1' : '#94a3b8', borderTop: tab === t.key ? '2px solid #6366f1' : '2px solid transparent', transition: 'all 0.15s' }}
                    >
                        <span style={{ fontSize: 20 }}>{t.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* ── IMAGE MODAL ── */}
            {imageModal && (
                <div onClick={() => setImageModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <img src={imageModal} alt="" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 14, objectFit: 'contain' }} />
                    <p style={{ color: '#64748b', marginTop: 16, fontSize: 13 }}>Tap anywhere to close</p>
                </div>
            )}

            {/* ── SHORTAGE MODAL ── */}
            {shortageRoom && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: 430, borderRadius: '24px 24px 0 0', padding: 24, boxSizing: 'border-box', animation: 'slideUp 0.25s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#ef4444' }}>Report Shortage</h2>
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{shortageRoom.name}</p>
                            </div>
                            <button onClick={() => setShortageRoom(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 36, height: 36, fontSize: 18, cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <Label>Material / Tile Type</Label>
                            <select value={shortageMat} onChange={e => setShortageMat(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#f8fafc', outline: 'none', appearance: 'none' }}>
                                <option value="" disabled>Select material…</option>
                                {Object.keys(shortageRoom.tilesConfig || {}).filter(k => (shortageRoom.tilesConfig as any)[k]?.size && !(shortageRoom.tilesConfig as any)[k]?.size.includes('Select')).map(k => (
                                    <option key={k} value={k}>{TILE_NAMES[k] || k} — {(shortageRoom.tilesConfig as any)[k]?.size}</option>
                                ))}
                                <option value="cement">Cement</option>
                                <option value="spacer">Tile Spacers</option>
                                <option value="grout">Grout</option>
                                <option value="other">Other…</option>
                            </select>
                        </div>

                        {shortageMat === 'other' && (
                            <div style={{ marginBottom: 14 }}>
                                <Label>Specify Material</Label>
                                <input value={shortageOther} onChange={e => setShortageOther(e.target.value)} placeholder="e.g. White Epoxy Grout" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                            <div>
                                <Label>Quantity Needed</Label>
                                <input type="text" value={shortageQty} onChange={e => setShortageQty(e.target.value)} placeholder="e.g. 15 pcs / 2 bags" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                            </div>
                            <div>
                                <Label>Note (optional)</Label>
                                <input type="text" value={shortageNote} onChange={e => setShortageNote(e.target.value)} placeholder="Urgent?" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                            </div>
                        </div>

                        <button
                            onClick={handleShortageSubmit}
                            disabled={!shortageMat || !shortageQty}
                            style={{ width: '100%', padding: 16, background: (!shortageMat || !shortageQty) ? '#fca5a5' : '#ef4444', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 900, cursor: (!shortageMat || !shortageQty) ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                        >🚀 Send Shortage Report</button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
                ::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};
