import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import * as api from '../../services/apiService';
import { InteractiveTilePlanner, PlannerSaveData } from './InteractiveTilePlanner';

// --- Types ---
interface TileSize {
    label: string;
    sqft: number;
}

interface Deduction {
    id: number;
    name: string;
    length: string;
    width: string;
    perimeterDeduct: string;
}

interface Addition {
    id: number;
    name: string;
    length: string;
    width: string;
    perimeterAdd: string;
}

interface PhotoItem {
    id: number;
    url: string;
}

interface Room {
    id: number;
    name: string;
    tileName: string;
    tileSize: string;
    customTileLength: string;
    customTileWidth: string;
    customTileUnit: 'feet' | 'inches' | 'mm';
    length: string;
    width: string;
    hasSkirting: boolean;
    skirtingHeight: string;
    doors: string;
    doorWidth: string;
    deductions: Deduction[];
    additions: Addition[];
    totalArea: string;
    floorArea: string;
    skirtingArea: string;
    totalDeductedArea: string;
    totalAddedArea: string;
    wastage: string;
    reqQty: string;
    instructions: string;
    photos: PhotoItem[];
    surfaceType?: string;
    entrance?: 'top' | 'bottom' | 'left' | 'right';
    floor?: string;
    gridData?: any;
    tilesConfig?: any;
    shortageReports?: any[];
}

// --- Constants ---
const TILE_SIZES: TileSize[] = [
    { label: 'Select Tile Size...', sqft: 0 },
    { label: '600x600 mm (2x2 ft)', sqft: 4 },
    { label: '600x1200 mm (2x4 ft)', sqft: 8 },
    { label: '800x800 mm (32x32 in)', sqft: 7.11 },
    { label: '800x1600 mm (32x64 in)', sqft: 14.22 },
    { label: '1200x1200 mm (4x4 ft)', sqft: 16 },
    { label: 'Custom / Other', sqft: 0 },
];

// --- Reusable UI Components ---
const FieldLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
    children,
    style,
}) => (
    <p
        style={{
            margin: '0 0 6px',
            fontSize: 11,
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            ...style,
        }}
    >
        {children}
    </p>
);

const TileInput: React.FC<
    React.InputHTMLAttributes<HTMLInputElement> & { style?: React.CSSProperties }
> = ({ type = 'text', onFocus, onBlur, style, ...rest }) => (
    <input
        type={type}
        {...rest}
        style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1.5px solid #e2e8f0',
            fontSize: 14,
            color: '#0f172a',
            background: '#f8fafc',
            outline: 'none',
            transition: 'border-color 0.2s',
            ...style,
        }}
        onFocus={(e) => {
            e.target.style.borderColor = '#6366f1';
            onFocus?.(e);
        }}
        onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0';
            onBlur?.(e);
        }}
    />
);

// --- Photo Uploader Component ---
const MockupPhotos: React.FC<{
    photos: PhotoItem[];
    onChange: (photos: PhotoItem[]) => void;
}> = ({ photos, onChange }) => {
    const [preview, setPreview] = useState<string | null>(null);

    const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                onChange([...(photos || []), { id: Date.now() + Math.random(), url: result }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const removePhoto = (id: number) =>
        onChange((photos || []).filter((p) => p.id !== id));

    return (
        <>
            {preview && (
                <div
                    onClick={() => setPreview(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15,23,42,0.9)',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                    }}
                >
                    <img
                        src={preview}
                        alt="Preview"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '80vh',
                            borderRadius: 12,
                            objectFit: 'contain',
                        }}
                    />
                    <p style={{ color: '#fff', marginTop: 16, fontSize: 14, fontWeight: 600 }}>
                        Tap anywhere to close
                    </p>
                </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                {(photos || []).map((p) => (
                    <div key={p.id} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                        <img
                            src={p.url}
                            alt="Mockup"
                            onClick={() => setPreview(p.url)}
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: 10,
                                objectFit: 'cover',
                                border: '2px solid #e2e8f0',
                                cursor: 'pointer',
                            }}
                        />
                        <button
                            onClick={() => removePhoto(p.id)}
                            style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: '#ef4444',
                                border: '2px solid #fff',
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            ✕
                        </button>
                    </div>
                ))}

                <label
                    style={{
                        width: 80,
                        height: 80,
                        borderRadius: 10,
                        border: '2px dashed #c7d2fe',
                        background: '#eef2ff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#6366f1',
                        flexShrink: 0,
                    }}
                >
                    <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
                    <span style={{ fontSize: 10, fontWeight: 700, marginTop: 4 }}>Add Photo</span>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAdd}
                        style={{ display: 'none' }}
                    />
                </label>
            </div>
        </>
    );
};

