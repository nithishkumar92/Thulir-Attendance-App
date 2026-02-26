import React, { useState, useEffect } from 'react';

// --- Constants ---
const TILE_SIZES = [
    { label: 'Select Tile Size...', sqft: 0 },
    { label: '600x600 mm (2x2 ft)', sqft: 4 },
    { label: '600x1200 mm (2x4 ft)', sqft: 8 },
    { label: '800x800 mm (32x32 in)', sqft: 7.11 },
    { label: '800x1600 mm (32x64 in)', sqft: 14.22 },
    { label: '1200x1200 mm (4x4 ft)', sqft: 16 },
    { label: 'Custom Size', sqft: 0 },
];

const TILE_TYPES = [
    { id: 'tile1', label: 'Main', name: 'Main Field', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
    { id: 'tile2', label: 'Border', name: 'Border', color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff' },
    { id: 'tile3', label: 'Hlt 1', name: 'Highlight 1', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
    { id: 'tile4', label: 'Hlt 2', name: 'Highlight 2', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
];

const MARKER_TYPES = [
    { id: 'door', label: 'Door', name: 'Door', icon: '🚪', color: '#1e293b', bg: '#f1f5f9', border: '#cbd5e1' },
    { id: 'window', label: 'Window', name: 'Window', icon: '🪟', color: '#bae6fd', bg: '#f0f9ff', border: '#7dd3fc' },
    { id: 'entrance', label: 'Entrance', name: 'Entrance', icon: '⬇️', color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d' },
];

// --- Types ---
interface TileConfig {
    size: string;
    wastage: number | string;
    purchaseName?: string;
    uniqueId?: string;
    customLength?: string;
    customWidth?: string;
}

interface TilesConfig {
    tile1: TileConfig;
    tile2: TileConfig;
    tile3: TileConfig;
    tile4: TileConfig;
}

interface SkirtingConfig {
    enabled: boolean;
    height: string;
    doors: string;
    doorWidth: string;
    size: string;
    wastage: string;
    purchaseName?: string;
    uniqueId?: string;
    customLength?: string;
    customWidth?: string;
}

export interface PlannerSaveData {
    name: string;
    floor: string;
    surfaceType: 'floor' | 'wall';
    entrance: 'top' | 'bottom' | 'left' | 'right';
    length: string;
    width: string;
    totalArea: number;
    floorArea: number;
    skirtingArea: number;
    reqQty: number;
    tilesConfig: TilesConfig;
    skirting: SkirtingConfig;
    grid: Record<string, string>;
    // tile breakdown areas (sq.ft per type)
    areas: { tile1: number; tile2: number; tile3: number; tile4: number };
}

interface Props {
    initialName?: string;
    initialFloor?: string;
    siteId?: string;
    initialSurfaceType?: 'floor' | 'wall';
    initialEntrance?: 'top' | 'bottom' | 'left' | 'right';
    initialDimensions?: { length: string; width: string };
    initialGrid?: Record<string, string>;
    initialTilesConfig?: TilesConfig;
    initialSkirting?: SkirtingConfig;
    onSave: (data: PlannerSaveData) => void;
    onCancel: () => void;
    saving?: boolean;
}

// --- Reusable UI ---
const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', ...style }}>{children}</p>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ type = 'text', onFocus, onBlur, style, ...props }) => (
    <input
        type={type}
        {...props}
        style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
            border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', background: '#f8fafc',
            outline: 'none', transition: 'border-color 0.2s', ...style,
        }}
        onFocus={(e) => { e.target.style.borderColor = '#6366f1'; onFocus?.(e); }}
        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; onBlur?.(e); }}
    />
);

