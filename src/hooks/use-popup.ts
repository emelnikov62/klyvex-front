import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Hook for managing popup/dropdown state with automatic click-outside handling
 * @param isMobile - If true, disables click-outside handling (mobile uses bottom sheets)
 * @returns Object with popup state and control functions
 */
export function usePopup<T extends string>(isMobile: boolean = false) {
    const [openPopup, setOpenPopup] = useState<T | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const toggle = useCallback((key: T) => {
        setOpenPopup((prev) => (prev === key ? null : key));
    }, []);

    const open = useCallback((key: T) => {
        setOpenPopup(key);
    }, []);

    const close = useCallback(() => {
        setOpenPopup(null);
    }, []);

    // Close on click outside and Escape key
    useEffect(() => {
        if (!openPopup || isMobile) return;

        const handleMouseDown = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                close();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                close();
            }
        };

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [openPopup, close, isMobile]);

    return {
        openPopup,
        setOpenPopup,
        toggle,
        open,
        close,
        containerRef,
        isOpen: (key: T) => openPopup === key,
    };
}

/**
 * Hook for managing fullscreen image preview state
 * @returns Object with preview state and control functions
 */
export function useImagePreview<T extends { url: string; name?: string }>() {
    const [previewImage, setPreviewImage] = useState<T | null>(null);

    const openPreview = useCallback((image: T) => {
        setPreviewImage(image);
    }, []);

    const closePreview = useCallback(() => {
        setPreviewImage(null);
    }, []);

    return {
        previewImage,
        openPreview,
        closePreview,
        isPreviewOpen: previewImage !== null,
    };
}