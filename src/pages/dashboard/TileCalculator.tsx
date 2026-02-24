import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

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
    wastage: '10',
    reqQty: '',
    instructions: '',
    photos: [],
};

// --- Main Page Component ---
export const TileCalculator: React.FC = () => {
    const { sites } = useApp();
    const [view, setView] = useState<'dashboard' | 'editRoom'>('dashboard');
    const [downloadModalVisible, setDownloadModalVisible] = useState(false);
    const [selectedRoomsToDownload, setSelectedRoomsToDownload] = useState<number[]>([]);

    // selectedSiteId defaults to first site in list
    const [selectedSiteId, setSelectedSiteId] = useState<string>(() => sites[0]?.id || '');

    // Rooms stored per-site: { [siteId]: Room[] }
    const [roomsBySite, setRoomsBySite] = useState<Record<string, Room[]>>({});

    // Rooms for the currently selected site
    const rooms: Room[] = roomsBySite[selectedSiteId] || [];

    const setRooms = (updater: Room[] | ((prev: Room[]) => Room[])) => {
        setRoomsBySite((prev) => {
            const current = prev[selectedSiteId] || [];
            const next = typeof updater === 'function' ? updater(current) : updater;
            return { ...prev, [selectedSiteId]: next };
        });
    };

    const selectedSite = sites.find((s) => s.id === selectedSiteId);

    const [editingRoom, setEditingRoom] = useState<Room | null>(null);

    // --- Handlers ---
    const handleAddNewRoom = () => {
        setEditingRoom({ id: Date.now(), ...DEFAULT_NEW_ROOM });
        setView('editRoom');
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

    const handleDeleteRoom = (id: number) => {
        if (window.confirm('Delete this room setup?')) {
            setRooms(rooms.filter((r) => r.id !== id));
        }
    };

    const handleSaveRoom = () => {
        if (!editingRoom) return;
        if (!editingRoom.name) return alert('Please enter a room name');
        if (!editingRoom.tileSize || editingRoom.tileSize === 'Select Tile Size...')
            return alert('Please select a tile size');

        setRooms((prev) => {
            const exists = prev.find((r) => r.id === editingRoom.id);
            if (exists) {
                return prev.map((r) => (r.id === editingRoom.id ? editingRoom : r));
            }
            return [...prev, editingRoom];
        });
        setView('dashboard');
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
                        <h1 className="text-2xl font-bold text-gray-800">🪟 Tile Calculator</h1>
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
                                📄 Report
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

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Rooms — {selectedSite?.name || '—'}</p>
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
                            <p className="text-5xl mb-3">🏗️</p>
                            <p className="text-sm font-medium">Please select a site above to view or add rooms.</p>
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
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {rooms.map((room) => (
                                <div
                                    key={room.id}
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-base">{room.name}</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {room.tileName || 'No tile specified'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">{room.tileSize}</p>
                                        </div>
                                        <button
                                            onClick={() => handleEditRoom(room)}
                                            className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </div>

                                    <div className="flex gap-3 bg-gray-50 rounded-lg p-3">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Net Area</p>
                                            <p className="text-sm font-bold text-gray-800 mt-0.5">
                                                {room.totalArea || 0} sq.ft
                                            </p>
                                        </div>
                                        <div className="flex-1 border-l border-gray-200 pl-3">
                                            <p className="text-[10px] font-bold text-indigo-500 uppercase">Required</p>
                                            <p className="text-sm font-extrabold text-indigo-700 mt-0.5">
                                                {room.reqQty || 0} nos
                                            </p>
                                        </div>
                                    </div>

                                    {((room.deductions && room.deductions.length > 0) ||
                                        (room.additions && room.additions.length > 0)) && (
                                        <div className="flex gap-2 flex-wrap">
                                            {room.deductions?.length > 0 && (
                                                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md">
                                                    ⚠️ {room.deductions.length} Deductions
                                                </span>
                                            )}
                                            {room.additions?.length > 0 && (
                                                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                                    ➕ {room.additions.length} Additions
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                                        <span className="text-xs text-gray-400">
                                            📝 {room.instructions ? 'Has notes' : 'No notes'} &nbsp;•&nbsp; 📸{' '}
                                            {room.photos?.length || 0} photos
                                        </span>
                                        <button
                                            onClick={() => handleDeleteRoom(room.id)}
                                            className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
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
    // EDIT / CREATE ROOM VIEW
    // =====================================================================
    if (view === 'editRoom' && editingRoom) {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setView('dashboard')}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        ← Back
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">
                        {editingRoom.name ? `Edit Room — ${editingRoom.name}` : 'New Room'}
                    </h1>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
                    {/* Room Name */}
                    <div>
                        <FieldLabel>Room Name</FieldLabel>
                        <TileInput
                            value={editingRoom.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            placeholder="e.g. Master Bedroom"
                        />
                    </div>

                    {/* Tile Spec & Size */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <FieldLabel>Tile Spec / Brand</FieldLabel>
                            <TileInput
                                value={editingRoom.tileName}
                                onChange={(e) => updateField('tileName', e.target.value)}
                                placeholder="e.g. GVT Wooden"
                            />
                        </div>
                        <div>
                            <FieldLabel>Tile Size</FieldLabel>
                            <select
                                value={editingRoom.tileSize}
                                onChange={(e) => updateField('tileSize', e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                {TILE_SIZES.map((t) => (
                                    <option key={t.label} value={t.label}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Custom tile dimensions */}
                    {editingRoom.tileSize === 'Custom / Other' && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <FieldLabel>Custom Tile Dimensions</FieldLabel>
                            <div className="grid grid-cols-3 gap-3">
                                <TileInput
                                    type="number"
                                    value={editingRoom.customTileLength}
                                    onChange={(e) => updateField('customTileLength', e.target.value)}
                                    placeholder="Length"
                                />
                                <TileInput
                                    type="number"
                                    value={editingRoom.customTileWidth}
                                    onChange={(e) => updateField('customTileWidth', e.target.value)}
                                    placeholder="Width"
                                />
                                <select
                                    value={editingRoom.customTileUnit}
                                    onChange={(e) =>
                                        updateField(
                                            'customTileUnit',
                                            e.target.value as 'feet' | 'inches' | 'mm'
                                        )
                                    }
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="feet">Feet</option>
                                    <option value="inches">Inches</option>
                                    <option value="mm">mm</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Dimensions */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                        <FieldLabel>Main Room Dimensions (Feet)</FieldLabel>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel style={{ fontSize: 10 }}>Length</FieldLabel>
                                <TileInput
                                    type="number"
                                    value={editingRoom.length}
                                    onChange={(e) => updateField('length', e.target.value)}
                                    placeholder="Length"
                                />
                            </div>
                            <div>
                                <FieldLabel style={{ fontSize: 10 }}>Width</FieldLabel>
                                <TileInput
                                    type="number"
                                    value={editingRoom.width}
                                    onChange={(e) => updateField('width', e.target.value)}
                                    placeholder="Width"
                                />
                            </div>
                        </div>

                        {/* Skirting Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={editingRoom.hasSkirting}
                                onChange={(e) => updateField('hasSkirting', e.target.checked)}
                                className="w-4 h-4 accent-indigo-600"
                            />
                            <span className="text-sm font-semibold text-gray-700">
                                Include Skirting Calculation
                            </span>
                        </label>

                        {editingRoom.hasSkirting && (
                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-dashed border-gray-300">
                                <div>
                                    <FieldLabel style={{ fontSize: 10 }}>Skirting Ht (Inches)</FieldLabel>
                                    <TileInput
                                        type="number"
                                        value={editingRoom.skirtingHeight}
                                        onChange={(e) => updateField('skirtingHeight', e.target.value)}
                                        placeholder="4"
                                    />
                                </div>
                                <div>
                                    <FieldLabel style={{ fontSize: 10 }}>Wastage %</FieldLabel>
                                    <TileInput
                                        type="number"
                                        value={editingRoom.wastage}
                                        onChange={(e) => updateField('wastage', e.target.value)}
                                        placeholder="10"
                                    />
                                </div>
                                <div>
                                    <FieldLabel style={{ fontSize: 10 }}>No. of Doors</FieldLabel>
                                    <TileInput
                                        type="number"
                                        value={editingRoom.doors}
                                        onChange={(e) => updateField('doors', e.target.value)}
                                        placeholder="1"
                                    />
                                </div>
                                <div>
                                    <FieldLabel style={{ fontSize: 10 }}>Door Width (Feet)</FieldLabel>
                                    <TileInput
                                        type="number"
                                        value={editingRoom.doorWidth}
                                        onChange={(e) => updateField('doorWidth', e.target.value)}
                                        placeholder="3"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Deductions */}
                        <div className="pt-4 border-t-2 border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                                <FieldLabel style={{ margin: 0 }}>➖ Untiled Areas (Deductions)</FieldLabel>
                                <button
                                    onClick={addDeduction}
                                    className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-md transition-colors"
                                >
                                    + Add Exclusion
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">
                                Exclude areas like Cupboards or Kitchen Counters.
                            </p>
                            {editingRoom.deductions.map((d) => (
                                <div
                                    key={d.id}
                                    style={{ position: 'relative' }}
                                    className="bg-white border border-red-200 rounded-lg p-3 mb-3"
                                >
                                    <button
                                        onClick={() => removeDeduction(d.id)}
                                        style={{
                                            position: 'absolute',
                                            top: -8,
                                            right: -8,
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: '#ef4444',
                                            color: '#fff',
                                            border: 'none',
                                            fontSize: 10,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        ✕
                                    </button>
                                    <TileInput
                                        value={d.name}
                                        onChange={(e) => updateDeduction(d.id, 'name', e.target.value)}
                                        placeholder="Area Name (e.g. Counter Base)"
                                        style={{ marginBottom: 8, padding: '8px 10px', fontSize: 13 }}
                                    />
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <FieldLabel style={{ fontSize: 9 }}>Length (ft)</FieldLabel>
                                            <TileInput
                                                type="number"
                                                value={d.length}
                                                onChange={(e) =>
                                                    updateDeduction(d.id, 'length', e.target.value)
                                                }
                                                placeholder="L"
                                                style={{ padding: '8px 10px' }}
                                            />
                                        </div>
                                        <div>
                                            <FieldLabel style={{ fontSize: 9 }}>Width (ft)</FieldLabel>
                                            <TileInput
                                                type="number"
                                                value={d.width}
                                                onChange={(e) =>
                                                    updateDeduction(d.id, 'width', e.target.value)
                                                }
                                                placeholder="W"
                                                style={{ padding: '8px 10px' }}
                                            />
                                        </div>
                                        {editingRoom.hasSkirting && (
                                            <div>
                                                <FieldLabel style={{ fontSize: 9 }}>Wall Contact (ft)</FieldLabel>
                                                <TileInput
                                                    type="number"
                                                    value={d.perimeterDeduct}
                                                    onChange={(e) =>
                                                        updateDeduction(
                                                            d.id,
                                                            'perimeterDeduct',
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Skirting deduct"
                                                    style={{ padding: '8px 10px' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Additions */}
                        <div className="pt-4 border-t-2 border-dashed border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                                <FieldLabel style={{ margin: 0, color: '#059669' }}>
                                    ➕ Extra Tiled Areas (Additions)
                                </FieldLabel>
                                <button
                                    onClick={addAddition}
                                    className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md transition-colors"
                                >
                                    + Add Extra Area
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">
                                Include areas like Window Sills, Steps, or Alcoves.
                            </p>
                            {editingRoom.additions.map((a) => (
                                <div
                                    key={a.id}
                                    style={{ position: 'relative' }}
                                    className="bg-white border border-emerald-200 rounded-lg p-3 mb-3"
                                >
                                    <button
                                        onClick={() => removeAddition(a.id)}
                                        style={{
                                            position: 'absolute',
                                            top: -8,
                                            right: -8,
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: '#10b981',
                                            color: '#fff',
                                            border: 'none',
                                            fontSize: 10,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        ✕
                                    </button>
                                    <TileInput
                                        value={a.name}
                                        onChange={(e) => updateAddition(a.id, 'name', e.target.value)}
                                        placeholder="Area Name (e.g. Window Sill)"
                                        style={{ marginBottom: 8, padding: '8px 10px', fontSize: 13 }}
                                    />
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <FieldLabel style={{ fontSize: 9 }}>Length (ft)</FieldLabel>
                                            <TileInput
                                                type="number"
                                                value={a.length}
                                                onChange={(e) =>
                                                    updateAddition(a.id, 'length', e.target.value)
                                                }
                                                placeholder="L"
                                                style={{ padding: '8px 10px' }}
                                            />
                                        </div>
                                        <div>
                                            <FieldLabel style={{ fontSize: 9 }}>Width (ft)</FieldLabel>
                                            <TileInput
                                                type="number"
                                                value={a.width}
                                                onChange={(e) =>
                                                    updateAddition(a.id, 'width', e.target.value)
                                                }
                                                placeholder="W"
                                                style={{ padding: '8px 10px' }}
                                            />
                                        </div>
                                        {editingRoom.hasSkirting && (
                                            <div>
                                                <FieldLabel style={{ fontSize: 9 }}>Wall Contact (ft)</FieldLabel>
                                                <TileInput
                                                    type="number"
                                                    value={a.perimeterAdd}
                                                    onChange={(e) =>
                                                        updateAddition(a.id, 'perimeterAdd', e.target.value)
                                                    }
                                                    placeholder="Skirting add"
                                                    style={{ padding: '8px 10px' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Estimated Requirement Summary */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex justify-between items-center">
                        <div>
                            <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-wide mb-1">
                                Estimated Requirement
                            </p>
                            <p className="text-xs text-gray-500">
                                Floor: {editingRoom.floorArea || 0} sq.ft
                                {editingRoom.hasSkirting &&
                                    ` | Skirt: ${editingRoom.skirtingArea || 0} sq.ft`}
                            </p>
                            {(parseFloat(editingRoom.totalDeductedArea || '0') > 0 ||
                                parseFloat(editingRoom.totalAddedArea || '0') > 0) && (
                                <div className="flex gap-3 mt-1">
                                    {parseFloat(editingRoom.totalDeductedArea || '0') > 0 && (
                                        <span className="text-xs font-semibold text-red-500">
                                            -{editingRoom.totalDeductedArea} sq.ft
                                        </span>
                                    )}
                                    {parseFloat(editingRoom.totalAddedArea || '0') > 0 && (
                                        <span className="text-xs font-semibold text-emerald-500">
                                            +{editingRoom.totalAddedArea} sq.ft
                                        </span>
                                    )}
                                </div>
                            )}
                            <p className="text-xs font-semibold text-indigo-700 mt-1">
                                Total: {editingRoom.totalArea || 0} sq.ft + {editingRoom.wastage || 0}%
                                waste
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-extrabold text-indigo-700 leading-none">
                                {editingRoom.reqQty || 0}
                            </p>
                            <span className="text-xs font-semibold text-indigo-400">nos</span>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div>
                        <FieldLabel>Laying Instructions / Notes for Mason</FieldLabel>
                        <textarea
                            value={editingRoom.instructions}
                            onChange={(e) => updateField('instructions', e.target.value)}
                            placeholder="e.g. Do not lay tiles under cupboard. Tile the window sill."
                            rows={4}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                        />
                    </div>

                    {/* Photos */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <FieldLabel style={{ margin: 0 }}>Mockup & Reference Photos</FieldLabel>
                            <span className="text-xs text-gray-400 font-semibold">
                                {editingRoom.photos?.length || 0} added
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                            Upload laying pattern references or 3D mockups.
                        </p>
                        <MockupPhotos
                            photos={editingRoom.photos}
                            onChange={(photos) => updateField('photos', photos)}
                        />
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSaveRoom}
                        className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-colors shadow-md"
                    >
                        Save Room Setup
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
