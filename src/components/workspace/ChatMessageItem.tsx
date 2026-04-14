import ReactMarkdown from "react-markdown";
import {createPortal} from "react-dom";
import {ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Loader2, Music, Pencil, Pause, Play, RefreshCw, Sparkles, Trash2, User, Volume2, VolumeX, X, ZoomIn} from "lucide-react";
import {type AttachedFile, type ChatMessage} from "@/hooks/use-panel-state";
import {type DesignSettings} from "@/lib/design-types";
import {type VideoSettings} from "@/lib/video-types";
import {toast} from "@/hooks/use-toast";
import {useAuth} from "@/contexts/AuthContext";
import {AiModel} from "@/lib/kernel/models/main/AiModel";
import {getModelIcon} from "@/lib/models";
import {useCallback, useEffect, useRef, useState} from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatMessageItemProps {
    message: ChatMessage;
    onDelete?: (id: string) => void;
    onRegenerate?: (prompt: string, attachments?: AttachedFile[]) => void;
    regenerateAttachments?: AttachedFile[];
    onEdit?: (content: string, attachments?: AttachedFile[], designSettings?: DesignSettings, modelId?: string, videoSettings?: VideoSettings, audioSettings?: AudioSettings) => void;
    prevUserContent?: string;
    prevUserDesignSettings?: DesignSettings;
    prevUserModelId?: string;
    prevUserVideoSettings?: VideoSettings;
    prevUserAudioSettings?: AudioSettings;
}

const actionBtnClass =
    "flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors";