// --- Main Component ---
export const InteractiveTilePlanner: React.FC<Props> = ({
    initialName = '',
    initialFloor = '',
    siteId = '',
    initialSurfaceType = 'floor',
    initialEntrance = 'bottom',
    initialDimensions = { length: '12', width: '10' },
    initialGrid = {},
    initialTilesConfig,
    initialSkirting,
    onSave,
    onCancel,
    saving = false,
}) => {
    const [roomName, setRoomName] = useState(initialName);
    const [floorName, setFloorName] = useState(initialFloor);
    const [surfaceType, setSurfaceType] = useState<'floor' | 'wall'>(initialSurfaceType);
    const [entrance, setEntrance] = useState<'top' | 'bottom' | 'left' | 'right'>(initialEntrance);
    const [dimensions, setDimensions] = useState(initialDimensions);
    const [grid, setGrid] = useState<Record<string, string>>(initialGrid);
    const [activeTool, setActiveTool] = useState('tile1');
    const [isPainting, setIsPainting] = useState(false);

    // Wall Dividers
    const [dividers, setDividers] = useState<number[]>([]);
    const [dividerInput, setDividerInput] = useState('');

    // Tile Configurations
    const [tilesConfig, setTilesConfig] = useState<TilesConfig>(initialTilesConfig || {
        tile1: { size: '600x1200 mm (2x4 ft)', wastage: 0, purchaseName: '' },
        tile2: { size: '600x600 mm (2x2 ft)', wastage: 0, purchaseName: '' },
        tile3: { size: 'Select Tile Size...', wastage: 0, purchaseName: '' },
        tile4: { size: 'Select Tile Size...', wastage: 0, purchaseName: '' },
    });

    // Skirting
    const [skirting, setSkirting] = useState<SkirtingConfig>(initialSkirting || {
        enabled: false, height: '4', doors: '1', doorWidth: '3', size: '600x600 mm (2x2 ft)', wastage: '0',
    });
    const [saveError, setSaveError] = useState('');

    // Reset grid only when dimensions or surface type change AND there is no initial grid
    // (Don't reset when loading saved data)
    const isFirstRender = React.useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return; // skip reset on first render — we want to keep initialGrid
        }
        setGrid({});
        setDividers([]);
    }, [dimensions.length, dimensions.width, surfaceType]);

    // --- Paint handlers ---
    const handlePaint = (x: number, y: number) => {
        setGrid(prev => {
            if (activeTool === 'erase') {
                const next = { ...prev };
                delete next[`${x}-${y}`];
                return next;
            }
            const currentVal = prev[`${x}-${y}`] || '';
            const isMarkerTool = MARKER_TYPES.find(m => m.id === activeTool);
            if (isMarkerTool) {
                if (currentVal === 'deduct') return prev;
                const baseTile = currentVal ? currentVal.split('|')[0] : 'tile1';
                return { ...prev, [`${x}-${y}`]: `${baseTile}|${activeTool}` };
            } else {
                if (activeTool === 'deduct') {
                     return { ...prev, [`${x}-${y}`]: 'deduct'};
                }
                const existingMarker = currentVal.includes('|') ? currentVal.split('|')[1] : null;
                if (existingMarker) {
                    return { ...prev, [`${x}-${y}`]: `${activeTool}|${existingMarker}` };
                } else {
                    return { ...prev, [`${x}-${y}`]: activeTool };
                }
            }
        });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isPainting) return;
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
        if (element?.dataset.x && element?.dataset.y) {
            handlePaint(parseInt(element.dataset.x), parseInt(element.dataset.y));
        }
    };

    // --- Auto-fill ---
    const autoFillBorder = () => {
        const newGrid = { ...grid };
        const len = Math.max(Math.ceil(parseFloat(dimensions.length)) || 1, 1);
        const wid = Math.max(Math.ceil(parseFloat(dimensions.width)) || 1, 1);
        for (let y = 0; y < len; y++) {
            for (let x = 0; x < wid; x++) {
                if (x === 0 || x === wid - 1 || y === 0 || y === len - 1) {
                    const current = newGrid[`${x}-${y}`] || '';
                    if (current.split('|')[0] !== 'deduct') {
                        const marker = current.includes('|') ? current.split('|')[1] : null;
                        newGrid[`${x}-${y}`] = marker ? `tile2|${marker}` : 'tile2';
                    }
                }
            }
        }
        setGrid(newGrid);
    };

    const fillRemainingMain = () => {
        const newGrid = { ...grid };
        const len = Math.max(Math.ceil(parseFloat(dimensions.length)) || 1, 1);
        const wid = Math.max(Math.ceil(parseFloat(dimensions.width)) || 1, 1);
        for (let y = 0; y < len; y++) {
            for (let x = 0; x < wid; x++) {
                const current = newGrid[`${x}-${y}`] || '';
                if (!current) {
                    newGrid[`${x}-${y}`] = 'tile1';
                }
            }
        }
        setGrid(newGrid);
    };

    const addDivider = () => {
        const len = Math.max(Math.ceil(parseFloat(dimensions.length)) || 1, 1);
        const wid = Math.max(Math.ceil(parseFloat(dimensions.width)) || 1, 1);
        const val = parseInt(dividerInput);
        if (val > 0 && val < wid && !dividers.includes(val)) {
            setDividers([...dividers, val].sort((a, b) => a - b));
        }
        setDividerInput('');
    };

    const removeDivider = (val: number) => setDividers(dividers.filter(d => d !== val));

    // --- Calculations ---
    const areas = {
        tile1: Object.values(grid).filter(v => v.split('|')[0] === 'tile1').length,
        tile2: Object.values(grid).filter(v => v.split('|')[0] === 'tile2').length,
        tile3: Object.values(grid).filter(v => v.split('|')[0] === 'tile3').length,
        tile4: Object.values(grid).filter(v => v.split('|')[0] === 'tile4').length,
    };

    let skirtingArea = 0;
    if (skirting.enabled && surfaceType === 'floor') {
        const len = parseFloat(dimensions.length) || 0;
        const wid = parseFloat(dimensions.width) || 0;
        const perimeter = 2 * (len + wid);
        const doorsDeduct = (parseFloat(skirting.doors) || 0) * (parseFloat(skirting.doorWidth) || 0);
        const netPerimeter = Math.max(0, perimeter - doorsDeduct);
        const heightFt = (parseFloat(skirting.height) || 0) / 12;
        skirtingArea = netPerimeter * heightFt;
    }

    const calcReq = (area: number, config: Pick<TileConfig, 'size' | 'wastage' | 'customLength' | 'customWidth'>): number => {
        if (!config.size || config.size === 'Select Tile Size...') return 0;
        
        let sqftPerPiece = TILE_SIZES.find(t => t.label === config.size)?.sqft || 1;
        
        if (config.size === 'Custom Size') {
            const l = parseFloat(config.customLength || '0');
            const w = parseFloat(config.customWidth || '0');
            sqftPerPiece = (l * w) / 92903.04;
        }
        
        if (sqftPerPiece <= 0) sqftPerPiece = 1; // fallback
        
        return Math.ceil((area / sqftPerPiece) * (1 + ((parseFloat(String(config.wastage)) || 0) / 100)));
    };

    const totalFloorArea = areas.tile1 + areas.tile2 + areas.tile3 + areas.tile4;
    const totalReqTiles = (Object.keys(areas) as (keyof typeof areas)[]).reduce(
        (sum, key) => sum + calcReq(areas[key], tilesConfig[key as keyof TilesConfig] as TileConfig), 0
    );
    const skirtingReq = calcReq(skirtingArea, skirting as Pick<TileConfig, 'size' | 'wastage'>);

    // --- Save handler ---
    const handleSave = () => {
        setSaveError('');
        if (!roomName.trim()) {
            setSaveError('Please enter a room name.');
            return;
        }
        if (!siteId) {
            setSaveError('No site selected. Please go back and select a site first.');
            return;
        }
        onSave({
            name: roomName.trim(),
            floor: floorName.trim(),
            surfaceType,
            entrance,
            length: dimensions.length,
            width: dimensions.width,
            totalArea: totalFloorArea + skirtingArea,
            floorArea: totalFloorArea,
            skirtingArea,
            reqQty: totalReqTiles + skirtingReq,
            tilesConfig,
            skirting,
            grid,
            areas,
        });
    };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", background: '#f1f5f9', minHeight: '100%' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '20px 20px 24px', color: '#fff', borderRadius: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>🪟 Pro Layout Planner</h2>
                        <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1' }}>Paint tiles, mark voids, map walls.</p>
                    </div>
                    <button
                        onClick={onCancel}
                        style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#cbd5e1', borderRadius: 10, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                        ← Back
                    </button>
                </div>

                {/* Room Name & Floor */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                        <Label style={{ color: 'rgba(255,255,255,0.7)' }}>Room Name</Label>
                        <Input
                            value={roomName}
                            onChange={e => setRoomName(e.target.value)}
                            placeholder="e.g. Master Bedroom"
                            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <Label style={{ color: 'rgba(255,255,255,0.7)' }}>Floor</Label>
                        <Input
                            value={floorName}
                            onChange={e => setFloorName(e.target.value)}
                            placeholder="e.g. Ground Floor"
                            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}
                        />
                    </div>
                </div>

                {/* Surface Type Toggle */}
                <div style={{ display: 'flex', gap: 10, background: 'rgba(255,255,255,0.05)', padding: 6, borderRadius: 12, marginBottom: 16 }}>
                    <button onClick={() => setSurfaceType('floor')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: surfaceType === 'floor' ? '#6366f1' : 'transparent', color: surfaceType === 'floor' ? '#fff' : '#cbd5e1', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                        Floor Layout
                    </button>
                    <button onClick={() => setSurfaceType('wall')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: surfaceType === 'wall' ? '#6366f1' : 'transparent', color: surfaceType === 'wall' ? '#fff' : '#cbd5e1', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                        Wall Elevation
                    </button>
                </div>

                {/* Entrances */}
                {surfaceType === 'floor' && (
                    <div style={{ marginBottom: 16 }}>
                        <Label style={{ color: 'rgba(255,255,255,0.7)' }}>Entrance Wall</Label>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {['top', 'bottom', 'left', 'right'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setEntrance(opt as any)}
                                    style={{
                                        flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                                        background: entrance === opt ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                        color: entrance === opt ? '#fff' : '#cbd5e1',
                                        fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Dimensions */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                        <Label style={{ color: 'rgba(255,255,255,0.7)' }}>{surfaceType === 'floor' ? 'Length (ft) - Y' : 'Height (ft) - Y'}</Label>
                        <Input type="number" step="0.01" value={dimensions.length} onChange={e => setDimensions({ ...dimensions, length: e.target.value })} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <Label style={{ color: 'rgba(255,255,255,0.7)' }}>Total Width (ft) - X</Label>
                        <Input type="number" step="0.01" value={dimensions.width} onChange={e => setDimensions({ ...dimensions, width: e.target.value })} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }} />
                    </div>
                </div>
            </div>

            {/* Tool Palette */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: '#fff', padding: 8, borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflowX: 'auto' }}>
                {TILE_TYPES.map(tool => (
                    <button
                        key={tool.id} onClick={() => setActiveTool(tool.id)}
                        style={{ flex: 1, minWidth: 50, padding: '8px 4px', borderRadius: 10, border: activeTool === tool.id ? `2px solid ${tool.color}` : '2px solid transparent', background: activeTool === tool.id ? tool.bg : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        <div style={{ width: 20, height: 20, background: tool.color, borderRadius: 6, marginBottom: 4 }} />
                        <span style={{ fontSize: 9, fontWeight: 800, color: activeTool === tool.id ? tool.color : '#64748b' }}>{tool.label}</span>
                    </button>
                ))}

                <div style={{ width: 1, background: '#e2e8f0', margin: '0 4px' }} />

                {MARKER_TYPES.map(tool => (
                    <button
                        key={tool.id} onClick={() => setActiveTool(tool.id)}
                        style={{ flex: 1, minWidth: 50, padding: '8px 4px', borderRadius: 10, border: activeTool === tool.id ? `2px solid ${tool.color}` : '2px solid transparent', background: activeTool === tool.id ? tool.bg : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: tool.color, borderRadius: 6, marginBottom: 4 }}>
                            {tool.icon}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, color: activeTool === tool.id ? tool.color : '#64748b' }}>{tool.label}</span>
                    </button>
                ))}

                <button onClick={() => setActiveTool('deduct')} style={{ flex: 1, minWidth: 50, padding: '8px 4px', borderRadius: 10, border: activeTool === 'deduct' ? '2px solid #ef4444' : '2px solid transparent', background: activeTool === 'deduct' ? '#fef2f2' : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ width: 20, height: 20, background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 2px, #fef2f2 2px, #fef2f2 6px)', border: '1px solid #ef4444', borderRadius: 6, marginBottom: 4, boxSizing: 'border-box' }} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: activeTool === 'deduct' ? '#ef4444' : '#64748b' }}>Deduct</span>
                </button>

                <button onClick={() => setActiveTool('erase')} style={{ flex: 1, minWidth: 50, padding: '8px 4px', borderRadius: 10, border: activeTool === 'erase' ? '2px solid #94a3b8' : '2px solid transparent', background: activeTool === 'erase' ? '#f1f5f9' : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ width: 20, height: 20, border: '2px dashed #94a3b8', borderRadius: 6, marginBottom: 4, boxSizing: 'border-box' }} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: activeTool === 'erase' ? '#475569' : '#64748b' }}>Erase</span>
                </button>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={autoFillBorder} style={{ flex: 1, background: '#faf5ff', border: '1px solid #d8b4fe', color: '#9333ea', padding: '8px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Auto Border</button>
                <button onClick={fillRemainingMain} style={{ flex: 1, background: '#eef2ff', border: '1px solid #c7d2fe', color: '#6366f1', padding: '8px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Fill Main</button>
                <button onClick={() => setGrid({})} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', padding: '8px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Clear</button>
            </div>

            {/* Wall Dividers (Wall mode only) */}
            {surfaceType === 'wall' && (
                <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <Label>Map Continuous Walls (Add Folds)</Label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <Input type="number" value={dividerInput} onChange={e => setDividerInput(e.target.value)} placeholder="Fold at X (ft)" style={{ flex: 1, padding: '8px 12px' }} />
                        <button onClick={addDivider} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>Add Line</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {dividers.map(d => (
                            <span key={d} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                Wall folds at {d}ft
                                <span onClick={() => removeDivider(d)} style={{ color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>×</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Interactive Grid Canvas */}
            <div style={{ background: '#fff', padding: 16, borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Label style={{ margin: 0 }}>{surfaceType === 'floor' ? 'Floor Plan' : 'Wall Elevation'} (1 sq.ft/cell)</Label>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Drag to paint</span>
                </div>

                <div style={{ position: 'relative', padding: surfaceType === 'floor' ? '20px' : '0', background: surfaceType === 'floor' ? '#f8fafc' : 'transparent', borderRadius: 12 }}>
                    {surfaceType === 'floor' && (
                        <>
                            <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>N</div>
                            <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>S</div>
                            <div style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>W</div>
                            <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>E</div>
                        </>
                    )}
                    {surfaceType === 'wall' && (
                        <div style={{ position: 'absolute', top: -20, left: 0, right: 0, display: 'flex', height: 16 }}>
                            {[0, ...dividers, parseFloat(dimensions.width) || 1].map((point, idx, arr) => {
                                if (idx === arr.length - 1) return null;
                                const w = arr[idx + 1] - point;
                                const totalW = parseFloat(dimensions.width) || 1;
                                return (
                                    <div key={idx} style={{ width: `${(w / totalW) * 100}%`, textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#6366f1' }}>
                                        Wall {idx + 1}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div
                        style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(Math.ceil(parseFloat(dimensions.width))||1, 1)}, 1fr)`, gap: 1, background: '#cbd5e1', border: '2px solid #cbd5e1', borderRadius: 4, overflow: 'hidden', touchAction: 'none' }}
                        onMouseLeave={() => setIsPainting(false)}
                        onMouseUp={() => setIsPainting(false)}
                        onTouchEnd={() => setIsPainting(false)}
                    >
                        {Array.from({ length: Math.max(Math.ceil(parseFloat(dimensions.length))||1, 1) }).map((_, y) =>
                            Array.from({ length: Math.max(Math.ceil(parseFloat(dimensions.width))||1, 1) }).map((_, x) => {
                                const cellType = grid[`${x}-${y}`] || '';
                                const baseTile = cellType.split('|')[0];
                                const markerType = cellType.split('|')[1];
                                
                                let bg = '#f8fafc';
                                let icon = null;
                                
                                if (baseTile === 'deduct') {
                                    bg = 'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 2px, #f8fafc 2px, #f8fafc 6px)';
                                } else {
                                    const toolMatch = TILE_TYPES.find(t => t.id === baseTile);
                                    if (toolMatch) bg = toolMatch.color;
                                    else {
                                        const markerMatch = MARKER_TYPES.find(t => t.id === baseTile);
                                        if (markerMatch) {
                                            bg = '#f8fafc';
                                            icon = markerMatch.icon;
                                        }
                                    }
                                }
                                
                                if (markerType) {
                                    const markerMatch = MARKER_TYPES.find(t => t.id === markerType);
                                    if (markerMatch) icon = markerMatch.icon;
                                }
                                const isDivider = surfaceType === 'wall' && dividers.includes(x + 1);
                                return (
                                    <div
                                        key={`${x}-${y}`}
                                        data-x={x} data-y={y}
                                        onMouseDown={() => { setIsPainting(true); handlePaint(x, y); }}
                                        onMouseEnter={() => { if (isPainting) handlePaint(x, y); }}
                                        onTouchStart={() => { setIsPainting(true); handlePaint(x, y); }}
                                        onTouchMove={handleTouchMove}
                                        style={{ aspectRatio: '1/1', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'crosshair', transition: 'background 0.1s', borderRight: isDivider ? '3px dashed #0f172a' : 'none', boxSizing: 'border-box' }}
                                    >
                                        {icon}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Tile Config Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {TILE_TYPES.map(tool => {
                    const sqft = areas[tool.id as keyof typeof areas];
                    if (sqft === 0) return null;
                    const config = tilesConfig[tool.id as keyof TilesConfig];
                    const required = calcReq(sqft, config as TileConfig);
                    return (
                        <div key={tool.id} style={{ background: '#fff', border: `1px solid ${tool.border}`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 16, boxShadow: `0 4px 10px ${tool.color}15` }}>
                            <div style={{ width: 40, height: 40, background: tool.color, borderRadius: 10, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: tool.color }}>{tool.name} Tiles</p>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>{sqft} sq.ft</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <select
                                        value={config.size}
                                        onChange={e => setTilesConfig({ ...tilesConfig, [tool.id]: { ...config, size: e.target.value } })}
                                        style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#f8fafc', outline: 'none' }}
                                    >
                                        {TILE_SIZES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                                    </select>
                                    <Input
                                        type="number"
                                        value={String(config.wastage)}
                                        onChange={e => setTilesConfig({ ...tilesConfig, [tool.id]: { ...config, wastage: e.target.value } })}
                                        placeholder="Waste %"
                                        style={{ flex: 1, padding: '8px', fontSize: 12 }}
                                    />
                                </div>
                                
                                {/* Custom Size Modals */}
                                {config.size === 'Custom Size' && (
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                        <Input
                                            type="number"
                                            value={config.customLength || ''}
                                            onChange={e => setTilesConfig({ ...tilesConfig, [tool.id]: { ...config, customLength: e.target.value } })}
                                            placeholder="Length (mm)"
                                            style={{ flex: 1, padding: '8px', fontSize: 12 }}
                                        />
                                        <Input
                                            type="number"
                                            value={config.customWidth || ''}
                                            onChange={e => setTilesConfig({ ...tilesConfig, [tool.id]: { ...config, customWidth: e.target.value } })}
                                            placeholder="Width (mm)"
                                            style={{ flex: 1, padding: '8px', fontSize: 12 }}
                                        />
                                    </div>
                                )}

                                <div style={{ marginBottom: 8 }}>
                                    <Input
                                        value={config.purchaseName || ''}
                                        onChange={e => setTilesConfig({ ...tilesConfig, [tool.id]: { ...config, purchaseName: e.target.value } })}
                                        placeholder="Original Brand / Box Name"
                                        style={{ padding: '8px 10px', fontSize: 12 }}
                                    />
                                </div>
                                <div style={{ marginBottom: 8 }}>
                                    <Input
                                        value={config.uniqueId || ''}
                                        onChange={e => setTilesConfig({ ...tilesConfig, [tool.id]: { ...config, uniqueId: e.target.value } })}
                                        placeholder="Shop's Unique ID (Optional)"
                                        style={{ padding: '8px 10px', fontSize: 12 }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Requirement</span>
                                    <span style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{required} <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>nos</span></span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Skirting Section (Floor mode only) */}
            {surfaceType === 'floor' && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: skirting.enabled ? 16 : 0 }}>
                        <input type="checkbox" id="skirtingTogglePlanner" checked={skirting.enabled} onChange={e => setSkirting({ ...skirting, enabled: e.target.checked })} style={{ width: 18, height: 18, accentColor: '#10b981', cursor: 'pointer' }} />
                        <label htmlFor="skirtingTogglePlanner" style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', cursor: 'pointer' }}>Include Skirting Calculation</label>
                    </div>
                    {skirting.enabled && (
                        <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <div><Label>Height (Inches)</Label><Input type="number" value={skirting.height} onChange={e => setSkirting({ ...skirting, height: e.target.value })} placeholder="4" /></div>
                                <div><Label>Wastage %</Label><Input type="number" value={skirting.wastage} onChange={e => setSkirting({ ...skirting, wastage: e.target.value })} placeholder="15" /></div>
                                <div><Label>No. of Doors</Label><Input type="number" value={skirting.doors} onChange={e => setSkirting({ ...skirting, doors: e.target.value })} placeholder="1" /></div>
                                <div><Label>Door W (ft)</Label><Input type="number" value={skirting.doorWidth} onChange={e => setSkirting({ ...skirting, doorWidth: e.target.value })} placeholder="3" /></div>
                            </div>
                            <Label>Skirting Tile Size</Label>
                            <select value={skirting.size} onChange={e => setSkirting({ ...skirting, size: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#f8fafc', outline: 'none', marginBottom: 16 }}>
                                {TILE_SIZES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                            </select>

                            {/* Custom Size Modals */}
                            {skirting.size === 'Custom Size' && (
                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                    <Input
                                        type="number"
                                        value={skirting.customLength || ''}
                                        onChange={e => setSkirting({ ...skirting, customLength: e.target.value })}
                                        placeholder="Length (mm)"
                                    />
                                    <Input
                                        type="number"
                                        value={skirting.customWidth || ''}
                                        onChange={e => setSkirting({ ...skirting, customWidth: e.target.value })}
                                        placeholder="Width (mm)"
                                    />
                                </div>
                            )}

                            <div style={{ marginBottom: 12 }}>
                                <Input
                                    value={skirting.purchaseName || ''}
                                    onChange={e => setSkirting({ ...skirting, purchaseName: e.target.value })}
                                    placeholder="Original Brand / Box Name"
                                    style={{ padding: '10px 12px' }}
                                />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <Input
                                    value={skirting.uniqueId || ''}
                                    onChange={e => setSkirting({ ...skirting, uniqueId: e.target.value })}
                                    placeholder="Shop's Unique ID (Optional)"
                                    style={{ padding: '10px 12px' }}
                                />
                            </div>

                            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#059669', fontWeight: 700 }}>SKIRTING TILES</p>
                                    <p style={{ margin: 0, fontSize: 11, color: '#10b981' }}>Net Area: {skirtingArea.toFixed(1)} sq.ft</p>
                                </div>
                                <span style={{ fontSize: 24, fontWeight: 900, color: '#059669' }}>{calcReq(skirtingArea, skirting as Pick<TileConfig, 'size' | 'wastage' | 'customLength' | 'customWidth'>)} <span style={{ fontSize: 12, fontWeight: 600 }}>nos</span></span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Save Error */}
            {saveError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 12, color: '#dc2626', fontSize: 13, fontWeight: 700 }}>
                    ⚠️ {saveError}
                </div>
            )}

            {/* Save / Cancel Buttons */}
            <div style={{ display: 'flex', gap: 12, paddingBottom: 40 }}>
                <button
                    onClick={onCancel}
                    style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ flex: 2, padding: '14px', background: saving ? '#a5b4fc' : '#6366f1', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                >
                    {saving ? '⏳ Saving...' : '💾 Save Room'}
                </button>
            </div>
        </div>
    );
};

