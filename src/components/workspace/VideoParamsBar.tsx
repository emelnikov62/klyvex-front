import {useCallback, useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {Check, ChevronDown, Image, RefreshCw, Settings, Upload, X} from "lucide-react";
import {DEFAULT_VIDEO_SETTINGS, VIDEO_MODEL_CONFIG, VIDEO_PRESETS, type VideoSettings, type KeyframeImageRef,} from "@/lib/video-types";
import type {StoredFile} from "@/hooks/use-panel-state";
import MobileBottomSheet from "@/components/ui/mobile-bottom-sheet";
import AttachmentPicker from "./AttachmentPicker";

interface VideoParamsBarProps {
    settings: VideoSettings;
    onSettingsChange: (s: VideoSettings) => void;
    modelId: string;
    isMobile?: boolean;
    uploadedFiles?: StoredFile[];
    onAddUploadedFile?: (file: StoredFile) => void;
    generatedFiles?: StoredFile[];
}

type DropdownKey = "mode" | "ar" | "dur" | "res" | "settings" | "keyframe1" | "keyframe2";

const VideoParamsBar = ({settings, onSettingsChange, modelId, isMobile, uploadedFiles = [], onAddUploadedFile, generatedFiles = []}: VideoParamsBarProps) => {
    const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);
    const [previewImage, setPreviewImage] = useState<KeyframeImageRef | null>(null);
    const [showKeyframePicker, setShowKeyframePicker] = useState<'keyframeImage1' | 'keyframeImage2' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const keyframe1InputRef = useRef<HTMLInputElement>(null);
    const keyframe2InputRef = useRef<HTMLInputElement>(null);
    const config = VIDEO_MODEL_CONFIG[modelId] ?? VIDEO_MODEL_CONFIG.kling;

    const toggle = useCallback((key: DropdownKey) =>
        setOpenDropdown((prev) => (prev === key ? null : key)), []);

    const close = useCallback(() => setOpenDropdown(null), []);

    useEffect(() => {
        if (!openDropdown || isMobile) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
        };
        const escHandler = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        document.addEventListener("mousedown", handler);
        document.addEventListener("keydown", escHandler);
        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("keydown", escHandler);
        };
    }, [openDropdown, close, isMobile]);

    const update = (partial: Partial<VideoSettings>) =>
        onSettingsChange({...settings, ...partial});

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleKeyframeUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: 'keyframeImage1' | 'keyframeImage2') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const base64 = await fileToBase64(file);
        update({[key]: {name: file.name, url, base64}});
        // Save to uploaded files list
        if (onAddUploadedFile) {
            onAddUploadedFile({
                id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                type: "image",
                url,
                name: file.name,
                createdAt: new Date(),
            });
        }
        e.target.value = "";
    };

    const removeKeyframeImage = (key: 'keyframeImage1' | 'keyframeImage2') => {
        update({[key]: null});
    };

    const isKeyframesMode = settings.mode === "keyframes";

    const pillBase = "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer shrink-0";
    const pillInactive = "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30";
    const pillActive = "bg-primary/10 text-primary border border-primary/40";
    const popupBase = "absolute bottom-[calc(100%+8px)] rounded-xl border border-border bg-card shadow-xl z-[1000] max-h-[70vh] overflow-y-auto animate-popup-fade";

    const renderListContent = (
        options: { value: string; label: string }[],
        currentValue: any,
        onSelect: (v: string) => void,
    ) => (
        <div className="p-1.5">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => {
                        onSelect(opt.value);
                        close();
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        currentValue === opt.value
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                    }`}
                >
                    {opt.label}
                    {currentValue === opt.value && <Check className="h-3.5 w-3.5"/>}
                </button>
            ))}
        </div>
    );

    const renderDropdown = (
        key: DropdownKey,
        label: any,
        title: string,
        options: { value: any; label: string }[],
        currentValue: any,
        onSelect: (v: any) => void,
        width = "w-52",
        alignRight = false,
    ) => {
        const content = renderListContent(options, currentValue, onSelect);

        return (
            <div className="relative">
                <button onClick={() => toggle(key)} className={`${pillBase} ${pillInactive}`}>
                    {label}
                    <ChevronDown className="h-2.5 w-2.5"/>
                </button>
                {isMobile ? (
                    <MobileBottomSheet open={openDropdown === key} onClose={close} title={title}>
                        {content}
                    </MobileBottomSheet>
                ) : (
                    openDropdown === key && (
                        <div className={`${popupBase} ${alignRight ? "right-0" : "left-0"} ${width} p-0`}>
                            {content}
                        </div>
                    )
                )}
            </div>
        );
    };

    const modeLabel = config.modes.find((m) => m.value === settings.mode)?.label ?? settings.mode;

    // Keyframe popup contents
    const keyframe1Content = (
        <div>
            <input
                ref={keyframe1InputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleKeyframeUpload(e, 'keyframeImage1')}
            />
            {settings.keyframeImage1 ? (
                <div className="space-y-2">
                    <div className="relative">
                        <img
                            src={settings.keyframeImage1.url}
                            className="h-24 w-full rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => { setPreviewImage(settings.keyframeImage1); close(); }}
                        />
                        <button
                            onClick={() => removeKeyframeImage('keyframeImage1')}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                        >
                            <X className="h-2.5 w-2.5"/>
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowKeyframePicker('keyframeImage1')}
                            className="flex-1 h-8 rounded-lg border border-border hover:border-primary/30 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Image className="h-3 w-3"/>
                            Выбрать
                        </button>
                        <button
                            onClick={() => keyframe1InputRef.current?.click()}
                            className="flex-1 h-8 rounded-lg border border-dashed border-border hover:border-primary/30 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Upload className="h-3 w-3"/>
                            Загрузить
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowKeyframePicker('keyframeImage1')}
                        className="flex-1 h-20 rounded-xl border border-border hover:border-primary/30 flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Image className="h-4 w-4"/>
                        Выбрать
                    </button>
                    <button
                        onClick={() => keyframe1InputRef.current?.click()}
                        className="flex-1 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/30 flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Upload className="h-4 w-4"/>
                        Загрузить
                    </button>
                </div>
            )}
        </div>
    );

    const keyframe2Content = (
        <div>
            <input
                ref={keyframe2InputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleKeyframeUpload(e, 'keyframeImage2')}
            />
            {settings.keyframeImage2 ? (
                <div className="space-y-2">
                    <div className="relative">
                        <img
                            src={settings.keyframeImage2.url}
                            className="h-24 w-full rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => { setPreviewImage(settings.keyframeImage2); close(); }}
                        />
                        <button
                            onClick={() => removeKeyframeImage('keyframeImage2')}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                        >
                            <X className="h-2.5 w-2.5"/>
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowKeyframePicker('keyframeImage2')}
                            className="flex-1 h-8 rounded-lg border border-border hover:border-primary/30 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Image className="h-3 w-3"/>
                            Выбрать
                        </button>
                        <button
                            onClick={() => keyframe2InputRef.current?.click()}
                            className="flex-1 h-8 rounded-lg border border-dashed border-border hover:border-primary/30 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Upload className="h-3 w-3"/>
                            Загрузить
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowKeyframePicker('keyframeImage2')}
                        className="flex-1 h-20 rounded-xl border border-border hover:border-primary/30 flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Image className="h-4 w-4"/>
                        Выбрать
                    </button>
                    <button
                        onClick={() => keyframe2InputRef.current?.click()}
                        className="flex-1 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/30 flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Upload className="h-4 w-4"/>
                        Загрузить
                    </button>
                </div>
            )}
        </div>
    );

    // Render popup helper (similar to DesignParamsBar)
    const renderPopup = (key: DropdownKey, title: string, content: React.ReactNode, desktopClass: string) => {
        if (isMobile) {
            return (
                <MobileBottomSheet open={openDropdown === key} onClose={close} title={title}>
                    {content}
                </MobileBottomSheet>
            );
        }
        if (openDropdown !== key) return null;
        return <div className={`${popupBase} ${desktopClass}`}>{content}</div>;
    };

    const advancedContent = (
        <div className="space-y-4">
            <div>
                <span className="text-[10px] font-bold text-muted-foreground tracking-widest block mb-2">ИСКЛЮЧИТЬ (--NO)</span>
                <textarea
                    value={settings.negativePrompt}
                    onChange={(e) => update({negativePrompt: e.target.value})}
                    placeholder="Размытие, дрожание, артефакты..."
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-text-hint focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
                />
            </div>
            {config.hasPresets && (
                <div>
                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest block mb-2">ПРЕСЕТЫ</span>
                    <div className="relative">
                        <select
                            value={settings.preset}
                            onChange={(e) => update({preset: e.target.value})}
                            className="w-full h-8 rounded-lg border border-border bg-background px-3 text-xs text-foreground appearance-none cursor-pointer focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                        >
                            {VIDEO_PRESETS.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none"/>
                    </div>
                </div>
            )}
        </div>
    );

    // Show resolution only for text-to-video modes (or if no modes available like sora)
    const isTextToVideoMode = settings.mode === "text" || settings.mode === "4.5-t2v";
    const showResolution = config.resolutions && (config.modes.length === 0 || isTextToVideoMode);

    return (
        <div ref={containerRef} className="flex items-center gap-1.5 flex-wrap">
            {config.modes.length > 0 && renderDropdown("mode", modeLabel, "РЕЖИМ", config.modes, settings.mode, (v) => update({mode: v}), "w-56")}
            {renderDropdown("ar", settings.aspectRatio, "СООТНОШЕНИЕ", config.aspectRatios, settings.aspectRatio, (v) => update({aspectRatio: v}), "w-44")}
            {renderDropdown("dur", settings.duration, "ДЛИТЕЛЬНОСТЬ", config.durations, settings.duration, (v) => update({duration: v}), "w-32")}
            {showResolution && renderDropdown("res", settings.resolution, "РАЗРЕШЕНИЕ", config.resolutions, settings.resolution, (v) => update({resolution: v}), "w-36")}

            {/* Keyframe image buttons - only for keyframes mode */}
            {isKeyframesMode && (
                <>
                    {/* First keyframe button */}
                    <div className="relative">
                        <button onClick={() => toggle("keyframe1")} className={`${pillBase} ${settings.keyframeImage1 ? pillActive : pillInactive}`}>
                            <Image className="h-3 w-3"/>
                            Первый кадр
                            {settings.keyframeImage1 && <span className="w-2 h-2 rounded-full bg-primary"/>}
                        </button>
                        {renderPopup("keyframe1", "ПЕРВЫЙ КАДР", keyframe1Content, "left-0 w-48 p-3")}
                    </div>
                    {/* Second keyframe button */}
                    <div className="relative">
                        <button onClick={() => toggle("keyframe2")} className={`${pillBase} ${settings.keyframeImage2 ? pillActive : pillInactive}`}>
                            <Image className="h-3 w-3"/>
                            Последний кадр
                            {settings.keyframeImage2 && <span className="w-2 h-2 rounded-full bg-primary"/>}
                        </button>
                        {renderPopup("keyframe2", "ПОСЛЕДНИЙ КАДР", keyframe2Content, "left-0 w-48 p-3")}
                    </div>
                </>
            )}

            {/* Advanced settings */}
            <div className="relative">
                <button onClick={() => toggle("settings")} className={`${pillBase} ${pillInactive}`}>
                    <Settings className="h-3 w-3"/>
                </button>
                {isMobile ? (
                    <MobileBottomSheet open={openDropdown === "settings"} onClose={close} title={config.advancedTitle}>
                        {advancedContent}
                    </MobileBottomSheet>
                ) : (
                    openDropdown === "settings" && (
                        <div className={`${popupBase} right-0 w-80 p-4`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-muted-foreground tracking-widest">{config.advancedTitle}</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => onSettingsChange({...DEFAULT_VIDEO_SETTINGS})}
                                            className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                                            title="Сброс">
                                        <RefreshCw className="h-3 w-3"/>
                                    </button>
                                    <button onClick={close}
                                            className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                                        <X className="h-3.5 w-3.5"/>
                                    </button>
                                </div>
                            </div>
                            {advancedContent}
                        </div>
                    )
                )}
            </div>

            {/* Fullscreen image preview */}
            {previewImage && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
                    onClick={() => setPreviewImage(null)}
                    onKeyDown={(e) => e.key === "Escape" && setPreviewImage(null)}
                    tabIndex={0}
                    ref={(el) => el?.focus()}
                >
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="fixed top-5 right-5 h-10 w-10 rounded-xl flex items-center justify-center z-[10000]"
                        style={{background: "rgba(255,255,255,0.1)"}}
                    >
                        <X className="h-5 w-5 text-white"/>
                    </button>
                    <img
                        src={previewImage.url}
                        alt={previewImage.name}
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>,
                document.body
            )}

            {/* Keyframe Image Picker */}
            <AttachmentPicker
                open={showKeyframePicker !== null}
                onClose={() => setShowKeyframePicker(null)}
                onSelect={async (files) => {
                    if (files.length > 0 && showKeyframePicker) {
                        const file = files[0];
                        // Convert to KeyframeImageRef with base64
                        let base64: string | undefined;
                        if (file.url.startsWith('blob:')) {
                            try {
                                const response = await fetch(file.url);
                                const blob = await response.blob();
                                base64 = await new Promise<string>((resolve) => {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        const result = reader.result as string;
                                        resolve(result.split(',')[1]);
                                    };
                                    reader.readAsDataURL(blob);
                                });
                            } catch (e) {
                                console.error('Failed to convert to base64:', e);
                            }
                        }
                        update({
                            [showKeyframePicker]: {
                                name: file.name,
                                url: file.url,
                                base64
                            }
                        });
                    }
                }}
                maxFiles={1}
                currentCount={0}
                acceptedTypes={["image"]}
                uploadedFiles={uploadedFiles}
                onSaveUploadedFile={onAddUploadedFile}
                generatedFiles={generatedFiles}
            />
        </div>
    );
};

export default VideoParamsBar;