// --- Calculation Logic ---
function calculateReq(data: Partial<Room>): Partial<Room> {
    const l = parseFloat(data.length || '0') || 0;
    const w = parseFloat(data.width || '0') || 0;
    const baseFloorArea = l * w;

    let totalDeductionArea = 0;
    let totalPerimeterDeduction = 0;
    (data.deductions || []).forEach((d) => {
        totalDeductionArea +=
            (parseFloat(d.length) || 0) * (parseFloat(d.width) || 0);
        totalPerimeterDeduction += parseFloat(d.perimeterDeduct) || 0;
    });

    let totalAdditionArea = 0;
    let totalPerimeterAddition = 0;
    (data.additions || []).forEach((a) => {
        totalAdditionArea +=
            (parseFloat(a.length) || 0) * (parseFloat(a.width) || 0);
        totalPerimeterAddition += parseFloat(a.perimeterAdd) || 0;
    });

    const netFloorArea =
        Math.max(0, baseFloorArea - totalDeductionArea) + totalAdditionArea;

    let skirtingArea = 0;
    if (data.hasSkirting) {
        const perimeter = 2 * (l + w);
        const doors = parseFloat(data.doors || '0') || 0;
        const doorW = parseFloat(data.doorWidth || '0') || 0;
        const netPerimeter = Math.max(
            0,
            perimeter - doors * doorW - totalPerimeterDeduction + totalPerimeterAddition
        );
        const skHeightFt = (parseFloat(data.skirtingHeight || '0') || 0) / 12;
        skirtingArea = netPerimeter * skHeightFt;
    }

    const totalArea = netFloorArea + skirtingArea;

    let tileSqft = 1;
    const selectedTile = TILE_SIZES.find((t) => t.label === data.tileSize);
    if (selectedTile && selectedTile.sqft > 0) {
        tileSqft = selectedTile.sqft;
    } else if (data.tileSize === 'Custom / Other') {
        const cL = parseFloat(data.customTileLength || '0') || 0;
        const cW = parseFloat(data.customTileWidth || '0') || 0;
        const unit = data.customTileUnit || 'feet';
        if (unit === 'mm') {
            tileSqft = (cL * cW) / 92903.04;
        } else if (unit === 'inches') {
            tileSqft = (cL * cW) / 144;
        } else {
            tileSqft = cL * cW;
        }
        if (tileSqft === 0) tileSqft = 1;
    }

    const netTiles = totalArea / tileSqft;
    const wastageMultiplier = 1 + (parseFloat(data.wastage || '0') || 0) / 100;
    const totalTiles = Math.ceil(netTiles * wastageMultiplier);

    return {
        floorArea: netFloorArea.toFixed(1),
        skirtingArea: skirtingArea.toFixed(2),
        totalDeductedArea: totalDeductionArea.toFixed(1),
        totalAddedArea: totalAdditionArea.toFixed(1),
        totalArea: totalArea.toFixed(1),
        reqQty: totalArea > 0 ? totalTiles.toString() : '',
    };
}

const DEFAULT_NEW_ROOM: Omit<Room, 'id'> = {
    name: '',
    tileName: '',
    tileSize: 'Select Tile Size...',
    customTileLength: '',
    customTileWidth: '',
    customTileUnit: 'feet',
    length: '',
    width: '',
    hasSkirting: true,
    skirtingHeight: '4',
    doors: '1',
    doorWidth: '3',
    deductions: [],
    additions: [],
    totalArea: '0',
    floorArea: '0',
    skirtingArea: '0',
    totalDeductedArea: '0',
    totalAddedArea: '0',
    wastage: '0',
    reqQty: '',
    floor: '',
    instructions: '',
    photos: [],
};

