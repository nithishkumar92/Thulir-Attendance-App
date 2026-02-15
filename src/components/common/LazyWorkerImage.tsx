import React, { useState, useEffect } from 'react';

interface LazyWorkerImageProps {
    src?: string;
    alt: string;
    className?: string;
    fallbackText?: string;
}

export const LazyWorkerImage: React.FC<LazyWorkerImageProps> = ({
    src,
    alt,
    className,
    fallbackText
}) => {
    const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (src) {
            setImgSrc(src);
            setHasError(false);
            setIsLoading(true);
        } else {
            setIsLoading(false);
            setHasError(true);
        }
    }, [src]);

    const handleLoad = () => {
        setIsLoading(false);
        setHasError(false);
    };

    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    // If no source or error, show fallback
    if (!src || hasError) {
        return (
            <div className={`flex items-center justify-center bg-gray-200 text-gray-500 font-bold ${className}`} title={alt}>
                {fallbackText || alt.substring(0, 2).toUpperCase()}
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                    <span className="text-gray-300 text-xs">...</span>
                </div>
            )}
            <img
                src={imgSrc}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={handleLoad}
                onError={handleError}
                loading="lazy"
            />
        </div>
    );
};
