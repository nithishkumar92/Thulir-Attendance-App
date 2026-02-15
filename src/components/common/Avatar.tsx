import React from 'react';

interface AvatarProps {
    name: string;
    photoUrl?: string;
    size?: number;
    color?: string; // Hex color for fallback
}

// Generate a random color based on string
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export const Avatar: React.FC<AvatarProps> = ({ name, photoUrl, size = 40, color }) => {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const bgColor = color || stringToColor(name);

    if (photoUrl) {
        return (
            <img
                src={photoUrl}
                alt={name}
                style={{
                    width: size,
                    height: size,
                    borderRadius: Math.round(size * 0.28),
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: `1.5px solid ${bgColor}30`
                }}
            />
        );
    }

    return (
        <div style={{
            width: size, height: size, borderRadius: Math.round(size * 0.28),
            background: `${bgColor}18`, display: "grid", placeItems: "center",
            fontSize: Math.round(size * 0.32), fontWeight: 800, color: bgColor,
            border: `1.5px solid ${bgColor}30`, flexShrink: 0,
        }}>{initials}</div>
    );
};
