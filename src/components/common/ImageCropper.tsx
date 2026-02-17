import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedImage: string) => void;
    onCancel: () => void;
    aspectRatio?: number; // Default 1 (Square/Circle)
    circular?: boolean;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
    imageSrc,
    onCropComplete,
    onCancel,
    aspectRatio = 1,
    circular = true
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Load image
    useEffect(() => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            setImage(img);
            // Initial center
            setOffset({ x: 0, y: 0 });
            setScale(1);
        };
    }, [imageSrc]);

    // Check boundary
    const limitOffset = (newOffset: { x: number, y: number }, currentScale: number) => {
        // Allow panning freely for better UX? Or constrain?
        // Let's allow free panning but maybe snap? 
        // For now, free panning is fine as we crop visible area.
        return newOffset;
    };


    const handlePointerDown = (e: React.PointerEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
        setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
    };

    const handlePointerMove = (e: React.PointerEvent | React.TouchEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;

        const newX = clientX - dragStart.x;
        const newY = clientY - dragStart.y;

        setOffset({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const newScale = Math.max(0.1, Math.min(5, scale - e.deltaY * 0.001));
        setScale(newScale);
    };

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas || !image || !containerRef.current) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Container size
        const size = Math.min(containerRef.current.clientWidth, 300); // 300px crop area
        canvas.width = size;
        canvas.height = size / aspectRatio;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Image Transformed
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(offset.x, offset.y); // Apply pan offset

        // Center image relative to origin
        const imgWidth = image.width;
        const imgHeight = image.height;

        // Fit logic: 
        // By default we want image to cover the crop area.
        // Scale 1 = fit width or height?
        // Let's say scale 1 means image intrinsic size? No, that's too big often.
        // Let's normalize: Scale 1 = Image fits container fully (contain)
        const baseScale = Math.min(canvas.width / imgWidth, canvas.height / imgHeight);

        ctx.scale(baseScale, baseScale);

        ctx.drawImage(image, -imgWidth / 2, -imgHeight / 2);
        ctx.restore();

        // Overlay is handled by CSS/HTML to avoid polluting the crop result?
        // Actually for cropping we need to extract the pixels.
    };

    useEffect(() => {
        let animationFrameId: number;

        const render = () => {
            draw();
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [image, scale, offset]);


    const cropImage = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Use a temporary canvas to create the final cropped image
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = 300;
        outputCanvas.height = 300;
        const ctx = outputCanvas.getContext('2d');
        if (!ctx) return;

        if (circular) {
            ctx.beginPath();
            ctx.arc(150, 150, 150, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
        }

        ctx.drawImage(canvas, 0, 0, 300, 300);

        // Export
        const dataUrl = outputCanvas.toDataURL('image/webp', 0.8); // WebP for smaller size
        onCropComplete(dataUrl);
    };


    return (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Adjust Photo</h3>
                    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div
                    ref={containerRef}
                    className="relative bg-gray-900 w-full aspect-square overflow-hidden cursor-move touch-none flex items-center justify-center"
                    onMouseDown={handlePointerDown as any}
                    onMouseMove={handlePointerMove as any}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                    onWheel={handleWheel}
                >
                    {/* Circular Mask Overlay */}
                    {circular && (
                        <div className="absolute inset-0 pointer-events-none z-10 box-border rounded-full border-[100vw] border-black/50"
                            style={{
                                width: '300px',
                                height: '300px',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                margin: '-100vw'  // Trick to make border huge
                            }}
                        ></div>
                    )}

                    {/* Guide Box (if not circular) */}
                    {!circular && (
                        <div className="absolute inset-0 pointer-events-none z-10 border-2 border-white/50 w-[300px] h-[300px] m-auto"></div>
                    )}

                    <canvas ref={canvasRef} className="block" />
                </div>

                <div className="p-4 bg-gray-50 border-t space-y-4">
                    <div className="flex items-center gap-4">
                        <ZoomOut size={20} className="text-gray-400" />
                        <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.05"
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="flex-1 accent-blue-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <ZoomIn size={20} className="text-gray-400" />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={cropImage}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            <Check size={20} />
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
