import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const MobileBottomSheet = ({ open, onClose, title, children }: MobileBottomSheetProps) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in-0 duration-200"
        style={{ zIndex: 9998 }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 rounded-t-2xl border-t border-border bg-card max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        style={{ zIndex: 9999, paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-2">
            <span className="text-xs font-bold text-muted-foreground tracking-widest">{title}</span>
            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground active:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {/* Content */}
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
};

export default MobileBottomSheet;