const ChatMessageItem = ({message, onDelete, onRegenerate, regenerateAttachments, onEdit, prevUserContent, prevUserDesignSettings, prevUserModelId, prevUserVideoSettings, prevUserAudioSettings}: ChatMessageItemProps) => {
    const isUser = message.role === "user";
    const {listModels} = useAuth();
    const model: AiModel = message.modelId ? listModels.find((m) => m.key.toLowerCase() === message.modelId.toLowerCase()) : null;
    const ModelIcon = getModelIcon(model?.icon);
    const [previewAttachment, setPreviewAttachment] = useState<AttachedFile | null>(null);
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
    const [showControls, setShowControls] = useState(true);

    // Get image attachments
    const imageAttachments = message.attachments?.filter(a => a.isImage) || [];
    const videoAttachments = message.attachments?.filter(a => a.isVideo) || [];
    const audioAttachments = message.attachments?.filter(a => a.isAudio) || [];
    const isMidjourney = model?.key.toLowerCase() === "midjourney" && imageAttachments.length === 4;
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Audio player state
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioCurrentTime, setAudioCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [audioWaveform, setAudioWaveform] = useState<number[]>([]);
    const [isWaveformLoading, setIsWaveformLoading] = useState(true);

    // Generate waveform from audio file
    useEffect(() => {
        if (audioAttachments.length === 0) return;
        const audioUrl = audioAttachments[0]?.url;
        if (!audioUrl) return;

        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

        const generateWaveform = async () => {
            try {
                const response = await fetch(audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const channelData = audioBuffer.getChannelData(0);
                const samples = 60;
                const blockSize = Math.floor(channelData.length / samples);
                const waveform: number[] = [];

                for (let i = 0; i < samples; i++) {
                    let sum = 0;
                    const start = blockSize * i;
                    for (let j = 0; j < blockSize; j++) {
                        sum += Math.abs(channelData[start + j] || 0);
                    }
                    waveform.push(sum / blockSize);
                }

                const max = Math.max(...waveform);
                const normalized = waveform.map((v) => 0.15 + (v / max) * 0.85);

                setAudioWaveform(normalized);
                setIsWaveformLoading(false);
            } catch {
                setAudioWaveform(Array.from({ length: 60 }, () => 0.3 + Math.random() * 0.4));
                setIsWaveformLoading(false);
            }
        };

        generateWaveform();

        return () => {
            audioContext.close();
        };
    }, [audioAttachments]);

    const toggleAudioPlay = () => {
        if (!audioRef.current) return;
        if (isAudioPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsAudioPlaying(!isAudioPlaying);
    };

    const toggleAudioMute = () => {
        if (!audioRef.current) return;
        audioRef.current.muted = !isAudioMuted;
        setIsAudioMuted(!isAudioMuted);
    };

    const handleAudioTimeUpdate = () => {
        if (!audioRef.current) return;
        const current = audioRef.current.currentTime;
        const total = audioRef.current.duration;
        setAudioCurrentTime(current);
        setAudioProgress((current / total) * 100);
    };

    const handleAudioLoadedMetadata = () => {
        if (!audioRef.current) return;
        setAudioDuration(audioRef.current.duration);
    };

    const handleAudioSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioRef.current.currentTime = percent * audioDuration;
    };

    const formatAudioTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const activeWaveformBar = Math.floor((audioProgress / 100) * audioWaveform.length);

    const getModelName = (modelId: string) => {
        switch (modelId) {
            case "suno": return "Suno V5";
            case "udio": return "Udio";
            default: return modelId;
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        toast({title: "Скопировано", description: "Текст скопирован в буфер обмена"});
    };

    const handleDownload = (url: string, filename?: string) => {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || `file-${Date.now()}`;
        a.target = "_blank";
        a.click();
        toast({title: "Скачивание начато"});
    };

    const handleDownloadAll = (attachments: AttachedFile[]) => {
        attachments.forEach((att, index) => {
            setTimeout(() => {
                handleDownload(att.url, att.name || `file-${index + 1}-${Date.now()}`);
            }, index * 200);
        });
        toast({title: "Скачивание всех файлов начато", description: `Скачивается ${attachments.length} файлов`});
    };

    // Lightbox navigation
    const goNext = useCallback(() => {
        if (lightboxIdx !== null && imageAttachments.length > 0) {
            setLightboxIdx((lightboxIdx + 1) % imageAttachments.length);
        }
    }, [lightboxIdx, imageAttachments.length]);

    const goPrev = useCallback(() => {
        if (lightboxIdx !== null && imageAttachments.length > 0) {
            setLightboxIdx((lightboxIdx - 1 + imageAttachments.length) % imageAttachments.length);
        }
    }, [lightboxIdx, imageAttachments.length]);

    // Auto-hide controls in lightbox
    useEffect(() => {
        if (lightboxIdx === null) return;
        setShowControls(true);
        const timer = setTimeout(() => setShowControls(false), 3000);
        return () => clearTimeout(timer);
    }, [lightboxIdx]);

    // Keyboard navigation in lightbox
    useEffect(() => {
        if (lightboxIdx === null) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLightboxIdx(null);
            if (e.key === "ArrowRight") goNext();
            if (e.key === "ArrowLeft") goPrev();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [lightboxIdx, goNext, goPrev]);

    // Close fullscreen preview on Escape
    useEffect(() => {
        if (!previewAttachment) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setPreviewAttachment(null);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [previewAttachment]);

    return (
        <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isUser
                ? "bg-surface border border-border"
                : "bg-primary/10 border border-primary/20"
            }`}>
                {isUser ? (
                    <User className="h-4 w-4 text-muted-foreground"/>
                ) : ModelIcon ? (
                    <ModelIcon className="h-4 w-4 text-primary icon-glow"/>
                ) : null}
            </div>

            {/* Message */}
            <div className={`flex flex-col gap-1.5 max-w-[85%] min-w-0 overflow-hidden ${isUser ? "items-end" : "items-start"}`}>
                {/* User attachments (reference images) */}
                {isUser && message.attachments && message.attachments.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        {message.attachments.map((att, i) => (
                            <div key={i} className="relative">
                                {att.isImage ? (
                                    <div
                                        className="relative rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setPreviewAttachment(att)}
                                    >
                                        <img src={att.url} alt={att.name} className="h-20 w-20 object-cover"/>
                                        <span
                                            className="absolute top-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[9px] font-bold text-primary">ref</span>
                                    </div>
                                ) : att.isVideo ? (
                                    <div
                                        className="relative rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity h-20 w-20 bg-black"
                                        onClick={() => setPreviewAttachment(att)}
                                    >
                                        <video src={att.url} className="h-full w-full object-cover" preload="metadata" muted/>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <div className="h-8 w-8 rounded-full bg-primary/90 flex items-center justify-center">
                                                <Play className="h-4 w-4 text-primary-foreground ml-0.5" fill="currentColor" />
                                            </div>
                                        </div>
                                        <span
                                            className="absolute top-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[9px] font-bold text-primary">ref</span>
                                    </div>
                                ) : att.isAudio ? (
                                    <div
                                        className="relative rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity h-20 w-20 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
                                        onClick={() => setPreviewAttachment(att)}
                                    >
                                        <div className="h-8 w-8 rounded-full bg-primary/90 flex items-center justify-center">
                                            <Music className="h-4 w-4 text-primary-foreground" />
                                        </div>
                                        <span
                                            className="absolute top-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[9px] font-bold text-primary">ref</span>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                                        📎 {att.name}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Assistant image results (DesignResults style) */}
                {!isUser && imageAttachments.length > 0 && (
                    <div className="space-y-2 max-w-[70%]">
                        {isMidjourney ? (
                            /* Midjourney 2x2 grid */
                            <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
                                {imageAttachments.map((img, idx) => (
                                    <div
                                        key={idx}
                                        className="relative group aspect-square cursor-pointer overflow-hidden border border-border bg-card"
                                        onClick={() => setLightboxIdx(idx)}
                                    >
                                        <img src={img.url} alt="" className="w-full h-full object-cover"/>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toast({title: `Upscale U${idx + 1}`});
                                            }}
                                            className="absolute bottom-1.5 right-1.5 rounded-md bg-background/70 backdrop-blur-sm px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/90 hover:text-foreground"
                                        >
                                            U{idx + 1}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Single image */
                            <div
                                className="relative group rounded-xl overflow-hidden border border-border bg-card cursor-pointer"
                                onClick={() => setLightboxIdx(0)}
                            >
                                <img
                                    src={imageAttachments[0]?.url}
                                    alt=""
                                    className="w-full max-h-[400px] object-contain rounded-xl"
                                />
                                <div
                                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-md bg-background/70 flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ZoomIn className="h-3 w-3"/>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {imageAttachments.length > 1 ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className={actionBtnClass}>
                                            <Download className="h-3 w-3"/>
                                            Скачать
                                            <ChevronDown className="h-3 w-3 ml-0.5"/>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="min-w-[160px]">
                                        {imageAttachments.map((img, idx) => (
                                            <DropdownMenuItem
                                                key={idx}
                                                onClick={() => handleDownload(img.url, img.name || `image-${idx + 1}-${Date.now()}.png`)}
                                                className="text-xs"
                                            >
                                                <Download className="h-3 w-3 mr-2"/>
                                                {img.name || `Изображение ${idx + 1}`}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => handleDownloadAll(imageAttachments)}
                                            className="text-xs font-medium"
                                        >
                                            <Download className="h-3 w-3 mr-2"/>
                                            Скачать все ({imageAttachments.length})
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <button onClick={() => handleDownload(imageAttachments[0]?.url)} className={actionBtnClass}>
                                    <Download className="h-3 w-3"/>
                                    Скачать
                                </button>
                            )}
                            {onEdit && prevUserContent && (
                                <button
                                    onClick={() => onEdit(prevUserContent, regenerateAttachments, prevUserDesignSettings, prevUserModelId, prevUserVideoSettings, prevUserAudioSettings)}
                                    className={actionBtnClass}
                                >
                                    <Pencil className="h-3 w-3"/>
                                    Редактировать промпт
                                </button>
                            )}
                            {onRegenerate && (
                                <button onClick={() => onRegenerate(message.content, regenerateAttachments)} className={actionBtnClass}>
                                    <RefreshCw className="h-3 w-3"/>
                                    Повторить
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(message.id)}
                                    className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    <Trash2 className="h-3 w-3"/>
                                    Удалить
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Assistant video results */}
                {!isUser && videoAttachments.length > 0 && (
                    <div className="space-y-2 max-w-[70%]">
                        <div className="rounded-2xl overflow-hidden border border-border bg-card">
                            <div className="relative aspect-video bg-black">
                                {isVideoPlaying ? (
                                    <video
                                        ref={videoRef}
                                        src={videoAttachments[0]?.url}
                                        className="w-full h-full object-contain"
                                        controls
                                        autoPlay
                                    />
                                ) : (
                                    <div
                                        className="relative w-full h-full cursor-pointer"
                                        onClick={() => setIsVideoPlaying(true)}
                                    >
                                        <video
                                            src={videoAttachments[0]?.url}
                                            className="w-full h-full object-cover"
                                            preload="metadata"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/10 transition-colors">
                                            <div className="h-14 w-14 rounded-full bg-primary/90 flex items-center justify-center shadow-[0_0_20px_hsl(73_100%_50%/0.4)]">
                                                <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {videoAttachments.length > 1 ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className={actionBtnClass}>
                                            <Download className="h-3 w-3"/>
                                            Скачать
                                            <ChevronDown className="h-3 w-3 ml-0.5"/>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="min-w-[160px]">
                                        {videoAttachments.map((video, idx) => (
                                            <DropdownMenuItem
                                                key={idx}
                                                onClick={() => handleDownload(video.url, video.name || `video-${idx + 1}-${Date.now()}.mp4`)}
                                                className="text-xs"
                                            >
                                                <Download className="h-3 w-3 mr-2"/>
                                                {video.name || `Видео ${idx + 1}`}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => handleDownloadAll(videoAttachments)}
                                            className="text-xs font-medium"
                                        >
                                            <Download className="h-3 w-3 mr-2"/>
                                            Скачать все ({videoAttachments.length})
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <button onClick={() => handleDownload(videoAttachments[0]?.url)} className={actionBtnClass}>
                                    <Download className="h-3 w-3"/>
                                    Скачать
                                </button>
                            )}
                            {onEdit && prevUserContent && (
                                <button
                                    onClick={() => onEdit(prevUserContent, regenerateAttachments, prevUserDesignSettings, prevUserModelId, prevUserVideoSettings, prevUserAudioSettings)}
                                    className={actionBtnClass}
                                >
                                    <Pencil className="h-3 w-3"/>
                                    Редактировать промпт
                                </button>
                            )}
                            {onRegenerate && (
                                <button onClick={() => onRegenerate(message.content, regenerateAttachments)} className={actionBtnClass}>
                                    <RefreshCw className="h-3 w-3"/>
                                    Повторить
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(message.id)}
                                    className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    <Trash2 className="h-3 w-3"/>
                                    Удалить
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Assistant audio results */}
                {!isUser && audioAttachments.length > 0 && (
                    <div className="space-y-2 min-w-[320px]">
                        {/* Audio element */}
                        <audio
                            ref={audioRef}
                            src={audioAttachments[0]?.url}
                            onTimeUpdate={handleAudioTimeUpdate}
                            onLoadedMetadata={handleAudioLoadedMetadata}
                            onEnded={() => setIsAudioPlaying(false)}
                        />

                        {/* Player card */}
                        <div className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <button
                                    onClick={toggleAudioPlay}
                                    className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-[0_0_16px_hsl(73_100%_50%/0.3)] hover:scale-105 transition-transform"
                                >
                                    {isAudioPlaying ? (
                                        <Pause className="h-4 w-4 text-primary-foreground" fill="currentColor" />
                                    ) : (
                                        <Play className="h-4 w-4 text-primary-foreground ml-0.5" fill="currentColor" />
                                    )}
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{message.content || "Generated Track"}</p>
                                    <p className="text-[11px] text-muted-foreground">{formatAudioTime(audioDuration)} · {getModelName(model?.key || "")}</p>
                                </div>
                                <button
                                    onClick={toggleAudioMute}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {isAudioMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                </button>
                            </div>

                            {/* Waveform */}
                            <div
                                className="flex items-end gap-[2px] h-12 mb-3 cursor-pointer"
                                onClick={handleAudioSeek}
                            >
                                {isWaveformLoading ? (
                                    <div className="flex items-center justify-center w-full h-full">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    audioWaveform.map((h, i) => (
                                        <div
                                            key={i}
                                            className={`flex-1 rounded-full transition-colors ${
                                                i <= activeWaveformBar ? "bg-primary" : "bg-border"
                                            }`}
                                            style={{ height: `${h * 100}%`, minHeight: 3 }}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Progress bar */}
                            <div
                                className="h-1 rounded-full bg-border mb-3 overflow-hidden cursor-pointer"
                                onClick={handleAudioSeek}
                            >
                                <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${audioProgress}%` }}
                                />
                            </div>

                            {/* Time display */}
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-3">
                                <span>{formatAudioTime(audioCurrentTime)}</span>
                                <span>{formatAudioTime(audioDuration)}</span>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {audioAttachments.length > 1 ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className={actionBtnClass}>
                                            <Download className="h-3 w-3"/>
                                            Скачать
                                            <ChevronDown className="h-3 w-3 ml-0.5"/>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="min-w-[160px]">
                                        {audioAttachments.map((audio, idx) => (
                                            <DropdownMenuItem
                                                key={idx}
                                                onClick={() => handleDownload(audio.url, audio.name || `audio-${idx + 1}-${Date.now()}.mp3`)}
                                                className="text-xs"
                                            >
                                                <Download className="h-3 w-3 mr-2"/>
                                                {audio.name || `Аудио ${idx + 1}`}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => handleDownloadAll(audioAttachments)}
                                            className="text-xs font-medium"
                                        >
                                            <Download className="h-3 w-3 mr-2"/>
                                            Скачать все ({audioAttachments.length})
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <button
                                    onClick={() => handleDownload(audioAttachments[0]?.url, audioAttachments[0]?.name || `audio-${Date.now()}.mp3`)}
                                    className={actionBtnClass}
                                >
                                    <Download className="h-3 w-3"/>
                                    Скачать
                                </button>
                            )}
                            {onEdit && prevUserContent && (
                                <button
                                    onClick={() => onEdit(prevUserContent, regenerateAttachments, prevUserDesignSettings, prevUserModelId, prevUserVideoSettings, prevUserAudioSettings)}
                                    className={actionBtnClass}
                                >
                                    <Pencil className="h-3 w-3"/>
                                    Редактировать промпт
                                </button>
                            )}
                            {onRegenerate && (
                                <button onClick={() => onRegenerate(message.content, regenerateAttachments)} className={actionBtnClass}>
                                    <RefreshCw className="h-3 w-3"/>
                                    Повторить
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(message.id)}
                                    className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    <Trash2 className="h-3 w-3"/>
                                    Удалить
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Text content - only show if not an image/video/audio generation result */}
                {message.content && !(!isUser && (imageAttachments.length > 0 || videoAttachments.length > 0 || audioAttachments.length > 0)) && (
                    <div className={`rounded-2xl px-4 py-3 max-w-full overflow-hidden ${isUser
                        ? "bg-card border border-border"
                        : "bg-card/60 border border-border"
                    }`} style={{wordBreak: "break-all", overflowWrap: "break-word"}}>
                        {isUser ? (
                            <p className="text-sm text-foreground whitespace-pre-wrap"
                               style={{wordBreak: "break-all", overflowWrap: "break-word"}}>{message.content}</p>
                        ) : (
                            <div
                                className="prose prose-sm prose-invert max-w-none text-sm text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_code]:text-primary [&_code]:bg-primary/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_blockquote]:border-primary/30 [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_pre]:bg-background [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_li]:text-muted-foreground [&_p]:text-foreground/90 [&_hr]:border-border"
                                style={{wordBreak: "break-all", overflowWrap: "break-word"}}>
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions for assistant messages - only show if not an image/video/audio generation result */}
                {!isUser && imageAttachments.length === 0 && videoAttachments.length === 0 && audioAttachments.length === 0 && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleCopy}
                            className="flex h-6 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                        >
                            <Copy className="h-3 w-3"/>
                            Копировать
                        </button>
                        {onEdit && prevUserContent && (
                            <button
                                onClick={() => onEdit(prevUserContent, regenerateAttachments, prevUserDesignSettings, prevUserModelId, prevUserVideoSettings, prevUserAudioSettings)}
                                className="flex h-6 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                                <Pencil className="h-3 w-3"/>
                                Редактировать промпт
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Fullscreen attachment preview (for user ref images/videos) */}
            {previewAttachment && createPortal(
                <div
                    className="fixed inset-0 flex items-center justify-center"
                    style={{background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)", zIndex: 9999}}
                    onClick={() => setPreviewAttachment(null)}
                >
                    <button
                        onClick={() => setPreviewAttachment(null)}
                        className="fixed top-5 right-5 h-10 w-10 rounded-xl flex items-center justify-center transition-colors"
                        style={{background: "rgba(255,255,255,0.1)", zIndex: 10000}}
                    >
                        <X className="h-5 w-5 text-white"/>
                    </button>
                    {previewAttachment.isVideo ? (
                        <video
                            src={previewAttachment.url}
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
                            controls
                            autoPlay
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : previewAttachment.isAudio ? (
                        <div
                            className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-card border border-border"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Music className="h-8 w-8 text-primary" />
                            </div>
                            <span className="text-sm text-muted-foreground max-w-[200px] truncate">{previewAttachment.name}</span>
                            <audio
                                src={previewAttachment.url}
                                controls
                                autoPlay
                                className="w-[300px]"
                            />
                        </div>
                    ) : (
                        <img
                            src={previewAttachment.url}
                            alt={previewAttachment.name}
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>,
                document.body
            )}

            {/* Lightbox for assistant images - full screen like DesignResults */}
            {lightboxIdx !== null && imageAttachments.length > 0 && createPortal(
                <div
                    className="fixed inset-0 flex items-center justify-center"
                    style={{background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)", zIndex: 9999}}
                    onClick={() => setLightboxIdx(null)}
                >
                    <button
                        onClick={() => setLightboxIdx(null)}
                        className="fixed top-5 right-5 h-10 w-10 rounded-xl flex items-center justify-center"
                        style={{background: "rgba(255,255,255,0.1)", zIndex: 10000}}
                    >
                        <X className="h-5 w-5 text-white"/>
                    </button>

                    <img
                        src={imageAttachments[lightboxIdx]?.url}
                        alt=""
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Navigation arrows for multiple images */}
                    {imageAttachments.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goPrev();
                                }}
                                className="fixed left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl flex items-center justify-center text-white"
                                style={{background: "rgba(255,255,255,0.1)"}}
                            >
                                <ChevronLeft className="h-5 w-5"/>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goNext();
                                }}
                                className="fixed right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl flex items-center justify-center text-white"
                                style={{background: "rgba(255,255,255,0.1)"}}
                            >
                                <ChevronRight className="h-5 w-5"/>
                            </button>
                            {/* Dots */}
                            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {imageAttachments.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLightboxIdx(i);
                                        }}
                                        className={`h-1.5 rounded-full transition-all ${i === lightboxIdx ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Bottom action bar */}
                    <div
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-xl px-4 py-2"
                        style={{background: "rgba(26,26,26,0.8)"}}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => handleDownload(imageAttachments[lightboxIdx]?.url, imageAttachments[lightboxIdx]?.name || `image-${lightboxIdx + 1}-${Date.now()}.png`)}
                            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
                        >
                            <Download className="h-3.5 w-3.5"/>
                            Скачать
                        </button>
                        {onEdit && prevUserContent && (
                            <button
                                onClick={() => { setLightboxIdx(null); onEdit(prevUserContent, regenerateAttachments, prevUserDesignSettings, prevUserModelId, prevUserVideoSettings, prevUserAudioSettings); }}
                                className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
                            >
                                <Pencil className="h-3.5 w-3.5"/>
                                Редактировать промпт
                            </button>
                        )}
                        {onRegenerate && (
                            <button
                                onClick={() => { setLightboxIdx(null); onRegenerate(message.content, regenerateAttachments); }}
                                className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
                            >
                                <RefreshCw className="h-3.5 w-3.5"/>
                                Повторить
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); onDelete(message.id); }}
                                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                                <Trash2 className="h-3.5 w-3.5"/>
                                Удалить
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ChatMessageItem;
