import React from 'react';

const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string }> = {
    "X": { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },   // Present (Full)
    "/": { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },   // Half
    "X/": { bg: "#F3E8FF", color: "#7E22CE", border: "#E9D5FF" },  // Overtime (1.5)
    "A": { bg: "#FFF1F2", color: "#DC2626", border: "#FECACA" },   // Absent
    "-": { bg: "#F9FAFB", color: "#9CA3AF", border: "#F3F4F6" },   // No Record
};

export const StatusChip = ({ status }: { status: string }) => {
    const c = STATUS_CONFIG[status] || STATUS_CONFIG["-"];
    return (
        <div style={{
            height: 28, borderRadius: 6, display: "grid", placeItems: "center",
            background: c.bg, color: c.color, border: `1px solid ${c.border}`,
            fontSize: 11, fontWeight: 800,
        }}>{status}</div>
    );
};

export const StatusLegend = () => (
    <div className="flex gap-2">
        <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-[10px] text-gray-400 font-bold">X:Full</span>
        </div>
        <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-[10px] text-gray-400 font-bold">/:Half</span>
        </div>
        <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-[10px] text-gray-400 font-bold">A:Absent</span>
        </div>
    </div>
);
