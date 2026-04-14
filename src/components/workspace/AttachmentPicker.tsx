import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, Search, Sparkles, Upload, Image, Video, Music, FileText,
  Check, Loader2, Play, Pause, ZoomIn
} from "lucide-react";
import type { StoredFile } from "@/hooks/use-panel-state";

interface AttachmentPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (files: StoredFile[]) => void;
  maxFiles?: number;
  currentCount?: number;
  acceptedTypes?: ("image" | "video" | "audio" | "file")[];
  uploadedFiles?: StoredFile[];
  onSaveUploadedFile?: (file: StoredFile) => void;
  generatedFiles?: StoredFile[];
}

const TABS = [
  { id: "generated", label: "Сгенерированные", icon: Sparkles },
  { id: "uploaded", label: "Загруженные", icon: Upload },
  { id: "upload", label: "Загрузить", icon: Upload },
] as const;

type TabId = typeof TABS[number]["id"];

function formatDate(d: Date): string {
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}д назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const AttachmentPicker = ({
  open,
  onClose,
  onSelect,
  maxFiles = 4,
  currentCount = 0,
  acceptedTypes = ["image", "video", "audio", "file"],
  uploadedFiles = [],
  onSaveUploadedFile,
  generatedFiles = [],
}: AttachmentPickerProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("upload");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<StoredFile | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewFile) {
          setPreviewFile(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose, previewFile]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setPreviewFile(null);
      setPlayingAudioId(null);
    }
  }, [open]);

  const remainingSlots = Math.max(1, (maxFiles ?? 1) - currentCount);

  const filteredFiles = useMemo(() => {
    const source = activeTab === "generated" ? generatedFiles : uploadedFiles;
    let files = source.filter(f => acceptedTypes.includes(f.type));

    if (search.trim()) {
      const q = search.toLowerCase();
      files = files.filter(f =>
        f.name?.toLowerCase().includes(q) ||
        f.prompt?.toLowerCase().includes(q)
      );
    }

    return files;
  }, [activeTab, search, acceptedTypes, generatedFiles, uploadedFiles]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else if (selectedIds.size < remainingSlots) {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleConfirm = () => {
    const source = activeTab === "generated" ? generatedFiles : uploadedFiles;
    const selectedFiles = source.filter(f => selectedIds.has(f.id));
    onSelect(selectedFiles);
    setSelectedIds(new Set());
    onClose();
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    const newUploadedFiles: StoredFile[] = [];
    const toProcess = Array.from(files).slice(0, remainingSlots);

    for (const file of toProcess) {
      const url = URL.createObjectURL(file);
      let type: StoredFile["type"] = "file";

      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("video/")) type = "video";
      else if (file.type.startsWith("audio/")) type = "audio";

      // Convert file to base64 buffer
      let buffer: string | undefined;
      try {
        const fullBase64 = await fileToBase64(file);
        buffer = fullBase64.split(',')[1];
      } catch (e) {
        console.error('Failed to convert file to base64:', e);
      }

      const storedFile: StoredFile = {
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        url,
        name: file.name,
        createdAt: new Date(),
        buffer,
      };

      newUploadedFiles.push(storedFile);

      // Save to uploaded files list for future use
      if (onSaveUploadedFile) {
        onSaveUploadedFile(storedFile);
      }
    }

    setIsUploading(false);
    onSelect(newUploadedFiles);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Прикрепить файлы</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "upload" ? (
            /* Upload tab */
            <div className="flex-1 flex flex-col items-center justify-center p-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
              <div className="w-full max-w-md">
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-surface-hover transition-colors">
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                      <span className="text-sm text-muted-foreground">Загрузка...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                      <span className="text-sm font-medium text-foreground mb-1">Нажмите для выбора файлов</span>
                      <span className="text-xs text-muted-foreground">или перетащите сюда</span>
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept={acceptedTypes.map(t => {
                      if (t === "image") return "image/*";
                      if (t === "video") return "video/*";
                      if (t === "audio") return "audio/*";
                      return "*/*";
                    }).join(",")}
                  />
                </label>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Максимум {remainingSlots} файл(ов). Поддерживаются: изображения, видео, аудио
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="px-4 py-3 border-b border-border shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-text-hint focus:border-primary/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* File grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredFiles.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {filteredFiles.map(file => {
                      const isSelected = selectedIds.has(file.id);
                      const canSelect = isSelected || selectedIds.size < remainingSlots;

                      return (
                        <div
                          key={file.id}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/30"
                              : canSelect
                                ? "border-transparent hover:border-border"
                                : "border-transparent opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <button
                            onClick={() => canSelect && toggleSelection(file.id)}
                            className="absolute inset-0 w-full h-full"
                            disabled={!canSelect}
                          />
                          {file.type === "image" && (
                            <img
                              src={file.url}
                              alt={file.name || file.prompt}
                              className="w-full h-full object-cover"
                            />
                          )}

                          {file.type === "video" && (
                            <div className="relative w-full h-full pointer-events-none">
                              <video
                                src={file.url}
                                className="w-full h-full object-cover"
                                preload="metadata"
                                muted
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="h-8 w-8 rounded-full bg-white/90 flex items-center justify-center">
                                  <Play className="h-4 w-4 text-black ml-0.5" fill="currentColor" />
                                </div>
                              </div>
                              {file.duration && (
                                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white font-medium">
                                  {file.duration}
                                </span>
                              )}
                            </div>
                          )}

                          {file.type === "audio" && (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex flex-col items-center justify-center p-2">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setPlayingAudioId(playingAudioId === file.id ? null : file.id);
                                }}
                                className="h-10 w-10 rounded-full bg-primary flex items-center justify-center mb-2"
                              >
                                {playingAudioId === file.id ? (
                                  <Pause className="h-4 w-4 text-primary-foreground" fill="currentColor" />
                                ) : (
                                  <Play className="h-4 w-4 text-primary-foreground ml-0.5" fill="currentColor" />
                                )}
                              </button>
                              <span className="text-[10px] text-foreground font-medium text-center truncate w-full">
                                {file.name || "Audio"}
                              </span>
                            </div>
                          )}

                          {file.type === "file" && (
                            <div className="w-full h-full bg-surface-hover flex flex-col items-center justify-center p-2">
                              <FileText className="h-8 w-8 text-muted-foreground mb-1" />
                              <span className="text-[10px] text-muted-foreground text-center truncate w-full">
                                {file.name}
                              </span>
                            </div>
                          )}

                          {/* Selection checkmark */}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}

                          {/* Type badge */}
                          <div className="absolute top-1.5 left-1.5 rounded bg-black/60 backdrop-blur-sm px-1.5 py-0.5 pointer-events-none">
                            {file.type === "image" && <Image className="h-3 w-3 text-white" />}
                            {file.type === "video" && <Video className="h-3 w-3 text-white" />}
                            {file.type === "audio" && <Music className="h-3 w-3 text-white" />}
                            {file.type === "file" && <FileText className="h-3 w-3 text-white" />}
                          </div>

                          {/* Preview button */}
                          {(file.type === "image" || file.type === "video" || file.type === "audio") && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setPreviewFile(file);
                              }}
                              className="absolute bottom-1.5 right-1.5 h-6 w-6 rounded-md bg-background/80 flex items-center justify-center transition-opacity"
                            >
                              <ZoomIn className="h-3 w-3 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Search className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">Ничего не найдено</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {activeTab !== "upload" && (
          <div className="flex items-center justify-between px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-border shrink-0">
            <span className="text-xs text-muted-foreground">
              Выбрано: {selectedIds.size} / {remainingSlots}
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                Прикрепить
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen file preview */}
      {previewFile && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
          onClick={() => setPreviewFile(null)}
        >
          <button
            onClick={() => setPreviewFile(null)}
            className="fixed top-5 right-5 h-10 w-10 rounded-xl flex items-center justify-center z-[10002]"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <X className="h-5 w-5 text-white" />
          </button>
          {previewFile.type === "image" && (
            <img
              src={previewFile.url}
              alt={previewFile.name || previewFile.prompt}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
              onClick={e => e.stopPropagation()}
            />
          )}
          {previewFile.type === "video" && (
            <video
              src={previewFile.url}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
              controls
              autoPlay
              onClick={e => e.stopPropagation()}
            />
          )}
          {previewFile.type === "audio" && (
            <div
              className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-card border border-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Music className="h-8 w-8 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground max-w-[200px] truncate text-center">
                {previewFile.name || previewFile.prompt || "Audio"}
              </span>
              <audio
                ref={audioRef}
                src={previewFile.url}
                controls
                autoPlay
                className="w-[300px]"
              />
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
};

export default AttachmentPicker;
