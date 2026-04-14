import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ImagePreviewProps {
    imageUrl: string;
    imageName?: string;
    onClose: () => void;
}

/**
 * Fullscreen image preview component
 * Used by DesignParamsBar and VideoParamsBar for image preview
 */
export function ImagePreview({ imageUrl, imageName, onClose }: ImagePreviewProps) {
    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={onClose}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            tabIndex={0}
            ref={(el) => el?.focus()}
        >
            <button
                onClick={onClose}
                className="fixed top-5 right-5 h-10 w-10 rounded-xl flex items-center justify-center z-[10000]"
                style={{ background: "rgba(255,255,255,0.1)" }}
            >
                <X className="h-5 w-5 text-white" />
            </button>
            <img
                src={imageUrl}
                alt={imageName || "Preview"}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            />
        </div>,
        document.body
    );
}