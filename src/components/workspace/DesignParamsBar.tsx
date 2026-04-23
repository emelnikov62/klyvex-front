import {useCallback, useEffect, useRef, useState} from "react";
import {Check, ChevronDown, Palette, Settings, Sparkles, Upload, User, X, Zap,} from "lucide-react";
import {ASPECT_RATIOS, type DesignSettings, QUALITY_OPTIONS, type StyleRef} from "@/lib/design-types";
import type {StoredFile} from "@/lib/types/chat";
import {fileToBase64} from "@/lib/utils/file";
import {ImagePreview} from "@/components/ui/image-preview";
import MobileBottomSheet from "@/components/ui/mobile-bottom-sheet";
import AttachmentPicker from "./AttachmentPicker";
import {createPortal} from "react-dom";

interface DesignParamsBarProps {
    settings: DesignSettings;
    onSettingsChange: (s: DesignSettings) => void;
    modelName: string;
    modelId: string;
    isMobile?: boolean;
    uploadedFiles?: StoredFile[];
    onAddUploadedFile?: (file: StoredFile) => void;
    generatedFiles?: StoredFile[];
}

type PopupKey = "ar" | "quality" | "style" | "char" | "settings" | null;

const DesignParamsBar = ({settings, onSettingsChange, modelName, modelId, isMobile, uploadedFiles = [], onAddUploadedFile, generatedFiles = []}: DesignParamsBarProps) => {
    const [openPopup, setOpenPopup] = useState<PopupKey>(null);
    const [previewImage, setPreviewImage] = useState<StyleRef | null>(null);
    const [showStylePicker, setShowStylePicker] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const styleInputRef = useRef<HTMLInputElement>(null);
    const charInputRef = useRef<HTMLInputElement>(null);

    const isMidjourney = modelId.toLowerCase() === "midjourney";

    const toggle = useCallback((key: PopupKey) => {
        setOpenPopup((prev) => (prev === key ? null : key));
    }, []);

    const close = useCallback(() => setOpenPopup(null), []);

    useEffect(() => {
        if (!openPopup || isMobile) return;
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
    }, [openPopup, close, isMobile]);

    const update = (partial: Partial<DesignSettings>) =>
        onSettingsChange({...settings, ...partial});

    const handleStyleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        for (const file of Array.from(files)) {
            if (settings.styleRefs.length >= 5) break;
            const url = URL.createObjectURL(file);
            const base64 = await fileToBase64(file);
            const styleRef = {name: file.name, url, base64};
            update({styleRefs: [...settings.styleRefs, styleRef]});
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
        }
        e.target.value = "";
    };

    const handleCharUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        for (const file of Array.from(files)) {
            if (settings.characterRefs.length >= 5) break;
            const url = URL.createObjectURL(file);
            const base64 = await fileToBase64(file);
            const charRef = {name: file.name, url, base64};
            update({characterRefs: [...settings.characterRefs, charRef]});
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
        }
        e.target.value = "";
    };

    const pillBase = "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer shrink-0";
    const pillInactive = "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30";
    const pillActive = "bg-secondary text-primary border border-primary/40";
    const popupBase = "absolute bottom-[calc(100%+8px)] rounded-xl border border-border bg-card shadow-xl z-[1000] max-h-[70vh] overflow-y-auto animate-popup-fade";

    /* ── Popup content renderers (shared between desktop popup & mobile bottom-sheet) ── */

    const arContent = (
        <div className="p-1.5">
            {ASPECT_RATIOS.map((ar) => (
                <button
                    key={ar.value}
                    onClick={() => {
                        update({aspectRatio: ar.value});
                        close();
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        settings.aspectRatio === ar.value
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                    }`}
                >
                    {ar.label}
                    {settings.aspectRatio === ar.value && <Check className="h-3.5 w-3.5"/>}
                </button>
            ))}
        </div>
    );

    const qualityContent = (
        <div className="p-1.5">
            {QUALITY_OPTIONS.map((q) => (
                <button
                    key={q.value}
                    onClick={() => {
                        update({quality: q.value});
                        close();
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        settings.quality === q.value
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                    }`}
                >
                    <div>
                        <span>{q.label}</span>
                        {q.subtitle && <span className="ml-2 text-[10px] text-muted-foreground">{q.subtitle}</span>}
                    </div>
                    {settings.quality === q.value && <Check className="h-3.5 w-3.5"/>}
                </button>
            ))}
        </div>
    );

    const styleContent = (
        <div>
            {settings.styleRefs.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                    {settings.styleRefs.map((ref, i) => (
                        <div key={i} className="relative group">
                            <img
                                src={ref.url}
                                className="h-14 w-14 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => { setPreviewImage(ref); close(); }}
                            />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    update({styleRefs: settings.styleRefs.filter((_, j) => j !== i)});
                                }}
                                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                            >
                                <X className="h-2.5 w-2.5"/>
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <input ref={styleInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleStyleUpload}/>
            <div className="flex gap-2">
                <button
                    onClick={() => setShowStylePicker(true)}
                    disabled={settings.styleRefs.length >= 5}
                    className="flex-1 h-12 rounded-xl border border-border hover:border-primary/30 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                >
                    <Palette className="h-4 w-4"/>
                    Выбрать
                </button>
                <button
                    onClick={() => styleInputRef.current?.click()}
                    disabled={settings.styleRefs.length >= 5}
                    className="flex-1 h-12 rounded-xl border-2 border-dashed border-border hover:border-primary/30 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                >
                    <Upload className="h-4 w-4"/>
                    Загрузить
                </button>
            </div>
        </div>
    );

    const charContent = (
        <div>
            {settings.characterRefs.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                    {settings.characterRefs.map((ref, i) => (
                        <div key={i} className="relative group">
                            <img
                                src={ref.url}
                                className="h-14 w-14 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => { setPreviewImage(ref); close(); }}
                            />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    update({characterRefs: settings.characterRefs.filter((_, j) => j !== i)});
                                }}
                                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                            >
                                <X className="h-2.5 w-2.5"/>
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <input ref={charInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleCharUpload}/>
            <button
                onClick={() => charInputRef.current?.click()}
                disabled={settings.characterRefs.length >= 5}
                className="w-full h-16 rounded-xl border-2 border-dashed border-border hover:border-primary/30 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
                <Upload className="h-4 w-4"/>
                + Загрузить
            </button>
        </div>
    );

    const settingsContent = (
        <div className="space-y-4">
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-foreground">Хаос</label>
                    <span className="text-[11px] text-primary font-semibold">{settings.chaos}</span>
                </div>
                <input type="range" min={0} max={100} value={settings.chaos}
                       onChange={(e) => update({chaos: Number(e.target.value)})}
                       className="w-full h-1.5 rounded-full bg-border appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_8px_hsl(73_100%_50%/0.5)]"
                />
            </div>
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-foreground">Стилизация</label>
                    <span className="text-[11px] text-primary font-semibold">{settings.stylize}</span>
                </div>
                <input type="range" min={0} max={1000} value={settings.stylize}
                       onChange={(e) => update({stylize: Number(e.target.value)})}
                       className="w-full h-1.5 rounded-full bg-border appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_8px_hsl(73_100%_50%/0.5)]"
                />
            </div>
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-foreground">Необычность (Weird)</label>
                    <span className="text-[11px] text-primary font-semibold">{settings.weird}</span>
                </div>
                <input type="range" min={0} max={3000} value={settings.weird}
                       onChange={(e) => update({weird: Number(e.target.value)})}
                       className="w-full h-1.5 rounded-full bg-border appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_8px_hsl(73_100%_50%/0.5)]"
                />
            </div>
            <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">ИСКЛЮЧИТЬ (--NO)</label>
                <input type="text" value={settings.negativePrompt}
                       onChange={(e) => update({negativePrompt: e.target.value})}
                       placeholder="Введите элементы для исключения..."
                       className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground placeholder:text-text-hint focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                />
            </div>
        </div>
    );

    /* ── Render helper: desktop popup or mobile bottom-sheet ── */
    const renderPopup = (key: PopupKey, title: string, content: React.ReactNode, desktopClass: string) => {
        if (isMobile) {
            return (
                <MobileBottomSheet open={openPopup === key} onClose={close} title={title}>
                    {content}
                </MobileBottomSheet>
            );
        }
        if (openPopup !== key) return null;
        return <div className={`${popupBase} ${desktopClass}`}>{content}</div>;
    };

    return (
        <div ref={containerRef} className="flex items-center gap-1.5 flex-wrap">
            {/* Aspect ratio */}
            <div className="relative">
                <button onClick={() => toggle("ar")} className={`${pillBase} ${pillInactive}`}>
                    {settings.aspectRatio}
                    <ChevronDown className="h-2.5 w-2.5"/>
                </button>
                {renderPopup("ar", "СООТНОШЕНИЕ СТОРОН", arContent, "left-0 w-48 p-0")}
            </div>

            {/* Quality  */}
            <div className="relative">
                <button onClick={() => toggle("quality")} className={`${pillBase} ${pillInactive}`}>
                    {settings.quality}
                    <ChevronDown className="h-2.5 w-2.5"/>
                </button>
                {renderPopup("quality", "КАЧЕСТВО", qualityContent, "left-0 w-52 p-0")}
            </div>

            {/* Midjourney-only controls */}
            {isMidjourney && (
                <>
                    {/* eslint-disable-next-line no-constant-binary-expression */}
                    {(1 != 1) && <button
                        onClick={() => update({rawMode: !settings.rawMode})}
                        className={`${pillBase} ${settings.rawMode ? pillActive : pillInactive}`}
                    >
                        {settings.rawMode && <Sparkles className="h-3 w-3"/>}
                        Raw
                    </button>}
                    <button
                        onClick={() => update({turboMode: !settings.turboMode})}
                        className={`${pillBase} ${settings.turboMode ? pillActive : pillInactive}`}
                    >
                        {settings.turboMode && <Zap className="h-3 w-3"/>}
                        Turbo
                    </button>

                    {/* Style ref */}
                    <div className="relative">
                        <button onClick={() => toggle("style")} className={`${pillBase} ${pillInactive}`}>
                            <Palette className="h-3 w-3"/>
                            Style
                            {settings.styleRefs.length > 0 && <span className="ml-0.5 text-primary">{settings.styleRefs.length}</span>}
                        </button>
                        {renderPopup("style", `STYLE ${settings.styleRefs.length}/5`, styleContent, "left-0 w-64 p-4")}
                    </div>

                    {/* Character ref */
                    }
                    {/* eslint-disable-next-line no-constant-binary-expression */
                    }
                    {
                        // eslint-disable-next-line no-constant-binary-expression
                        (1 != 1) && <>
                            <div className="relative">
                                <button onClick={() => toggle("char")} className={`${pillBase} ${pillInactive}`}>
                                    <User className="h-3 w-3"/>
                                    Character
                                    {settings.characterRefs.length > 0 && <span className="ml-0.5 text-primary">{settings.characterRefs.length}</span>}
                                </button>
                                {renderPopup("char", `CHARACTER ${settings.characterRefs.length}/5`, charContent, "right-0 w-64 p-4")}
                            </div>
                        </>
                    }

                    {/* Settings */
                    }
                    <div className="relative">
                        <button onClick={() => toggle("settings")} className={`${pillBase} ${pillInactive}`}>
                            <Settings className="h-3 w-3"/>
                        </button>
                        {renderPopup("settings", "НАСТРОЙКИ ГЕНЕРАЦИИ", settingsContent, "right-0 w-72 p-4")}
                    </div>
                </>
            )}

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

            {/* Style Image Picker */}
            <AttachmentPicker
                open={showStylePicker}
                onClose={() => setShowStylePicker(false)}
                onSelect={async (files) => {
                    const remaining = 5 - settings.styleRefs.length;
                    const toAdd = files.slice(0, remaining);

                    for (const file of toAdd) {
                        // Convert to StyleRef with base64
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
                            styleRefs: [...settings.styleRefs, {
                                name: file.name,
                                url: file.url,
                                base64
                            }]
                        });
                    }
                }}
                maxFiles={5}
                currentCount={settings.styleRefs.length}
                acceptedTypes={["image"]}
                uploadedFiles={uploadedFiles}
                onSaveUploadedFile={onAddUploadedFile}
                generatedFiles={generatedFiles}
            />
        </div>
    )

};

export default DesignParamsBar;
