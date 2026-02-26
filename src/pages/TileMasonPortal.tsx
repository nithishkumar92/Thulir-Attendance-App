import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { fetchTileRooms, fetchAdvances } from '../services/apiService';
import { useNavigate } from 'react-router-dom';

/* ─────── constants ─────── */
const TILE_COLORS: Record<string, string> = {
    tile1: '#6366f1', tile2: '#9333ea', tile3: '#f97316', tile4: '#0d9488',
};
const TILE_NAMES: Record<string, string> = {
    tile1: 'Main Field', tile2: 'Border', tile3: 'Highlight 1', tile4: 'Highlight 2',
};
const TILE_SIZES_MAP: Record<string, number> = {
    '600x600 mm (2x2 ft)': 4,
    '600x1200 mm (2x4 ft)': 8,
    '800x800 mm (32x32 in)': 7.11,
    '800x1600 mm (32x64 in)': 14.22,
    '1200x1200 mm (4x4 ft)': 16,
};
const calcReq = (area: number, size: string, wastage: number) => {
    const sqft = TILE_SIZES_MAP[size] || 1;
    return Math.ceil((area / sqft) * (1 + (wastage || 0) / 100));
};

/* ─────── mapDbRoom ─────── */
function mapDbRoom(raw: any) {
    return {
        id: String(raw.id),
        name: raw.name || raw.room_name || 'Unnamed Room',
        area: parseFloat(raw.floorArea ?? raw.floor_area ?? raw.area ?? '0') || 0,
        totalArea: parseFloat(raw.totalArea ?? raw.total_area ?? raw.area ?? '0') || 0,
        length: parseFloat(raw.length ?? '0') || 0,
        width: parseFloat(raw.width ?? '0') || 0,
        reqQty: parseFloat(raw.reqQty ?? raw.tiles_required ?? '0') || 0,
        instructions: raw.instructions || raw.notes || '',
        photos: (() => {
            const p = raw.photos || [];
            if (!Array.isArray(p)) return [];
            return p.map((ph: any) => typeof ph === 'string' ? ph : ph?.url || '').filter(Boolean);
        })(),
        gridData: raw.gridData || raw.grid_data || {} as Record<string, string>,
        tilesConfig: raw.tilesConfig || raw.tiles_config || {} as Record<string, { size?: string; wastage?: number }>,
        surfaceType: (raw.surfaceType || raw.surface_type || 'floor') as string,
        tileName: raw.tileName || '',
        tileSize: raw.tileSize || '',
        wastage: parseFloat(raw.wastage ?? '0') || 0,
    };
}
type Room = ReturnType<typeof mapDbRoom>;

/* ─────── sub-components ─────── */
const TileChip: React.FC<{ label: string; color: string; count: number; size: string }> = ({ label, color, count, size }) => (
    <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 18, padding: '14px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', gap: 14, border: `2px solid ${color}22` }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: color, flexShrink: 0, boxShadow: `0 4px 14px ${color}55` }} />
        <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{label}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 600 }}>{size || '—'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>{count}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>pieces</p>
        </div>
    </div>
);

