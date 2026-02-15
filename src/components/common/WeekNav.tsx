import React from 'react';

interface WeekNavProps {
    label: string;
    sub: string;
    onPrev: () => void;
    onNext: () => void;
}

export const WeekNav: React.FC<WeekNavProps> = ({ label, sub, onPrev, onNext }) => (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
        <button
            onClick={onPrev}
            className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 transition-colors"
        >
            ‹
        </button>
        <div className="text-center">
            <div className="text-sm font-extrabold text-gray-900">{label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
        </div>
        <button
            onClick={onNext}
            className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 transition-colors"
        >
            ›
        </button>
    </div>
);
