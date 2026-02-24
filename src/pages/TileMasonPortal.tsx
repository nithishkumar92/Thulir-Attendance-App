import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { fetchTileRooms } from '../services/apiService';
import { fetchAdvances } from '../services/apiService';
import { useNavigate } from 'react-router-dom';

// --- Helpers ---
const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', ...style }}>{children}</p>
);

const Badge: React.FC<{ text: string; color?: 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'purple' }> = ({ text, color = 'blue' }) => {
    const colors = {
        blue:   { bg: '#eef2ff', text: '#4f46e5' },
        green:  { bg: '#ecfdf5', text: '#10b981' },
        orange: { bg: '#fff7ed', text: '#ea580c' },
        red:    { bg: '#fef2f2', text: '#ef4444' },
        gray:   { bg: '#f1f5f9', text: '#64748b' },
        purple: { bg: '#f5f3ff', text: '#7c3aed' },
    };
    const theme = colors[color];
    return (
        <span style={{ background: theme.bg, color: theme.text, padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {text}
        </span>
    );
};

// --- Types matching the DB tile_rooms schema ---
interface TileSpec {
    id: number;
    type: string;
    name: string;
    size: string;
    sqftPerPiece: number;
}

interface Room {
    id: string;
    name: string;
    area: string;
    totalTiles: number;
    completedTiles: number;
    instructions: string;
    photos: string[];
    tiles: TileSpec[];
    siteId: string;
}

// Map raw DB fields to Room shape
function mapDbRoom(raw: any): Room {
    return {
        id: raw.id,
        name: raw.room_name || raw.name || 'Unnamed Room',
        area: raw.floor_area?.toString() || raw.area || '0',
        totalTiles: raw.tiles_required || raw.totalTiles || 0,
        completedTiles: raw.completed_tiles || 0,
        instructions: raw.notes || raw.instructions || '',
        photos: raw.photos || [],
        tiles: raw.tiles || [],
        siteId: raw.site_id || raw.siteId || '',
    };
}

export const TileMasonPortal: React.FC = () => {
    const { currentUser, sites, advances, logout } = useApp();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'work' | 'payments'>('work');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [roomError, setRoomError] = useState('');
    const [masonAdvances, setMasonAdvances] = useState<any[]>([]);

    // Image modal
    const [imageModal, setImageModal] = useState<string | null>(null);
    // Shortage modal
    const [shortageModal, setShortageModal] = useState<Room | null>(null);
    const [shortageTileId, setShortageTileId] = useState('');
    const [shortagePieces, setShortagePieces] = useState('');
    const [shortageOtherItem, setShortageOtherItem] = useState('');

    const siteId = (currentUser as any)?.siteId || '';
    const siteName = sites.find(s => s.id === siteId)?.name || 'Your Site';

    // Load rooms from DB
    useEffect(() => {
        if (!siteId) {
            setLoadingRooms(false);
            setRoomError('No site assigned. Please contact your admin.');
            return;
        }
        setLoadingRooms(true);
        fetchTileRooms(siteId)
            .then(data => {
                setRooms(data.map(mapDbRoom));
                setRoomError('');
            })
            .catch(() => setRoomError('Failed to load rooms. Please refresh.'))
            .finally(() => setLoadingRooms(false));
    }, [siteId]);

    // Load advances for payments tab
    useEffect(() => {
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        const startStr = sixMonthsAgo.toISOString().split('T')[0];
        const endStr = today.toISOString().split('T')[0];
        fetchAdvances(startStr, endStr)
            .then(data => setMasonAdvances(data || []))
            .catch(() => {});
    }, []);

    // Derived stats
    const totalOverallTiles = rooms.reduce((a, r) => a + (r.totalTiles || 0), 0);
    const totalOverallCompleted = rooms.reduce((a, r) => a + (r.completedTiles || 0), 0);
    const overallProgress = totalOverallTiles > 0 ? Math.round((totalOverallCompleted / totalOverallTiles) * 100) : 0;

    // Payments
    const workerRatePerSqft = 22; // default, could be configurable
    const completedSqft = rooms.reduce((acc, r) => {
        const progress = r.totalTiles > 0 ? r.completedTiles / r.totalTiles : 0;
        return acc + (parseFloat(r.area || '0') * progress);
    }, 0);
    const totalEarned = Math.round(completedSqft * workerRatePerSqft);
    const totalPaid = masonAdvances.reduce((a, p) => a + (p.amount || 0), 0);
    const balance = totalEarned - totalPaid;

    // Shortage handlers
    const handleOpenShortage = (room: Room) => {
        setShortageModal(room);
        setShortageTileId('');
        setShortagePieces('');
        setShortageOtherItem('');
    };

    const handleReportShortage = () => {
        if (!shortageTileId) return alert('Please select a tile or material.');
        if (!shortagePieces) return alert('Please enter the quantity.');
        let reportMsg = '';
        if (shortageTileId === 'other') {
            if (!shortageOtherItem) return alert('Please specify the material name.');
            reportMsg = `${shortagePieces} of ${shortageOtherItem}`;
        } else {
            const selectedTile = shortageModal?.tiles.find(t => t.id.toString() === shortageTileId);
            if (!selectedTile) return;
            const calcArea = (parseFloat(shortagePieces) * selectedTile.sqftPerPiece).toFixed(2);
            reportMsg = `${shortagePieces} pieces of ${selectedTile.name} (${calcArea} sq.ft)`;
        }
        alert(`Shortage reported for ${shortageModal?.name}:\n\n${reportMsg}\n\nSite Engineer has been notified.`);
        setShortageModal(null);
    };

    const selectedTileObj = shortageTileId && shortageTileId !== 'other'
        ? shortageModal?.tiles.find(t => t.id.toString() === shortageTileId)
        : null;
    const calculatedSqft = selectedTileObj && shortagePieces
        ? (parseFloat(shortagePieces) * selectedTileObj.sqftPerPiece).toFixed(2)
        : '0';

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", background: '#f1f5f9', minHeight: '100vh', maxWidth: 430, margin: '0 auto', color: '#0f172a', position: 'relative' }}>
            
            {/* HEADER */}
            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '20px 20px 24px', color: '#fff', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <h1 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800 }}>{siteName}</h1>
                        <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>
                            👷 {currentUser?.name} &nbsp;•&nbsp; Tile Mason
                        </p>
                    </div>
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#cbd5e1', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                        Logout
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 4 }}>
                    {(['work', 'payments'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: activeTab === tab ? '#fff' : 'transparent', color: activeTab === tab ? '#0f172a' : '#cbd5e1', fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            {tab === 'work' ? '📋 Site Work' : '₹ Payments'}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ padding: '20px 16px 60px' }}>

                {/* ---- SITE WORK TAB ---- */}
                {activeTab === 'work' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Assigned Rooms</h2>
                            <Badge
                                text={`Progress: ${overallProgress}%`}
                                color={overallProgress === 100 ? 'green' : 'blue'}
                            />
                        </div>

                        {loadingRooms && (
                            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                                Loading rooms...
                            </div>
                        )}

                        {roomError && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>
                                {roomError}
                            </div>
                        )}

                        {!loadingRooms && !roomError && rooms.length === 0 && (
                            <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ fontSize: 36, marginBottom: 8 }}>🏠</div>
                                <p style={{ margin: 0, fontWeight: 700 }}>No rooms assigned yet.</p>
                                <p style={{ margin: '4px 0 0', fontSize: 13 }}>Your engineer will assign rooms soon.</p>
                            </div>
                        )}

                        {rooms.map(room => {
                            const progressPercent = room.totalTiles > 0 ? Math.round((room.completedTiles / room.totalTiles) * 100) : 0;
                            const isComplete = room.completedTiles >= room.totalTiles && room.totalTiles > 0;

                            return (
                                <div key={room.id} style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: isComplete ? '2px solid #10b981' : '1px solid #e2e8f0' }}>
                                    
                                    {/* Room header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{room.name}</h3>
                                            {isComplete && <span>✅</span>}
                                        </div>
                                        <div style={{ textAlign: 'right', background: '#f8fafc', padding: '6px 10px', borderRadius: 8 }}>
                                            <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700 }}>ROOM AREA</p>
                                            <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 800 }}>{parseFloat(room.area || '0').toFixed(1)} sq.ft</p>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div style={{ marginBottom: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <Label style={{ margin: 0 }}>Work Progress</Label>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: isComplete ? '#10b981' : '#6366f1' }}>
                                                {room.completedTiles} / {room.totalTiles} Tiles ({progressPercent}%)
                                            </span>
                                        </div>
                                        <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: isComplete ? '#10b981' : 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${progressPercent}%`, transition: 'width 0.4s ease' }} />
                                        </div>
                                    </div>

                                    {/* Tile specs */}
                                    {room.tiles && room.tiles.length > 0 && (
                                        <div style={{ marginBottom: 14 }}>
                                            <Label>Required Tiles</Label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {room.tiles.map((tile, idx) => (
                                                    <div key={tile.id ?? idx} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ flex: 1, paddingRight: 8 }}>
                                                            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{tile.name}</p>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <Badge text={tile.type} color="purple" />
                                                                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{tile.size}</span>
                                                            </div>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>{tile.sqftPerPiece} sq.ft/pc</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Engineer notes */}
                                    {room.instructions && (
                                        <div style={{ background: '#fffbeb', borderLeft: '3px solid #f59e0b', padding: '10px 12px', borderRadius: '0 8px 8px 0', marginBottom: 14 }}>
                                            <p style={{ margin: '0 0 4px', fontSize: 11, color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>📝 Engineer Notes</p>
                                            <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>{room.instructions}</p>
                                        </div>
                                    )}

                                    {/* Reference photos */}
                                    {room.photos && room.photos.length > 0 && (
                                        <div style={{ marginBottom: 14 }}>
                                            <Label>Mockup & Reference Photos</Label>
                                            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                                                {room.photos.map((url, idx) => (
                                                    <div key={idx} onClick={() => setImageModal(url)} style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '1px solid #e2e8f0' }}>
                                                        <img src={url} alt="Reference" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Report shortage button */}
                                    <div style={{ paddingTop: 14, borderTop: '1px dashed #e2e8f0' }}>
                                        <button
                                            onClick={() => handleOpenShortage(room)}
                                            style={{ width: '100%', padding: 12, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                        >
                                            ⚠️ Report Material Shortage
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}

                {/* ---- PAYMENTS TAB ---- */}
                {activeTab === 'payments' && (
                    <>
                        {/* Ledger summary card */}
                        <div style={{ background: 'linear-gradient(135deg,#4f46e5,#3b82f6)', borderRadius: 16, padding: 20, color: '#fff', marginBottom: 20, boxShadow: '0 8px 20px rgba(59,130,246,0.25)' }}>
                            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                                TOTAL EARNED ({completedSqft.toFixed(0)} sq.ft @ ₹{workerRatePerSqft}/sq.ft)
                            </p>
                            <h2 style={{ margin: '0 0 20px', fontSize: 28, fontWeight: 800 }}>₹{totalEarned.toLocaleString()}</h2>

                            <div style={{ display: 'flex', gap: 16, background: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>ADVANCES PAID</p>
                                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#6ee7b7' }}>₹{totalPaid.toLocaleString()}</p>
                                </div>
                                <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>BALANCE DUE</p>
                                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: balance < 0 ? '#fca5a5' : '#fff' }}>
                                        ₹{Math.abs(balance).toLocaleString()} {balance < 0 ? '(overpaid)' : ''}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Room progress for payment reference */}
                        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid #e2e8f0' }}>
                            <Label>Work Completion by Room</Label>
                            {rooms.length === 0 && <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No room data yet.</p>}
                            {rooms.map(room => {
                                const pct = room.totalTiles > 0 ? Math.round((room.completedTiles / room.totalTiles) * 100) : 0;
                                const sqft = (parseFloat(room.area || '0') * pct / 100).toFixed(1);
                                return (
                                    <div key={room.id} style={{ marginBottom: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: 13, fontWeight: 700 }}>{room.name}</span>
                                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{sqft} sq.ft ({pct}%)</span>
                                        </div>
                                        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: pct === 100 ? '#10b981' : '#6366f1', width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800 }}>Advance History</h2>

                        {masonAdvances.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>No advance payments recorded.</p>
                        ) : (
                            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                {masonAdvances.map((pay, idx) => (
                                    <div key={pay.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottom: idx !== masonAdvances.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💵</div>
                                            <div>
                                                <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800 }}>Advance</p>
                                                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{pay.date} {pay.notes ? `• ${pay.notes}` : ''}</p>
                                            </div>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#10b981' }}>+₹{(pay.amount || 0).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ---- MODALS ---- */}

            {/* Fullscreen image */}
            {imageModal && (
                <div onClick={() => setImageModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <img src={imageModal} alt="Reference" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain' }} />
                    <p style={{ color: '#fff', marginTop: 16, fontSize: 14, fontWeight: 600 }}>Tap anywhere to close</p>
                </div>
            )}

            {/* Shortage modal */}
            {shortageModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: 430, borderRadius: '24px 24px 0 0', padding: 24, boxSizing: 'border-box', animation: 'slideUp 0.3s ease-out' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ef4444' }}>Report Material Shortage</h2>
                            <button onClick={() => setShortageModal(null)} style={{ background: 'transparent', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                        </div>

                        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
                            Notifying engineer for room: <strong style={{ color: '#0f172a' }}>{shortageModal.name}</strong>
                        </p>

                        <div style={{ marginBottom: 16 }}>
                            <Label>Select Material</Label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={shortageTileId}
                                    onChange={e => setShortageTileId(e.target.value)}
                                    style={{ width: '100%', padding: 14, borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none', background: '#f8fafc', color: '#0f172a', appearance: 'none' }}
                                >
                                    <option value="" disabled>Select tile or material...</option>
                                    {shortageModal.tiles.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                                    ))}
                                    <option value="other">Other Material (Cement, Spacer, etc.)</option>
                                </select>
                                <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 12 }}>▼</div>
                            </div>
                        </div>

                        {shortageTileId === 'other' && (
                            <div style={{ marginBottom: 16 }}>
                                <Label>Specify Material Name</Label>
                                <input
                                    type="text" value={shortageOtherItem} onChange={e => setShortageOtherItem(e.target.value)}
                                    placeholder="e.g. White Epoxy Grout"
                                    style={{ width: '100%', boxSizing: 'border-box', padding: 14, borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none' }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                            <div style={{ flex: 1 }}>
                                <Label>{shortageTileId === 'other' ? 'Quantity' : 'No. of Pieces'}</Label>
                                <input
                                    type={shortageTileId === 'other' ? 'text' : 'number'}
                                    value={shortagePieces} onChange={e => setShortagePieces(e.target.value)}
                                    placeholder={shortageTileId === 'other' ? 'e.g. 2 bags' : 'e.g. 5'}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: 14, borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none' }}
                                />
                            </div>
                            {selectedTileObj && (
                                <div style={{ flex: 1, background: '#eef2ff', borderRadius: 12, padding: 12, border: '1px solid #c7d2fe', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <p style={{ margin: '0 0 2px', fontSize: 10, color: '#6366f1', fontWeight: 800 }}>EQUIVALENT AREA</p>
                                    <p style={{ margin: 0, fontSize: 18, color: '#4f46e5', fontWeight: 800 }}>{calculatedSqft} <span style={{ fontSize: 12, fontWeight: 600 }}>sq.ft</span></p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleReportShortage}
                            style={{ width: '100%', padding: 16, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer' }}
                        >
                            🚀 Send Shortage Report
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                * { -webkit-tap-highlight-color: transparent; }
            `}</style>
        </div>
    );
};