const GridPreview: React.FC<{ room: Room }> = ({ room }) => {
    const W = Math.max(Math.round(room.width), 1);
    const L = Math.max(Math.round(room.length), 1);
    const entries = Object.entries(room.gridData);
    if (entries.length === 0) return null;
    return (
        <div style={{ background: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                {room.surfaceType === 'wall' ? '🧱 Wall Elevation' : '🟦 Floor Layout'}
            </p>
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${W}, 1fr)`,
                gap: 1.5,
                background: '#cbd5e1',
                borderRadius: 8,
                overflow: 'hidden',
                marginBottom: 10,
            }}>
                {Array.from({ length: L }).flatMap((_, y) =>
                    Array.from({ length: W }).map((_, x) => {
                        const ct = room.gridData[`${x}-${y}`];
                        let bg = '#f1f5f9';
                        if (ct === 'deduct') bg = 'repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1 2px,#f8fafc 2px,#f8fafc 5px)';
                        else if (ct && TILE_COLORS[ct]) bg = TILE_COLORS[ct];
                        return <div key={`${x}-${y}`} style={{ aspectRatio: '1/1', background: bg }} />;
                    })
                )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(TILE_COLORS).filter(([k]) => entries.some(([, v]) => v === k)).map(([k, c]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 4, background: c }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{TILE_NAMES[k]}</span>
                    </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 4, background: 'repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1 2px,#f8fafc 2px,#f8fafc 5px)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Cut-out</span>
                </div>
            </div>
        </div>
    );
};

/* ─────── main component ─────── */
export const TileMasonPortal: React.FC = () => {
    const { currentUser, sites, teams, logout } = useApp();
    const navigate = useNavigate();

    const [tab, setTab] = useState<'work' | 'pay'>('work');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [roomError, setRoomError] = useState('');
    const [myAdvances, setMyAdvances] = useState<any[]>([]);
    // which room is selected in work tab
    const [activeRoomIdx, setActiveRoomIdx] = useState(0);
    // show grid toggle
    const [showGrid, setShowGrid] = useState(false);
    // image lightbox
    const [lightbox, setLightbox] = useState<string | null>(null);
    // shortage modal state
    const [shortageOpen, setShortageOpen] = useState(false);
    const [shortageMat, setShortageMat] = useState('');
    const [shortageQty, setShortageQty] = useState('');
    const [shortageNote, setShortageNote] = useState('');

    const assignedTeam = teams.find(t => t.id === currentUser?.teamId);
    const siteId = currentUser?.siteId || assignedTeam?.permittedSiteIds?.[0] || '';
    const siteName = sites.find(s => s.id === siteId)?.name || 'Your Site';

    useEffect(() => {
        if (!siteId) { setLoading(false); setRoomError('No site assigned. Contact your admin.'); return; }
        setLoading(true);
        fetchTileRooms(siteId)
            .then(data => { setRooms(data.map(mapDbRoom)); setRoomError(''); setActiveRoomIdx(0); setShowGrid(false); })
            .catch(() => setRoomError('Failed to load rooms. Please refresh.'))
            .finally(() => setLoading(false));
    }, [siteId]);

    useEffect(() => {
        const today = new Date();
        const from = new Date(); from.setMonth(today.getMonth() - 6);
        fetchAdvances(from.toISOString().split('T')[0], today.toISOString().split('T')[0])
            .then(data => {
                const tid = currentUser?.teamId || '';
                setMyAdvances((data || []).filter((p: any) => !tid || !p.teamId || p.teamId === tid));
            })
            .catch(() => {});
    }, [currentUser?.teamId]);

    // active room
    const activeRoom = rooms[activeRoomIdx] || null;

    // tile type breakdown for active room
    const gridEntries = Object.entries(activeRoom?.gridData || {});
    const hasGrid = gridEntries.length > 0;
    const tileAreas: Record<string, number> = { tile1: 0, tile2: 0, tile3: 0, tile4: 0 };
    gridEntries.forEach(([, v]) => { const k = String(v); if (k in tileAreas) tileAreas[k]++; });
    const activeTypes = Object.keys(tileAreas).filter(k => tileAreas[k] > 0);
    const tc = activeRoom?.tilesConfig || {};

    // payments
    const workerRate = 22;
    const totalFloorArea = rooms.reduce((s, r) => s + r.area, 0);
    const totalEarned = Math.round(totalFloorArea * workerRate);
    const totalPaid = myAdvances.reduce((s, p) => s + (parseFloat(String(p.amount)) || 0), 0);
    const balance = totalEarned - totalPaid;

    const handleShortageSubmit = () => {
        if (!shortageMat || !shortageQty) return;
        alert(`Shortage reported for ${activeRoom?.name}:\n${shortageQty} of ${shortageMat}${shortageNote ? `\nNote: ${shortageNote}` : ''}\n\nEngineer has been notified.`);
        setShortageOpen(false); setShortageMat(''); setShortageQty(''); setShortageNote('');
    };

    /* ───────── render ───────── */
    return (
        <div style={{ fontFamily: "'Inter',sans-serif", background: '#f1f5f9', minHeight: '100vh', maxWidth: 430, margin: '0 auto', color: '#0f172a', userSelect: 'none' }}>

            {/* ══ HEADER ══ */}
            <div style={{ background: 'linear-gradient(150deg,#1e293b 0%,#0f172a 100%)', padding: '18px 18px 22px', color: '#fff', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#6366f1,#9333ea)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧱</div>
                        <div>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Tile Worker</p>
                            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{currentUser?.name} · {siteName}</p>
                        </div>
                    </div>
                    <button onClick={() => { logout(); navigate('/login'); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Logout</button>
                </div>
                {/* Summary pills */}
                <div style={{ display: 'flex', gap: 10 }}>
                    {[
                        { v: rooms.length, l: 'Rooms' },
                        { v: `${totalFloorArea.toFixed(0)} sqft`, l: 'Total Area' },
                        { v: `₹${Math.abs(balance).toLocaleString()}`, l: balance >= 0 ? 'Balance Due' : 'Overpaid' },
                    ].map(s => (
                        <div key={s.l} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 900, color: '#f8fafc' }}>{s.v}</p>
                            <p style={{ margin: 0, fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.l}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══ BODY ══ */}
            <div style={{ padding: '16px 14px 100px' }}>

                {/* ════ WORK TAB ════ */}
                {tab === 'work' && (
                    <>
                        {loading && (
                            <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                                <p style={{ margin: 0, fontWeight: 700 }}>Loading your rooms…</p>
                            </div>
                        )}
                        {roomError && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: 20, textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{roomError}</div>
                        )}

                        {!loading && !roomError && rooms.length === 0 && (
                            <div style={{ background: '#fff', borderRadius: 20, padding: 48, textAlign: 'center', color: '#94a3b8', marginTop: 20 }}>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
                                <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 16, color: '#334155' }}>No rooms assigned yet</p>
                                <p style={{ margin: 0, fontSize: 13 }}>Your engineer will set up rooms soon.</p>
                            </div>
                        )}

                        {!loading && !roomError && rooms.length > 0 && (
                            <>
                                {/* Room selector — horizontal chips */}
                                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16, msOverflowStyle: 'none' }}>
                                    {rooms.map((r, i) => (
                                        <button
                                            key={r.id}
                                            onClick={() => { setActiveRoomIdx(i); setShowGrid(false); }}
                                            style={{
                                                flexShrink: 0, padding: '9px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, transition: 'all 0.15s',
                                                background: i === activeRoomIdx ? '#6366f1' : '#fff',
                                                color: i === activeRoomIdx ? '#fff' : '#334155',
                                                boxShadow: i === activeRoomIdx ? '0 4px 14px rgba(99,102,241,0.35)' : '0 1px 4px rgba(0,0,0,0.08)',
                                            }}
                                        >
                                            {r.name}
                                        </button>
                                    ))}
                                </div>

                                {activeRoom && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                                        {/* Job card hero */}
                                        <div style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', borderRadius: 22, padding: 22, color: '#fff' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                                <div>
                                                    <p style={{ margin: '0 0 3px', fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Current Job</p>
                                                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{activeRoom.name}</h2>
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 14px', textAlign: 'center' }}>
                                                    <p style={{ margin: '0 0 1px', fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase' }}>Area</p>
                                                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{activeRoom.area.toFixed(0)}<span style={{ fontSize: 11, fontWeight: 600 }}> sqft</span></p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 12 }}>
                                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px' }}>
                                                    <p style={{ margin: '0 0 2px', fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase' }}>Dimensions</p>
                                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>{activeRoom.width} × {activeRoom.length} <span style={{ fontSize: 12, fontWeight: 600 }}>ft</span></p>
                                                </div>
                                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px' }}>
                                                    <p style={{ margin: '0 0 2px', fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase' }}>Surface</p>
                                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>{activeRoom.surfaceType === 'wall' ? '🧱 Wall' : '🪟 Floor'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Tile requirements ── */}
                                        {(activeTypes.length > 0 || activeRoom.tileName) && (
                                            <div>
                                                <p style={{ margin: '4px 0 10px', fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>📦 Tiles to Lay</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    {activeTypes.length > 0 ? (
                                                        activeTypes.map(k => {
                                                            const cfg = (tc as any)[k] || {};
                                                            const req = calcReq(tileAreas[k], cfg.size || '', parseFloat(cfg.wastage) || 0);
                                                            return <TileChip key={k} label={TILE_NAMES[k]} color={TILE_COLORS[k]} count={req} size={cfg.size || ''} />;
                                                        })
                                                    ) : (
                                                        <TileChip label={activeRoom.tileName || 'Main Tile'} color="#6366f1" count={activeRoom.reqQty} size={activeRoom.tileSize} />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Floor layout ── */}
                                        {hasGrid && (
                                            <div>
                                                <button
                                                    onClick={() => setShowGrid(g => !g)}
                                                    style={{ width: '100%', padding: '14px 0', background: showGrid ? '#eef2ff' : '#fff', color: showGrid ? '#6366f1' : '#334155', border: `2px solid ${showGrid ? '#c7d2fe' : '#e2e8f0'}`, borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                                                >
                                                    {showGrid ? '🔼' : '🔽'} {showGrid ? 'Hide' : 'Show'} Layout Plan
                                                </button>
                                                {showGrid && (
                                                    <div style={{ marginTop: 10 }}>
                                                        <GridPreview room={activeRoom} />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ── Engineer notes ── */}
                                        {activeRoom.instructions && (
                                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: 16 }}>
                                                <p style={{ margin: '0 0 6px', fontSize: 11, color: '#b45309', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📝 Engineer Notes</p>
                                                <p style={{ margin: 0, fontSize: 15, color: '#92400e', lineHeight: 1.6, fontWeight: 600 }}>{activeRoom.instructions}</p>
                                            </div>
                                        )}

                                        {activeRoom.photos.length > 0 && (
                                            <div>
                                                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>📸 Reference Photos</p>
                                                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                                                    {activeRoom.photos.map((url, i) => (
                                                        <div
                                                            key={i} onClick={() => setLightbox(url)}
                                                            style={{ width: 100, height: 100, flexShrink: 0, borderRadius: 14, overflow: 'hidden', border: '2px solid #e2e8f0', cursor: 'pointer' }}
                                                        >
                                                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => { setShortageOpen(true); setShortageMat(''); setShortageQty(''); setShortageNote(''); }}
                                            style={{ width: '100%', padding: '16px 0', background: 'linear-gradient(90deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: 18, fontSize: 16, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}
                                        >
                                            ⚠️ Report Material Shortage
                                        </button>

                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* ════ PAYMENTS TAB ════ */}
                {tab === 'pay' && (
                    <>
                        {/* Big earnings card */}
                        <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: 22, padding: 24, color: '#fff', marginBottom: 16, boxShadow: '0 8px 28px rgba(79,70,229,0.3)' }}>
                            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Total Work Value ({totalFloorArea.toFixed(0)} sqft × ₹{workerRate})
                            </p>
                            <h2 style={{ margin: '0 0 22px', fontSize: 38, fontWeight: 900 }}>₹{totalEarned.toLocaleString()}</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 16 }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase' }}>Advances Paid</p>
                                    <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#6ee7b7' }}>₹{totalPaid.toLocaleString()}</p>
                                </div>
                                <div style={{ background: balance < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 16 }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase' }}>{balance < 0 ? 'Overpaid' : 'Balance Due'}</p>
                                    <p style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>₹{Math.abs(balance).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Room earnings breakdown */}
                        <div style={{ background: '#fff', borderRadius: 18, padding: '4px 0', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                            {rooms.map((r, i) => (
                                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: i < rooms.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                    <div>
                                        <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 800 }}>{r.name}</p>
                                        <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 600 }}>{r.area.toFixed(1)} sqft</p>
                                    </div>
                                    <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#4f46e5' }}>₹{Math.round(r.area * workerRate).toLocaleString()}</p>
                                </div>
                            ))}
                            {rooms.length === 0 && <p style={{ padding: '20px 18px', margin: 0, color: '#94a3b8', textAlign: 'center' }}>No rooms yet</p>}
                        </div>

                        {/* Advance history */}
                        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: '#334155' }}>Advance History</p>
                        {myAdvances.length === 0 ? (
                            <div style={{ background: '#fff', borderRadius: 18, padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>💸</div>
                                <p style={{ margin: 0, fontWeight: 700 }}>No advances recorded</p>
                            </div>
                        ) : (
                            <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                                {myAdvances.map((p, i) => (
                                    <div key={p.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: i < myAdvances.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, background: '#ecfdf5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💵</div>
                                            <div>
                                                <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800 }}>Advance Payment</p>
                                                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{p.date}{p.notes ? ` · ${p.notes}` : ''}</p>
                                            </div>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#10b981' }}>+₹{(parseFloat(String(p.amount)) || 0).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ══ MASON BOTTOM NAV ══ */}

            {/* ══ BOTTOM NAV ══ */}
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', zIndex: 50, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
                {([
                    { key: 'work', icon: '📋', label: 'Site Work' },
                    { key: 'pay', icon: '₹', label: 'Payments' },
                ] as const).map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{ flex: 1, padding: '13px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: tab === t.key ? '#6366f1' : '#94a3b8', borderTop: `2.5px solid ${tab === t.key ? '#6366f1' : 'transparent'}`, transition: 'all 0.15s' }}
                    >
                        <span style={{ fontSize: 22 }}>{t.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* ══ IMAGE LIGHTBOX ══ */}
            {lightbox && (
                <div
                    onClick={() => setLightbox(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                >
                    <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: 14, objectFit: 'contain' }} />
                    <p style={{ color: '#475569', marginTop: 14, fontSize: 13 }}>Tap anywhere to close</p>
                </div>
            )}

            {/* ══ SHORTAGE BOTTOM SHEET ══ */}
            {shortageOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: 430, borderRadius: '26px 26px 0 0', padding: 24, boxSizing: 'border-box', animation: 'slideUp 0.25s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
                            <div>
                                <h2 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 900, color: '#ef4444' }}>⚠️ Report Shortage</h2>
                                <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>Room: {activeRoom?.name}</p>
                            </div>
                            <button onClick={() => setShortageOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 38, height: 38, fontSize: 18, cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        {/* Material selector — big tap targets */}
                        <div style={{ marginBottom: 14 }}>
                            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>What is missing?</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                    ...activeTypes.map(k => ({ v: TILE_NAMES[k], label: `${TILE_NAMES[k]} Tiles`, color: TILE_COLORS[k] })),
                                    { v: 'Cement', label: '🪣 Cement', color: '#64748b' },
                                    { v: 'Spacers', label: '🔲 Tile Spacers', color: '#64748b' },
                                    { v: 'Grout', label: '🧴 Grout / Epoxy', color: '#64748b' },
                                    { v: 'Other', label: '📦 Other Material', color: '#64748b' },
                                ].map(opt => (
                                    <button
                                        key={opt.v}
                                        onClick={() => setShortageMat(opt.v)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: `2px solid ${shortageMat === opt.v ? (opt.color || '#6366f1') : '#e2e8f0'}`, borderRadius: 14, background: shortageMat === opt.v ? `${opt.color}11` : '#fafafa', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 15, color: '#0f172a', transition: 'all 0.15s' }}
                                    >
                                        {opt.color !== '#64748b' && <div style={{ width: 22, height: 22, borderRadius: 6, background: opt.color, flexShrink: 0 }} />}
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quantity */}
                        <div style={{ marginBottom: 14 }}>
                            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>How many / how much?</p>
                            <input
                                type="text" value={shortageQty} onChange={e => setShortageQty(e.target.value)}
                                placeholder="e.g.  15 pieces  /  2 bags"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '16px 18px', borderRadius: 14, border: '2px solid #e2e8f0', fontSize: 17, fontWeight: 700, outline: 'none', color: '#0f172a' }}
                            />
                        </div>

                        {/* Note (optional) */}
                        <div style={{ marginBottom: 20 }}>
                            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Note (optional)</p>
                            <input
                                type="text" value={shortageNote} onChange={e => setShortageNote(e.target.value)}
                                placeholder="e.g.  Urgent, work stopped"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '14px 18px', borderRadius: 14, border: '2px solid #e2e8f0', fontSize: 15, outline: 'none', color: '#334155' }}
                            />
                        </div>

                        <button
                            onClick={handleShortageSubmit}
                            disabled={!shortageMat || !shortageQty}
                            style={{ width: '100%', padding: '18px 0', background: (!shortageMat || !shortageQty) ? '#fca5a5' : '#ef4444', color: '#fff', border: 'none', borderRadius: 16, fontSize: 17, fontWeight: 900, cursor: (!shortageMat || !shortageQty) ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                        >
                            🚀 Send to Engineer
                        </button>
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
