import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
    fetchTileRooms, 
    fetchTileRoom,
    updateTileRoom 
} from '../services/apiService';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

/**
 * TILE MASON PORTAL
 * Uses:
 * GET /api/planner?resource=mason-rooms&worker_id=... (List View)
 * GET /api/planner?resource=mason-rooms&worker_id=...&id=... (Detail View)
 * GET /api/planner?resource=mason-payments&worker_id=...
 * POST /api/planner?resource=shortage
 * POST /api/planner?resource=mason-progress
 */

export const TileMasonPortal: React.FC = () => {
    const { currentUser, sites, logout } = useApp();
    const navigate = useNavigate();

    const [tab, setTab] = useState<'work' | 'pay'>('work');
    
    // List View State
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Detail View State
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [roomDetails, setRoomDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Payments State
    const [payments, setPayments] = useState<any[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

    // Shortage State
    const [shortageOpen, setShortageOpen] = useState(false);
    const [shortageData, setShortageData] = useState({ tile_master_id: '', requested_qty: '', note: '' });

    // Progress State
    const [progressOpen, setProgressOpen] = useState(false);
    const [progressData, setProgressData] = useState({ verified_sqft: '', note: '' });

    const workerId = currentUser?.id;

    useEffect(() => {
        if (tab === 'work' && !activeRoomId) fetchAssignments();
        if (tab === 'pay') fetchPayments();
    }, [tab, workerId]);

    useEffect(() => {
        if (activeRoomId) fetchRoomDetails(activeRoomId);
    }, [activeRoomId]);

    const fetchAssignments = async () => {
        if (!workerId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/planner?resource=mason-rooms&worker_id=${workerId}`);
            if (res.ok) setAssignments(await res.json());
            else throw new Error('Failed to load');
        } catch (e) {
            setError('Could not load assigned rooms.');
        } finally {
            setLoading(false);
        }
    };

    const fetchRoomDetails = async (roomId: string) => {
        if (!workerId) return;
        setLoadingDetails(true);
        try {
            const res = await fetch(`/api/planner?resource=mason-rooms&worker_id=${workerId}&id=${roomId}`);
            if (res.ok) setRoomDetails(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDetails(false);
        }
    };

    const fetchPayments = async () => {
        if (!workerId) return;
        setLoadingPayments(true);
        try {
            const res = await fetch(`/api/planner?resource=mason-payments&worker_id=${workerId}`);
            if (res.ok) setPayments(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingPayments(false);
        }
    };

    const handleShortageSubmit = async () => {
        try {
            const res = await fetch(`/api/planner?resource=shortage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    site_id: roomDetails?.room?.site_id,
                    room_id: activeRoomId,
                    tile_master_id: shortageData.tile_master_id,
                    requested_qty: Number(shortageData.requested_qty),
                    note: shortageData.note,
                    requested_by: workerId
                })
            });
            if (res.ok) {
                alert('Shortage reported successfully.');
                setShortageOpen(false);
            }
        } catch (e) {
            alert('Failed to report shortage.');
        }
    };

    const handleProgressSubmit = async (assignmentId: string) => {
        try {
            const res = await fetch(`/api/planner?resource=mason-progress&id=${assignmentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: format(new Date(), 'yyyy-MM-dd'),
                    verified_sqft: Number(progressData.verified_sqft),
                    note: progressData.note,
                    verified_by: workerId
                })
            });
            if (res.ok) {
                alert('Progress updated!');
                setProgressOpen(false);
                fetchAssignments();
                fetchRoomDetails(activeRoomId!);
            }
        } catch (e) {
            alert('Failed to log progress');
        }
    };

    const activeAssignment = assignments.find(a => String(a.room_id || a.id) === activeRoomId);

    return (
        <div style={{ fontFamily: "'Inter',sans-serif", background: '#f1f5f9', minHeight: '100vh', maxWidth: 430, margin: '0 auto', color: '#0f172a' }}>
            {/* HEADER */}
            <div style={{ background: 'linear-gradient(150deg,#1e293b 0%,#0f172a 100%)', padding: '18px 18px 22px', color: '#fff', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#6366f1,#9333ea)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧱</div>
                        <div>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Tile Mason Portal</p>
                            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{currentUser?.name}</p>
                        </div>
                    </div>
                    <button onClick={() => { logout(); navigate('/login'); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Logout</button>
                </div>
            </div>

            <div style={{ padding: '16px 14px 100px' }}>
                {/* === WORK TAB === */}
                {tab === 'work' && !activeRoomId && (
                    <>
                        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Assigned Rooms</h2>
                        {loading ? <p>Loading...</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {assignments.map(a => (
                                    <div 
                                        key={a.id} 
                                        onClick={() => setActiveRoomId(String(a.room_id || a.id))}
                                        style={{ background: '#fff', padding: 16, borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <p style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>{a.name}</p>
                                            <span style={{ fontSize: 12, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>{a.surface_type}</span>
                                        </div>
                                        <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                                            <div>
                                                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Assigned Sqft</p>
                                                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{a.contracted_sqft}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Completed</p>
                                                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#10b981' }}>{a.completed_sqft}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* === ACTIVE ROOM DETAIL === */}
                {tab === 'work' && activeRoomId && (
                    <>
                        <button onClick={() => setActiveRoomId(null)} style={{ background: 'transparent', border: 'none', color: '#6366f1', fontWeight: 700, padding: 0, marginBottom: 16, cursor: 'pointer' }}>
                            ← Back to Rooms
                        </button>

                        {loadingDetails ? <p>Loading room specs...</p> : roomDetails && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ background: '#fff', padding: 20, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                                    <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 900 }}>{roomDetails.room.name}</h2>
                                    
                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginBottom: 16 }}>
                                        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Tiles Required</p>
                                        {roomDetails.requirements.map((req: any) => (
                                            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{req.brand} - {req.size_label}</p>
                                                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{req.material_name}</p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ margin: 0, fontWeight: 900, color: '#4f46e5' }}>{req.required_qty} pcs</p>
                                                    {(req.required_qty - req.received_qty) > 0 && (
                                                        <p style={{ margin: 0, fontSize: 10, color: '#ef4444', fontWeight: 700 }}>Short: {req.required_qty - req.received_qty} pcs</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => setShortageOpen(true)} style={{ flex: 1, padding: 12, background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>⚠️ Report Shortage</button>
                                        <button onClick={() => setProgressOpen(true)} style={{ flex: 1, padding: 12, background: '#ecfdf5', color: '#10b981', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>✅ Log Progress</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* === PAYMENTS TAB === */}
                {tab === 'pay' && (
                    <>
                        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Payment History</h2>
                        {loadingPayments ? <p>Loading...</p> : (
                            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                {payments.length === 0 ? <p style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No payments found.</p> : payments.map((p, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 700 }}>{format(new Date(p.date), 'dd MMM yyyy')}</p>
                                            <p style={{ margin: 0, fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{p.type.replace('_', ' ')} {p.note && ` - ${p.note}`}</p>
                                        </div>
                                        <p style={{ margin: 0, fontWeight: 800, color: '#10b981', fontSize: 16 }}>+ ₹{p.amount}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* BOTTOM NAV */}
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
                {[
                    { key: 'work', icon: '📋', label: 'Site Work' },
                    { key: 'pay', icon: '₹', label: 'Payments' },
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => { setTab(t.key as any); setActiveRoomId(null); }}
                        style={{ flex: 1, padding: '13px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: tab === t.key ? '#6366f1' : '#94a3b8', borderTop: `2.5px solid ${tab === t.key ? '#6366f1' : 'transparent'}` }}
                    >
                        <span style={{ fontSize: 22 }}>{t.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 800 }}>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* MODALS */}
            {shortageOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
                    <div style={{ background: '#fff', padding: 24, borderRadius: 20, width: '100%' }}>
                        <h3 style={{ margin: '0 0 16px' }}>Report Shortage</h3>
                        <select style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} onChange={e => setShortageData({...shortageData, tile_master_id: e.target.value})}>
                            <option value="">Select Tile...</option>
                            {roomDetails?.requirements.map((req: any) => (
                                <option key={req.tile_master_id} value={req.tile_master_id}>{req.brand} - {req.size_label}</option>
                            ))}
                        </select>
                        <input type="number" placeholder="Missing Qty (pcs)" style={{ width: '100%', boxSizing: 'border-box', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} onChange={e => setShortageData({...shortageData, requested_qty: e.target.value})} />
                        <input type="text" placeholder="Notes (optional)" style={{ width: '100%', boxSizing: 'border-box', padding: 12, marginBottom: 16, borderRadius: 8, border: '1px solid #e2e8f0' }} onChange={e => setShortageData({...shortageData, note: e.target.value})} />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setShortageOpen(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff' }}>Cancel</button>
                            <button onClick={handleShortageSubmit} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700 }}>Submit Alert</button>
                        </div>
                    </div>
                </div>
            )}

            {progressOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
                    <div style={{ background: '#fff', padding: 24, borderRadius: 20, width: '100%' }}>
                        <h3 style={{ margin: '0 0 16px' }}>Log Completed Area</h3>
                        <input type="number" placeholder="Sqft Completed Today" style={{ width: '100%', boxSizing: 'border-box', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} onChange={e => setProgressData({...progressData, verified_sqft: e.target.value})} />
                        <input type="text" placeholder="Notes (optional)" style={{ width: '100%', boxSizing: 'border-box', padding: 12, marginBottom: 16, borderRadius: 8, border: '1px solid #e2e8f0' }} onChange={e => setProgressData({...progressData, note: e.target.value})} />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setProgressOpen(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff' }}>Cancel</button>
                            <button onClick={() => handleProgressSubmit(activeAssignment?.id)} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700 }}>Save Progress</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