// --- New EdgeBar layout ---
function EdgeBar({ edge, entrance, cols, rows, cellPx, groutPx }: any) {
    const isEntrance = entrance === edge;
    const isHoriz = edge === "top" || edge === "bottom";
    const count = isHoriz ? cols : rows;
    const size = cellPx * (count || 1) + groutPx * ((count || 1) - 1);

    if (isHoriz) {
        return (
            <div style={{
                width: size + 4,
                height: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: edge === "top" ? "8px 8px 0 0" : "0 0 8px 8px",
                background: isEntrance ? "#eef2ff" : "transparent",
                border: isEntrance ? "1.5px solid #c7d2fe" : "none",
                borderBottom: edge === "top" ? "none" : undefined,
                borderTop: edge === "bottom" ? "none" : undefined,
                marginBottom: edge === "top" ? 0 : undefined,
                marginTop: edge === "bottom" ? 0 : undefined,
            }}>
                {isEntrance ? (
                    <span style={{ fontSize: 11, fontWeight: 900, color: "#6366f1", display: "flex", alignItems: "center", gap: 4 }}>
                        {edge === "top" ? "↑" : "↓"} <span>ENTRANCE</span>
                    </span>
                ) : (
                    <span style={{ fontSize: 10, color: "#d1d5db", fontWeight: 600 }}>
                        {edge === "top" ? "↑" : "↓"}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div style={{
            width: 22,
            height: size + 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: edge === "left" ? "8px 0 0 8px" : "0 8px 8px 0",
            background: isEntrance ? "#eef2ff" : "transparent",
            border: isEntrance ? "1.5px solid #c7d2fe" : "none",
            borderRight: edge === "left" ? "none" : undefined,
            borderLeft: edge === "right" ? "none" : undefined,
        }}>
            {isEntrance ? (
                <span style={{ fontSize: 10, fontWeight: 900, color: "#6366f1", writingMode: "vertical-rl", textOrientation: "mixed", display: "flex", alignItems: "center", gap: 3, letterSpacing: "0.04em" }}>
                    {edge === "left" ? "←" : "→"} ENTRANCE
                </span>
            ) : (
                <span style={{ fontSize: 10, color: "#d1d5db", fontWeight: 600 }}>
                    {edge === "left" ? "←" : "→"}
                </span>
            )}
        </div>
    );
}

// --- Main Page Component ---
export const TileCalculator: React.FC = () => {
    const { sites } = useApp();
    const [view, setView] = useState<'dashboard' | 'editRoom' | 'roomDetail'>('dashboard');
    const [downloadModalVisible, setDownloadModalVisible] = useState(false);
    const [selectedRoomsToDownload, setSelectedRoomsToDownload] = useState<number[]>([]);

    const [selectedSiteId, setSelectedSiteId] = useState<string>(() => sites[0]?.id || '');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const selectedSite = sites.find((s) => s.id === selectedSiteId);

    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [plannerError, setPlannerError] = useState<string>('');

    // Load rooms from API when site changes
    const loadRooms = useCallback(async (siteId: string) => {
        if (!siteId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.fetchTileRooms(siteId);
            // Map DB field id (string) to numeric id for local state compatibility
            const mappedRooms = data.map((r: any) => ({ ...r, id: r.id }));
            setRooms(mappedRooms);

            if (mappedRooms.length > 0) {
                const uniqueFloors = [...new Set(mappedRooms.map((r: Room) => r.floor?.trim() || 'Unassigned'))] as string[];
                if (!selectedFloor || !uniqueFloors.includes(selectedFloor)) {
                    setSelectedFloor(uniqueFloors[0]);
                }
            }
        } catch (err: any) {
            setError('Failed to load rooms: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedSiteId) loadRooms(selectedSiteId);
        else setRooms([]);
    }, [selectedSiteId, loadRooms]);

    // Auto-select first site when sites load async from context
    useEffect(() => {
        if (!selectedSiteId && sites.length > 0) {
            setSelectedSiteId(sites[0].id);
        }
    }, [sites, selectedSiteId]);

    // --- Handlers ---
    const handleAddNewRoom = () => {
        setEditingRoom({ id: Date.now(), ...DEFAULT_NEW_ROOM });
        setView('editRoom');
    };

    const handleViewRoom = async (room: Room) => {
        // Show detail immediately with no photos, then lazy-load full room
        setViewingRoom({ ...room, photos: [] });
        setView('roomDetail');
        setLoadingDetail(true);
        try {
            const full = await api.fetchTileRoom(String(room.id));
            setViewingRoom(full);
        } catch {
            // keep showing the room without photos
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleEditRoom = (room: Room) => {
        setEditingRoom({
            ...room,
            deductions: room.deductions || [],
            additions: room.additions || [],
            customTileUnit: room.customTileUnit || 'feet',
        });
        setView('editRoom');
    };

    const handleDeleteRoom = async (id: number | string) => {
        if (!window.confirm('Delete this room setup?')) return;
        setSaving(true);
        try {
            await api.deleteTileRoom(String(id));
            setRooms((prev) => prev.filter((r) => r.id !== id));
        } catch (err: any) {
            alert('Failed to delete room: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRoom = async () => {
        if (!editingRoom) return;
        if (!editingRoom.name) return alert('Please enter a room name');
        if (!editingRoom.tileSize || editingRoom.tileSize === 'Select Tile Size...')
            return alert('Please select a tile size');

        setSaving(true);
        try {
            const isNew = !rooms.find((r) => r.id === editingRoom.id);
            const roomPayload = { ...editingRoom, siteId: selectedSiteId };

            if (isNew) {
                const saved = await api.createTileRoom(roomPayload);
                setRooms((prev) => [...prev, { ...saved, id: saved.id }]);
            } else {
                const saved = await api.updateTileRoom(String(editingRoom.id), roomPayload);
                setRooms((prev) => prev.map((r) => (r.id === editingRoom.id ? { ...saved, id: saved.id } : r)));
            }
            setView('dashboard');
        } catch (err: any) {
            alert('Failed to save room: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // --- Planner Save Handler ---
    const handleSavePlannerRoom = async (data: PlannerSaveData) => {
        setPlannerError('');
        console.log('[Planner Save] called, editingRoom:', editingRoom, 'selectedSiteId:', selectedSiteId);
        if (!editingRoom) {
            console.error('[Planner Save] editingRoom is null!');
            return;
        }
        if (!selectedSiteId) {
            const msg = 'No site selected. Please go back, select a site, then try again.';
            setPlannerError(msg);
            return;
        }
        setSaving(true);
        try {
            // A room is "new" if it doesn't exist in the rooms list yet
            const existingRoom = rooms.find((r) => r.id === editingRoom.id);
            const isNew = !existingRoom;
            console.log('[Planner Save] isNew:', isNew, 'rooms count:', rooms.length);

            const roomPayload = {
                siteId: selectedSiteId,
                name: data.name,
                tileName: 'Multi-type (Planner)',
                tileSize: data.tilesConfig.tile1.size,
                length: String(data.length),
                width: String(data.width),
                hasSkirting: data.skirting.enabled,
                skirtingHeight: data.skirting.height,
                doors: data.skirting.doors,
                doorWidth: data.skirting.doorWidth,
                floorArea: String(data.floorArea),
                skirtingArea: String(data.skirtingArea),
                totalArea: String(data.totalArea),
                totalDeductedArea: '0',
                totalAddedArea: '0',
                wastage: String(data.tilesConfig.tile1.wastage),
                reqQty: String(data.reqQty),
                deductions: [],
                additions: [],
                instructions: '',
                photos: [],
                // New planner-specific fields
                floor: data.floor,
                surfaceType: data.surfaceType,
                entrance: data.entrance,
                gridData: data.grid,
                tilesConfig: data.tilesConfig,
                skirting: data.skirting,
            };

            console.log('[Planner Save] payload:', JSON.stringify(roomPayload).slice(0, 200));

            if (isNew) {
                const saved = await api.createTileRoom(roomPayload);
                console.log('[Planner Save] created:', saved);
                setRooms((prev) => [...prev, saved]);
            } else {
                const saved = await api.updateTileRoom(String(editingRoom.id), roomPayload);
                console.log('[Planner Save] updated:', saved);
                setRooms((prev) => prev.map((r) => (r.id === editingRoom.id ? saved : r)));
            }
            setView('dashboard');
        } catch (err: any) {
            console.error('[Planner Save] FAILED:', err);
            const msg = 'Failed to save: ' + (err.message || String(err));
            setPlannerError(msg);
        } finally {
            setSaving(false);
        }
    };


    const updateField = <K extends keyof Room>(field: K, value: Room[K]) => {
        if (!editingRoom) return;
        const updated = { ...editingRoom, [field]: value };
        const calc = calculateReq(updated);
        setEditingRoom({ ...updated, ...calc } as Room);
    };

    // --- Deduction Handlers ---
    const addDeduction = () => {
        const newDeductions: Deduction[] = [
            ...(editingRoom?.deductions || []),
            { id: Date.now(), name: '', length: '', width: '', perimeterDeduct: '' },
        ];
        updateField('deductions', newDeductions);
    };

    const updateDeduction = (id: number, field: keyof Deduction, value: string) => {
        if (!editingRoom) return;
        const newDeductions = editingRoom.deductions.map((d) =>
            d.id === id ? { ...d, [field]: value } : d
        );
        updateField('deductions', newDeductions);
    };

    const removeDeduction = (id: number) => {
        if (!editingRoom) return;
        updateField(
            'deductions',
            editingRoom.deductions.filter((d) => d.id !== id)
        );
    };

    // --- Addition Handlers ---
    const addAddition = () => {
        const newAdditions: Addition[] = [
            ...(editingRoom?.additions || []),
            { id: Date.now(), name: '', length: '', width: '', perimeterAdd: '' },
        ];
        updateField('additions', newAdditions);
    };

    const updateAddition = (id: number, field: keyof Addition, value: string) => {
        if (!editingRoom) return;
        const newAdditions = editingRoom.additions.map((a) =>
            a.id === id ? { ...a, [field]: value } : a
        );
        updateField('additions', newAdditions);
    };

    const removeAddition = (id: number) => {
        if (!editingRoom) return;
        updateField(
            'additions',
            editingRoom.additions.filter((a) => a.id !== id)
        );
    };

    // --- PDF Report ---
    const generatePDFReport = () => {
        const siteName = selectedSite?.name || 'Site';
        const selectedRooms = rooms.filter((r) => selectedRoomsToDownload.includes(r.id));
        if (selectedRooms.length === 0) return alert('Please select at least one room');

        let tableRows = '';
        let sNo = 1;

        selectedRooms.forEach((room) => {
            const baseArea = (
                parseFloat(room.length || '0') * parseFloat(room.width || '0')
            ).toFixed(2);

            tableRows += `
        <tr style="background:#f8fafc; font-weight:bold;">
          <td>${sNo++}</td>
          <td>${room.name}</td>
          <td>Sq.ft</td>
          <td>1</td>
          <td>${room.length || 0}</td>
          <td>${room.width || 0}</td>
          <td>${baseArea}</td>
          <td>Floor Area (${room.tileName || 'Tile'})</td>
        </tr>`;

            (room.deductions || []).forEach((d) => {
                const dL = parseFloat(d.length || '0');
                const dW = parseFloat(d.width || '0');
                const dArea = (dL * dW).toFixed(2);
                tableRows += `
          <tr>
            <td></td>
            <td style="padding-left:20px;color:#ef4444;">Less: ${d.name || 'Deduction'}</td>
            <td>Sq.ft</td><td>1</td>
            <td>${dL}</td><td>${dW}</td>
            <td style="color:#ef4444;">-${dArea}</td>
            <td>Untiled Area</td>
          </tr>`;
            });

            (room.additions || []).forEach((a) => {
                const aL = parseFloat(a.length || '0');
                const aW = parseFloat(a.width || '0');
                const aArea = (aL * aW).toFixed(2);
                tableRows += `
          <tr>
            <td></td>
            <td style="padding-left:20px;color:#10b981;">Add: ${a.name || 'Addition'}</td>
            <td>Sq.ft</td><td>1</td>
            <td>${aL}</td><td>${aW}</td>
            <td style="color:#10b981;">${aArea}</td>
            <td>Extra Tiled Area</td>
          </tr>`;
            });

            if (room.hasSkirting && parseFloat(room.skirtingArea || '0') > 0) {
                const heightFt = (parseFloat(room.skirtingHeight || '0') / 12).toFixed(2);
                const perimeter = (
                    parseFloat(room.skirtingArea) / (parseFloat(heightFt) || 1)
                ).toFixed(2);
                tableRows += `
          <tr>
            <td></td>
            <td style="padding-left:20px;">Add: Skirting</td>
            <td>Sq.ft</td><td>1</td>
            <td>${perimeter}</td><td>${heightFt}</td>
            <td>${room.skirtingArea}</td>
            <td>${room.skirtingHeight}" Skirting</td>
          </tr>`;
            }

            tableRows += `
        <tr style="background:#eef2ff;font-weight:bold;">
          <td colspan="6" style="text-align:right;">Net Area for ${room.name}:</td>
          <td style="color:#4f46e5;font-size:16px;">${room.totalArea}</td>
          <td style="color:#4f46e5;">Req: ${room.reqQty} tiles (+${room.wastage}% wastage)</td>
        </tr>`;
        });

        const html = `
      <html>
        <head>
          <title>Tile Calculation Report</title>
          <style>
            body{font-family:'Inter',-apple-system,sans-serif;padding:30px;color:#0f172a}
            h1{text-align:center;font-size:26px;margin-bottom:5px;color:#1e293b}
            p.subtitle{text-align:center;color:#64748b;margin-top:0;margin-bottom:30px;font-size:14px}
            table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px}
            th,td{border:1px solid #cbd5e1;padding:10px 12px;text-align:left}
            th{background-color:#f1f5f9;font-weight:800;text-transform:uppercase;font-size:11px;color:#475569;letter-spacing:.05em}
            @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:landscape}}
          </style>
        </head>
        <body>
          <h1>Tile Calculation Report</h1>
          <p class="subtitle">${siteName} &nbsp;|&nbsp; Generated via Thulir ERP on ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th width="5%">S.No</th>
                <th width="20%">Room Name</th>
                <th width="8%">Unit</th>
                <th width="8%">Similar Qty</th>
                <th width="10%">Length</th>
                <th width="12%">Breadth/Width</th>
                <th width="12%">Area</th>
                <th width="25%">Remarks</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 300);
        } else {
            alert('Please allow popups to generate the PDF report.');
        }

        setDownloadModalVisible(false);
    };

    const totalArea = rooms.reduce((acc, r) => acc + (parseFloat(r.totalArea) || 0), 0);

    // =====================================================================
    // DASHBOARD VIEW
    // =====================================================================
    if (view === 'dashboard') {
        return (
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Tile Calculator</h1>
                        <p className="text-sm text-gray-500 mt-1">Room-wise tile requirement setup & PDF report</p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Site Selector */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Site</label>
                            <select
                                value={selectedSiteId}
                                onChange={(e) => {
                                    setSelectedSiteId(e.target.value);
                                    setView('dashboard');
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[180px]"
                            >
                                {sites.length === 0 && (
                                    <option value="">No sites found</option>
                                )}
                                {sites.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 self-end">
                            <button
                                onClick={() => {
                                    setSelectedRoomsToDownload(rooms.map((r) => r.id));
                                    setDownloadModalVisible(true);
                                }}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                disabled={rooms.length === 0}
                            >
                                Report
                            </button>
                            <button
                                onClick={handleAddNewRoom}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-2"
                                disabled={!selectedSiteId}
                            >
                                <span className="text-lg leading-none">+</span> Add Room
                            </button>
                        </div>
                    </div>
                </div>

                {/* Shortage Alerts */}
                {rooms.map(room => (room.shortageReports || []).map((report: any) => (
                    <div key={report.id} className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <h3 className="text-sm font-bold text-red-900">
                                    Shortage Reported: {room.name}
                                </h3>
                                <p className="text-sm text-red-800 mt-0.5">
                                    <span className="font-bold">{report.quantity}</span> of <span className="font-bold">{report.material}</span>
                                    {report.note ? ` — Note: ${report.note}` : ''}
                                </p>
                                <p className="text-xs text-red-500 mt-1 font-semibold uppercase tracking-wide">
                                    {new Date(report.date).toLocaleDateString()} at {new Date(report.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                const updatedReports = (room.shortageReports || []).filter((r: any) => r.id !== report.id);
                                try {
                                    const updatedRoom = await api.updateTileRoom(String(room.id), { shortageReports: updatedReports });
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
                )))}

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Rooms - {selectedSite?.name || '-'}</p>
                        <p className="text-3xl font-bold text-gray-800">{rooms.length}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Total Area</p>
                        <p className="text-3xl font-bold text-gray-800">
                            {totalArea.toFixed(1)}{' '}
                            <span className="text-base font-medium text-gray-500">sq.ft</span>
                        </p>
                    </div>
                </div>

                {/* Rooms List */}
                <div>
                    <h2 className="text-base font-bold text-gray-700 mb-3">Rooms Setup</h2>

                    {!selectedSiteId ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                            <p className="text-5xl mb-3">🏢</p>
                            <p className="text-sm font-medium">Please select a site above to view or add rooms.</p>
                        </div>
                    ) : loading ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                            <p className="text-4xl mb-3 animate-spin">⏳</p>
                            <p className="text-sm font-medium">Loading rooms…</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-center text-red-600">
                            <p className="text-sm font-semibold">{error}</p>
                            <button onClick={() => loadRooms(selectedSiteId)} className="mt-3 text-xs underline">Retry</button>
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                            <p className="text-5xl mb-3">📭</p>
                            <p className="text-sm font-medium">
                                No rooms for <strong>{selectedSite?.name}</strong> yet.
                                <br />
                                Click "Add Room" to get started.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {/* FLOOR TABS */}
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {(() => {
                                    const rawFloors = rooms.map(r => r.floor?.trim() || 'Unassigned');
                                    // Use Set to get unique floors but maintain order of appearance or sort them
                                    const uniqueFloors = Array.from(new Set(rawFloors));
                                    return uniqueFloors.map(floorName => (
                                        <button
                                            key={floorName}
                                            onClick={() => setSelectedFloor(floorName)}
                                            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-extrabold transition-all shadow-sm
                                                ${selectedFloor === floorName 
                                                    ? 'bg-[#6366f1] text-white shadow-[#6366f1]/20' 
                                                    : 'bg-[#e2e8f0] text-gray-600 hover:bg-[#cbd5e1]'
                                                }`}
                                        >
                                            {floorName}
                                        </button>
                                    ));
                                })()}
                                <button
                                    onClick={() => handleAddNewRoom()}
                                    className="whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-extrabold text-[#6366f1] border-2 border-dashed border-[#a5b4fc] hover:bg-indigo-50 transition-colors"
                                >
                                    + Floor
                                </button>
                            </div>

                            {/* ROOM CARDS LIST */}
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {rooms
                                    .filter(r => (r.floor?.trim() || 'Unassigned') === selectedFloor)
                                    .map((room) => (
                                        <div
                                            key={room.id}
                                            onClick={() => handleViewRoom(room)}
                                            className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-5 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow min-h-[140px]"
                                        >
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-black text-gray-900 text-lg leading-tight">{room.name}</h3>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">MAPPED AREA</p>
                                                    <p className="text-sm font-black text-[#6366f1]">
                                                        <span className="text-lg">{room.totalArea || 0}</span> sq.ft
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-auto pt-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-[#f3e8ff] text-[#9333ea] px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                                                        {(room as any).surfaceType === 'wall' ? 'WALL ELEVATION' : 'FLOOR LAYOUT'}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-500">
                                                        {room.length}x{room.width} ft
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            {/* BOTTOM ADD NEW ROOM BUTTON */}
                            <div className="mt-8">
                                <button
                                    onClick={handleAddNewRoom}
                                    className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white py-4 rounded-xl text-lg font-black transition-colors flex items-center justify-center gap-2 shadow-lg"
                                >
                                    + Plot New Room
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Download Modal */}
                {downloadModalVisible && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 flex flex-col max-h-[80vh]">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-extrabold text-gray-900">Generate PDF Report</h2>
                                <button
                                    onClick={() => setDownloadModalVisible(false)}
                                    className="text-gray-400 hover:text-gray-600 text-xl"
                                >
                                    ✕
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                Select the rooms to include in the calculations table.
                            </p>
                            <div className="overflow-y-auto flex-1 mb-4 divide-y divide-gray-100">
                                <label className="flex items-center gap-3 py-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={
                                            selectedRoomsToDownload.length === rooms.length &&
                                            rooms.length > 0
                                        }
                                        onChange={(e) => {
                                            if (e.target.checked)
                                                setSelectedRoomsToDownload(rooms.map((r) => r.id));
                                            else setSelectedRoomsToDownload([]);
                                        }}
                                        className="w-4 h-4 accent-indigo-600"
                                    />
                                    <span className="text-sm font-bold text-gray-800">Select All Rooms</span>
                                </label>
                                {rooms.map((r) => (
                                    <label
                                        key={r.id}
                                        className="flex items-center gap-3 py-3 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedRoomsToDownload.includes(r.id)}
                                            onChange={(e) => {
                                                if (e.target.checked)
                                                    setSelectedRoomsToDownload([
                                                        ...selectedRoomsToDownload,
                                                        r.id,
                                                    ]);
                                                else
                                                    setSelectedRoomsToDownload(
                                                        selectedRoomsToDownload.filter((id) => id !== r.id)
                                                    );
                                            }}
                                            className="w-4 h-4 accent-indigo-600"
                                        />
                                        <span className="text-sm text-gray-700">{r.name || 'Unnamed Room'}</span>
                                    </label>
                                ))}
                            </div>
                            <button
                                onClick={generatePDFReport}
                                disabled={selectedRoomsToDownload.length === 0}
                                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                            >
                                🖨️ Print / Save as PDF
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // =====================================================================
    // EDIT / CREATE ROOM VIEW  — Pro Layout Planner
    // =====================================================================
    if (view === 'editRoom' && editingRoom) {
        // Build skirting config from room fields if editing an existing room
        const plannerSkirting = (editingRoom as any).skirtingConfig || {
            enabled: editingRoom.hasSkirting || false,
            height: editingRoom.skirtingHeight || '4',
            doors: editingRoom.doors || '1',
            doorWidth: editingRoom.doorWidth || '3',
            size: (editingRoom as any).skirtingTileSize || '600x600 mm (2x2 ft)',
            wastage: (editingRoom as any).skirtingWastage || '0',
        };

        return (
            <div>
                {!selectedSiteId && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: 10, margin: '8px 0', color: '#dc2626', fontWeight: 700, fontSize: 13 }}>
                        ⚠️ No site selected. Go back to the dashboard and select a site first.
                    </div>
                )}
                {plannerError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: 10, margin: '8px 0', color: '#dc2626', fontWeight: 700, fontSize: 13 }}>
                        ⚠️ {plannerError}
                    </div>
                )}
                <InteractiveTilePlanner
                    initialName={editingRoom.name || ''}
                    initialFloor={(editingRoom as any).floor || ''}
                    siteId={selectedSiteId}
                    initialSurfaceType={(editingRoom as any).surfaceType || 'floor'}
                    initialEntrance={(editingRoom as any).entrance || 'bottom'}
                    initialDimensions={{
                        length: String(parseFloat(editingRoom.length) || 12),
                        width: String(parseFloat(editingRoom.width) || 10),
                    }}
                    initialGrid={(editingRoom as any).gridData || {}}
                    initialTilesConfig={(editingRoom as any).tilesConfig || undefined}
                    initialSkirting={plannerSkirting}
                    onSave={handleSavePlannerRoom}
                    onCancel={() => { setPlannerError(''); setView('dashboard'); }}
                    saving={saving}
                />
            </div>
        );
    }

    // =====================================================================
    // ROOM DETAIL VIEW
    // =====================================================================
    if (view === 'roomDetail' && viewingRoom) {
        const r = viewingRoom;
        return (
            <div className="space-y-5 flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-2">
                    <button
                        onClick={() => setView('dashboard')}
                        className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600 font-bold text-lg leading-none"
                    >
                        ←
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-extrabold text-gray-900 leading-tight">{r.name}</h1>
                        <p className="text-sm font-medium text-gray-500">{selectedSite?.name}</p>
                    </div>
                    <button
                        onClick={() => { handleEditRoom(r); }}
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
                    >
                        ✏️ Edit
                    </button>
                    <button
                        onClick={() => { handleDeleteRoom(r.id); setView('dashboard'); }}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                        🗑️ Delete
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: Visuals */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        
                        {/* Grid Layout Preview */}
                        {(r as any).gridData && Object.keys((r as any).gridData).length > 0 && (() => {
                            const gridData: Record<string, string> = (r as any).gridData;
                            const tc: any = (r as any).tilesConfig || {};
                            const W = Math.max(Math.ceil(parseFloat(String(r.width))) || 1, 1);
                            const L = Math.max(Math.ceil(parseFloat(String(r.length))) || 1, 1);
                            const TILE_COLORS: Record<string, string> = {
                                tile1: '#6366f1', tile2: '#9333ea', tile3: '#0d9488', tile4: '#ea580c', deduct: 'repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1 2px,#f8fafc 2px,#f8fafc 6px)',
                            };
                            const TILE_META = [
                                { id: 'tile1', name: 'Main Field', color: '#6366f1', bg: '#eef2ff' },
                                { id: 'tile2', name: 'Border', color: '#9333ea', bg: '#faf5ff' },
                                { id: 'tile3', name: 'Highlight 1', color: '#0d9488', bg: '#f0fdfa' },
                                { id: 'tile4', name: 'Highlight 2', color: '#ea580c', bg: '#fff7ed' },
                            ];
                            const TILE_SIZES_MAP: Record<string, number> = {
                                '600x600 mm (2x2 ft)': 4, '600x1200 mm (2x4 ft)': 8,
                                '800x800 mm (32x32 in)': 7.11, '800x1600 mm (32x64 in)': 14.22,
                                '1200x1200 mm (4x4 ft)': 16,
                            };
                            const calcReq = (area: number, size: string, wastage: number) => {
                                const sqft = TILE_SIZES_MAP[size] || 1;
                                return Math.ceil((area / sqft) * (1 + (wastage || 0) / 100));
                            };
                            const areas = { tile1: 0, tile2: 0, tile3: 0, tile4: 0 };
                            Object.values(gridData).forEach(v => { 
                                const baseTile = (v as string).split('|')[0];
                                if (baseTile in areas) (areas as any)[baseTile]++; 
                            });
                            const hasAnyType = Object.values(areas).some(v => v > 0);
                            return (
                                <div className="space-y-4">
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50 flex-wrap gap-4">
                                            <div className="flex gap-4 w-full sm:w-auto">
                                                <div className="bg-white px-4 py-2 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100/50 text-center flex-1">
                                                    <p className="text-[13px] font-extrabold text-gray-800 tracking-tight">{(r as any).surfaceType === 'wall' ? 'Wall' : 'Floor'}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Surface</p>
                                                </div>
                                                <div className="bg-white px-4 py-2 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100/50 text-center flex-1">
                                                    <p className="text-[13px] font-extrabold text-gray-800 tracking-tight">{parseFloat(String(r.width) || '0')} × {parseFloat(String(r.length) || '0')} ft</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Dimensions</p>
                                                </div>
                                                <div className="bg-white px-4 py-2 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100/50 text-center flex-1">
                                                    <p className="text-[13px] font-extrabold text-gray-800 tracking-tight capitalize">{(r as any).entrance || 'bottom'} wall</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Entrance</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-center min-h-[400px]">
                                            {(() => {
                                                const cw = 400; // max width
                                                const cellPx = Math.floor((cw - (W + 1) * 2) / W);
                                                const groutPx = 2;
                                                const entranceWall = (r as any).entrance || 'bottom';
                                                
                                                return (
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                                                        <EdgeBar edge="top" entrance={entranceWall} cols={W} cellPx={cellPx} groutPx={groutPx} />
                                                        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                                                            <EdgeBar edge="left" entrance={entranceWall} rows={L} cellPx={cellPx} groutPx={groutPx} />
                                                            
                                                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${W}, ${cellPx}px)`, gap: groutPx, background: '#374151', border: `${groutPx}px solid #374151`, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                                                                {Array.from({ length: L }).map((_, y) =>
                                                                    Array.from({ length: W }).map((_, x) => {
                                                                        const cellVal = gridData[`${x}-${y}`] || '';
                                                                        const baseTile = cellVal.split('|')[0];
                                                                        const markerType = cellVal.split('|')[1];
                                                                        
                                                                        let bg = '#eef2ff';
                                                                        let icon = null;
                                                                        
                                                                        if (baseTile === 'deduct') bg = '#cbd5e1';
                                                                        else if (baseTile && TILE_COLORS[baseTile]) bg = TILE_COLORS[baseTile];
                                                                        else if (baseTile === 'door') { bg = '#1e293b'; icon = '🚪'; }
                                                                        else if (baseTile === 'window') { bg = '#bae6fd'; icon = '🪟'; }
                                                                        else if (baseTile === 'entrance') { bg = '#fef08a'; icon = '⬇️'; }
                                                                        
                                                                        if (markerType === 'door') icon = '🚪';
                                                                        else if (markerType === 'window') icon = '🪟';
                                                                        else if (markerType === 'entrance') icon = '⬇️';
                                                                        
                                                                        const hasMarker = !!icon || ['door', 'window', 'entrance'].includes(baseTile);
                                                                        
                                                                        return (
                                                                            <div
                                                                                key={`${x}-${y}`}
                                                                                style={{ 
                                                                                    width: cellPx, height: cellPx, 
                                                                                    background: bg, 
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                                                    fontSize: Math.max(cellPx * 0.55, 12),
                                                                                    position: "relative",
                                                                                    boxShadow: hasMarker ? "none" : `inset 0 1px 0 rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.15)`
                                                                                }}
                                                                            >
                                                                                {!hasMarker && (
                                                                                    <div style={{ position: "absolute", inset: 1, border: `1px solid rgba(255,255,255,0.2)`, pointerEvents: "none" }} />
                                                                                )}
                                                                                {icon && (
                                                                                     <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                                                                                         {icon}
                                                                                     </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                            <EdgeBar edge="right" entrance={entranceWall} rows={L} cellPx={cellPx} groutPx={groutPx} />
                                                        </div>
                                                        <EdgeBar edge="bottom" entrance={entranceWall} cols={W} cellPx={cellPx} groutPx={groutPx} />
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-50">
                                            {TILE_META.filter(t => (areas as any)[t.id] > 0).map(t => (
                                                <div key={t.id} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                    <div className="w-3.5 h-3.5 rounded-md shadow-sm" style={{ background: t.color }} />
                                                    <span className="text-xs font-bold text-gray-700">{t.name}</span>
                                                </div>
                                            ))}
                                            {Object.values(gridData).includes('deduct') && (
                                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                    <div className="w-3.5 h-3.5 rounded-md border border-gray-300" style={{ background: 'repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1 2px,#f8fafc 2px,#f8fafc 6px)' }} />
                                                    <span className="text-xs font-bold text-gray-700">Void/Deduct</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {hasAnyType && (
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                            <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Tile Type Requirements</h2>
                                            <div className="grid grid-cols-1 gap-4">
                                                {TILE_META.filter(t => (areas as any)[t.id] > 0).map(t => {
                                                    const area = (areas as any)[t.id];
                                                    const config = tc[t.id] || {};
                                                    const req = calcReq(area, config.size || '', parseFloat(config.wastage) || 0);
                                                    return (
                                                        <div key={t.id} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0 last:pb-0">
                                                            <div className="w-12 h-12 rounded-lg flex-shrink-0" style={{ background: t.color }} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-gray-800 tracking-tight truncate">{t.name}</p>
                                                                {config.purchaseName && <p className="text-[11px] font-semibold text-gray-500 truncate mt-0.5">{config.purchaseName}</p>}
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-black text-gray-900 leading-none tracking-tight">{req} <span className="text-[10px] uppercase text-gray-400">pcs</span></p>
                                                                <p className="text-[10px] font-bold text-gray-400 mt-1">{config.size || 'Size not set'}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Photos */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">
                                📸 Reference Photos {loadingDetail && <span className="text-indigo-400 normal-case font-normal">(loading…)</span>}
                            </h2>
                            {loadingDetail ? (
                                <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
                                    <p className="text-sm font-medium text-gray-400">Fetching photos from cloud…</p>
                                </div>
                            ) : (!r.photos || r.photos.length === 0) ? (
                                <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
                                    <p className="text-sm font-bold text-gray-400">No photos attached to this room.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {r.photos.map((p) => (
                                        <div key={p.id} className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                            <img
                                                src={p.url}
                                                alt="Room mockup"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                                onClick={() => window.open(p.url, '_blank')}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {r.instructions && (
                            <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-6">
                                <h2 className="text-xs font-extrabold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    📝 Laying Instructions
                                </h2>
                                <p className="text-sm text-amber-900 leading-relaxed font-medium whitespace-pre-wrap">{r.instructions}</p>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Data */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        {/* Calculated Results (Priority) */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-md p-6 text-white relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/5 opacity-50 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                            <div className="relative">
                                <h2 className="text-xs font-extrabold text-indigo-200 uppercase tracking-widest mb-5">Final Requirements</h2>
                                
                                <div className="flex flex-col gap-4">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                        <p className="text-xs font-bold text-indigo-200 uppercase">Tiles Needed</p>
                                        <p className="text-3xl font-black mt-1">
                                            {r.reqQty} <span className="text-sm font-bold text-indigo-300 normal-case">+ {r.wastage}% waste</span>
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                                            <p className="text-[10px] font-bold text-indigo-200 uppercase">Net Area</p>
                                            <p className="text-xl font-bold mt-1 text-white">{parseFloat(String(r.totalArea) || '0').toFixed(2)} <span className="text-xs font-semibold text-indigo-300 normal-case">sq.ft</span></p>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                                            <p className="text-[10px] font-bold text-indigo-200 uppercase">Floor Only</p>
                                            <p className="text-xl font-bold mt-1 text-white">{parseFloat(String(r.floorArea) || '0').toFixed(2)} <span className="text-xs font-semibold text-indigo-300 normal-case">sq.ft</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dimensions & Structure */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Dimensions & Tile Info</h2>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-end pb-3 border-b border-gray-50">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Room Size</p>
                                        <p className="text-base font-bold text-gray-800 mt-0.5">{r.width} × {r.length} <span className="text-xs text-gray-500 font-semibold">ft</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Skirting</p>
                                        <p className="text-sm font-bold text-gray-800 mt-0.5">{r.hasSkirting ? `${r.skirtingHeight}" High` : 'None'}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Tile Selected</p>
                                    <div className="mt-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                        <p className="text-sm font-bold text-gray-800">{r.tileName || 'Multi-type (Planner)'}</p>
                                        <p className="text-xs font-semibold text-gray-500 mt-0.5">{r.tileSize || 'Configured in layout'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Deductions & Additions */}
                        {((r.deductions && r.deductions.length > 0) || (r.additions && r.additions.length > 0)) && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Adjustments</h2>
                                
                                <div className="space-y-4">
                                    {r.deductions && r.deductions.length > 0 && (
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-[10px] font-bold text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded">Deductions</p>
                                                <p className="text-xs font-bold text-red-600">-{r.totalDeductedArea} sq.ft</p>
                                            </div>
                                            <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                                                {r.deductions.map(d => (
                                                    <div key={d.id} className="flex justify-between items-center px-3 py-2 bg-gray-50 flex-wrap gap-2">
                                                        <span className="text-xs font-bold text-gray-700">{d.name || 'Unnamed'}</span>
                                                        <span className="text-xs font-bold text-red-500">-{((parseFloat(d.length)||0)*(parseFloat(d.width)||0)).toFixed(1)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {r.additions && r.additions.length > 0 && (
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">Additions</p>
                                                <p className="text-xs font-bold text-emerald-600">+{r.totalAddedArea} sq.ft</p>
                                            </div>
                                            <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                                                {r.additions.map(a => (
                                                    <div key={a.id} className="flex justify-between items-center px-3 py-2 bg-gray-50 flex-wrap gap-2">
                                                        <span className="text-xs font-bold text-gray-700">{a.name || 'Unnamed'}</span>
                                                        <span className="text-xs font-bold text-emerald-600">+{((parseFloat(a.length)||0)*(parseFloat(a.width)||0)).toFixed(1)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
