import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {useNavigate} from "react-router-dom";
import {
    Banana,
    Brain,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clapperboard,
    Copy,
    Download,
    ExternalLink,
    Film,
    Image,
    MessageSquare,
    Music,
    Pause,
    Play,
    Search,
    Sparkles,
    Trash2,
    Video,
    X,
    ZoomIn,
} from "lucide-react";
import {useAuth} from "@/contexts/AuthContext";
import type {ChatSession, RequestMessage} from "@/lib/types/chat";
import {toast} from "sonner";

// ── Types ──
type ContentType = "all" | "text" | "image" | "video" | "audio";
type SortOrder = "newest" | "oldest";

interface StorageItem {
    id: string;
    requestId: number;
    type: "text" | "image" | "video" | "audio";
    modelId: string;
    modelName: string;
    prompt: string;
    createdAt: Date;
    projectId: number;
    projectName: string;
    // text
    preview?: string;
    // design
    imageUrl?: string;
    aspectRatio?: string;
    style?: string;
    // video/audio
    url?: string;
    // video
    duration?: string;
    resolution?: string;
    // audio
    trackTitle?: string;
    audioDuration?: string;
    waveform?: number[];
    // generation params
    params?: {
        // image
        width?: number;
        height?: number;
        steps?: number;
        guidance?: number;
        seed?: number;
        chaos?: number;
        stylize?: number;
        weird?: number;
        quality?: string;
        rawMode?: boolean;
        turboMode?: boolean;
        // video
        fps?: number;
        duration?: number;
        resolution?: string;
        aspectRatio?: string;
        mode?: string;
        preset?: string;
        multiShot?: boolean;
        // audio
        bpm?: number;
        key?: string;
        genre?: string;
        mood?: string;
        tempo?: string;
        instrumental?: boolean;
    };
}

const MODEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    gemini: Sparkles, chatgpt: MessageSquare, claude: Brain,
    midjourney: Image, nanobanana: Banana,
    kling: Film, runway: Clapperboard, sora: Video,
    suno: Music,
};

// Video mode labels
const VIDEO_MODE_LABELS: Record<string, string> = {
    "i2v": "Картинка → Видео",
    "text": "Текст → Видео",
    "keyframes": "Ключевые кадры",
    "o1-i2v": "Kling 01 Image→Video",
    "o1-v2v": "Kling 01 Video→Video",
    "motion": "Kling Motion",
    "4.5-t2v": "Gen 4.5 Текст → Видео",
    "4.5-i2v": "Gen 4.5 Картинка → Видео",
};

// Video preset labels
const VIDEO_PRESET_LABELS: Record<string, string> = {
    "none": "Без пресета",
    "cinematic": "Кинематографичный",
    "anime": "Аниме",
    "realistic": "Реалистичный",
};

// Audio tempo labels
const AUDIO_TEMPO_LABELS: Record<string, string> = {
    "slow": "Медленный",
    "medium": "Средний",
    "fast": "Быстрый",
};

const TYPE_FILTERS: { id: ContentType; label: string }[] = [
    {id: "all", label: "Все"},
    {id: "text", label: "Текст"},
    {id: "image", label: "Дизайн"},
    {id: "video", label: "Видео"},
    {id: "audio", label: "Аудио"},
];

const DATE_FILTERS = [
    {value: "all", label: "Всё время"},
    {value: "today", label: "Сегодня"},
    {value: "week", label: "Неделя"},
    {value: "month", label: "Месяц"},
];

// Helper: Extract generated items from user.projects
function extractStorageItemsFromProjects(
    projects: ChatSession[],
    modelMap: Map<string, string>
): StorageItem[] {
    const items: StorageItem[] = [];

    projects.forEach(project => {
        if (!project.requests) return;

        project.requests.forEach((r: RequestMessage) => {
            try {
                const request = JSON.parse(r.request);
                const response = JSON.parse(r.response);
                const prompt = request.params?.prompt || response.request?.context?.prompt || project.name || '';
                const date = new Date(response.request.date);
                const modelId = request.model || response.request?.context?.model || project.modelId || '';
                const modelName = modelMap.get(modelId) || modelId || 'AI';

                // Extract text responses
                if (response.request?.context?.answer) {
                    items.push({
                        id: `text-${r.id}`,
                        requestId: r.id,
                        type: "text",
                        modelId,
                        modelName,
                        prompt,
                        createdAt: date,
                        projectId: project.id,
                        projectName: project.name,
                        preview: response.request.context.answer,
                    });
                }

                // Extract images from response
                if (response.request?.context?.images) {
                    response.request.context.images.forEach((url: string, idx: number) => {
                        if (url) {
                            items.push({
                                id: `img-${r.id}-${idx}`,
                                requestId: r.id,
                                type: "image",
                                modelId,
                                modelName,
                                prompt,
                                createdAt: date,
                                projectId: project.id,
                                projectName: project.name,
                                imageUrl: url,
                                aspectRatio: request.params?.image?.ratio || '1:1',
                                style: request.params?.image?.turbo ? 'Turbo' : request.params?.image?.rawMode ? 'Raw' : undefined,
                                params: {
                                    chaos: request.params?.image?.chaos,
                                    stylize: request.params?.image?.stylize,
                                    weird: request.params?.image?.weird,
                                    quality: request.params?.image?.quality,
                                    rawMode: request.params?.image?.rawMode,
                                    turboMode: request.params?.image?.turbo,
                                },
                            });
                        }
                    });
                }

                // Extract videos from response
                if (response.request?.context?.videos) {
                    response.request.context.videos.forEach((url: string, idx: number) => {
                        if (url) {
                            items.push({
                                id: `vid-${r.id}-${idx}`,
                                requestId: r.id,
                                type: "video",
                                modelId,
                                modelName,
                                prompt,
                                createdAt: date,
                                projectId: project.id,
                                projectName: project.name,
                                url: url,
                                duration: request.params?.video?.duration ? `${request.params.video.duration}с` : undefined,
                                resolution: request.params?.video?.quality || '720p',
                                params: {
                                    duration: request.params?.video?.duration,
                                    resolution: request.params?.video?.quality,
                                    aspectRatio: request.params?.video?.aspectRatio,
                                    mode: request.params?.video?.mode,
                                    preset: request.params?.video?.preset,
                                    multiShot: request.params?.video?.multiShot,
                                },
                            });
                        }
                    });
                }

                // Extract audios from response
                if (response.request?.context?.audios) {
                    response.request.context.audios.forEach((url: string, idx: number) => {
                        if (url) {
                            items.push({
                                id: `aud-${r.id}-${idx}`,
                                requestId: r.id,
                                type: "audio",
                                modelId,
                                modelName,
                                prompt,
                                createdAt: date,
                                projectId: project.id,
                                projectName: project.name,
                                url: url,
                                trackTitle: project.name || prompt.slice(0, 30),
                                audioDuration: request.params?.audio?.duration ? `${Math.floor(request.params.audio.duration / 60)}:${String(request.params.audio.duration % 60).padStart(2, '0')}` : undefined,
                                waveform: Array.from({length: 40}, () => 0.15 + Math.random() * 0.85),
                                params: {
                                    duration: request.params?.audio?.duration,
                                    genre: request.params?.audio?.genre,
                                    mood: request.params?.audio?.mood,
                                    tempo: request.params?.audio?.tempo,
                                    instrumental: request.params?.audio?.instrumental,
                                },
                            });
                        }
                    });
                }
            } catch (e) {
                console.error('Failed to parse request/response:', e);
            }
        });
    });

    // Sort by date descending (newest first)
    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function formatDate(d: Date) {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}ч назад`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}д назад`;
    return d.toLocaleDateString("ru-RU", {day: "numeric", month: "short"});
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function downloadFile(item: StorageItem) {
    const url = item.imageUrl || item.url || '';
    if (!url) return;

    const extension = url.split('.').pop()?.split('?')[0] || '';
    const baseName = item.prompt.slice(0, 50).replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '').trim() || 'download';
    const fileName = `${baseName}.${extension || 'bin'}`;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ── Components ──

const DropdownFilter = ({
                            options,
                            value,
                            onChange,
                        }: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
}) => {
    const [open, setOpen] = useState(false);
    const label = options.find((o) => o.value === value)?.label ?? value;

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
                {label}
                <ChevronDown className="h-3 w-3"/>
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 w-48 rounded-xl border border-border bg-card shadow-xl z-50 p-1.5 popup-enter">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                                value === opt.value
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                            }`}
                        >
                            {opt.label}
                            {value === opt.value && <Check className="h-3 w-3"/>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const TextCard = ({item, onPreview, onOpenProject, onDelete}: {
    item: StorageItem;
    onPreview?: (item: StorageItem) => void;
    onOpenProject?: (projectId: number, requestId: number) => void;
    onDelete?: (item: StorageItem) => void;
}) => {
    const Icon = MODEL_ICONS[item.modelId] || Sparkles;

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(item.preview || '');
            toast.info("Текст скопирован", {position: 'top-right'});
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div
            className="group rounded-2xl border border-border bg-card overflow-hidden cursor-pointer card-hover transition-all hover:border-primary/20 h-[300px] flex flex-col">
            {/* Model badge */}
            <div className="px-3 pt-3">
                <div className="flex items-center gap-2">
                    <div
                        className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] text-primary font-medium flex items-center gap-1">
                        <Icon className="h-3 w-3"/>
                        {item.modelName}
                    </div>
                </div>
            </div>
            <div className="p-3 flex-1 flex flex-col">
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed flex-1">{item.preview}</p>
                {/* Hover actions */}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mb-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview?.(item);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Просмотр"
                    >
                        <ZoomIn className="h-3 w-3"/>
                    </button>
                    <button
                        onClick={handleCopy}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Копировать"
                    >
                        <Copy className="h-3 w-3"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenProject?.(item.projectId, item.requestId);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Открыть проект"
                    >
                        <ExternalLink className="h-3 w-3"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(item);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive transition-colors ml-auto"
                        title="Удалить"
                    >
                        <Trash2 className="h-3 w-3"/>
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[60%] text-right italic">«{item.prompt.slice(0, 40)}...»</span>
                </div>
            </div>
        </div>
    );
};

const DesignCard = ({item, onPreview, onOpenProject, onDelete}: {
    item: StorageItem;
    onPreview?: (item: StorageItem) => void;
    onOpenProject?: (projectId: number, requestId: number) => void;
    onDelete?: (item: StorageItem) => void;
}) => {
    const Icon = MODEL_ICONS[item.modelId] || Image;
    const hasParams = item.params && (
        item.params.chaos !== undefined ||
        item.params.stylize !== undefined ||
        item.params.weird !== undefined ||
        item.params.quality ||
        item.params.rawMode ||
        item.params.turboMode
    ) || item.aspectRatio;

    return (
        <div
            className="group rounded-2xl border border-border bg-card overflow-hidden cursor-pointer card-hover transition-all hover:border-primary/20 h-[300px] flex flex-col">
            <div className="relative flex-1">
                <img src={item.imageUrl} alt={item.prompt} className="w-full h-full object-cover" loading="lazy"/>
                <div
                    className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
                <div className="absolute top-2 left-2">
                    <div
                        className="rounded-md bg-background/80 border border-border/50 px-2 py-0.5 text-[10px] text-foreground font-medium flex items-center gap-1 backdrop-blur-sm">
                        <Icon className="h-3 w-3"/>
                        {item.modelName}
                    </div>
                </div>
                {/* Hover actions */}
                <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview?.(item);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Просмотр"
                    >
                        <ZoomIn className="h-3 w-3"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(item);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Скачать"
                    >
                        <Download className="h-3 w-3"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenProject?.(item.projectId, item.requestId);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Открыть проект"
                    >
                        <ExternalLink className="h-3 w-3"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(item);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive transition-colors ml-auto"
                        title="Удалить"
                    >
                        <Trash2 className="h-3 w-3"/>
                    </button>
                </div>
            </div>
            <div className="p-3 shrink-0">
                {hasParams && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                        {item.aspectRatio && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{item.aspectRatio}</span>
                        )}
                        {item.params?.rawMode && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Raw</span>
                        )}
                        {item.params?.turboMode && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Turbo</span>
                        )}
                        {item.params?.quality && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{item.params.quality}</span>
                        )}
                        {item.params?.chaos !== undefined && item.params.chaos > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Chaos {item.params.chaos}</span>
                        )}
                        {item.params?.stylize !== undefined && item.params.stylize !== 100 && (
                            <span
                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Stylize {item.params.stylize}</span>
                        )}
                        {item.params?.weird !== undefined && item.params.weird > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Weird {item.params.weird}</span>
                        )}
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[60%] text-right italic">«{item.prompt.slice(0, 40)}...»</span>
                </div>
            </div>
        </div>
    );
};

const VideoCard = ({item, onPreview, onOpenProject, onDelete}: {
    item: StorageItem;
    onPreview?: (item: StorageItem) => void;
    onOpenProject?: (projectId: number, requestId: number) => void;
    onDelete?: (item: StorageItem) => void;
}) => {
    const [playing, setPlaying] = useState(false);
    const Icon = MODEL_ICONS[item.modelId] || Video;

    const hasParams = item.params && (
        item.params.mode ||
        item.params.aspectRatio ||
        item.params.preset ||
        item.params.multiShot
    ) || item.resolution;

    return (
        <div
            className="group rounded-2xl border border-border bg-card overflow-hidden cursor-pointer card-hover transition-all hover:border-primary/20 h-[300px] flex flex-col">
            <div className="relative flex-1">
                <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                />
                <div
                    className="absolute inset-0 flex items-center justify-center"
                    onClick={(e) => {
                        e.stopPropagation();
                        const video = e.currentTarget.parentElement?.querySelector('video');
                        if (video) {
                            if (video.paused) {
                                video.play();
                            } else {
                                video.pause();
                            }
                        }
                    }}
                >
                    {!playing && (
                        <div
                            className="h-10 w-10 rounded-full bg-primary/90 flex items-center justify-center shadow-[0_0_16px_hsl(73_100%_50%/0.3)] group-hover:scale-110 transition-transform">
                            <Play className="h-4 w-4 text-primary-foreground ml-0.5" fill="currentColor"/>
                        </div>
                    )}
                </div>
                <div className="absolute top-2 left-2 flex gap-1">
                    <div
                        className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] text-primary font-medium flex items-center gap-1 backdrop-blur-sm">
                        <Icon className="h-3 w-3"/>
                        {item.modelName}
                    </div>
                </div>
                {item.duration && (
                    <div
                        className="absolute top-2 right-2 rounded-md bg-background/70 backdrop-blur-sm px-2 py-0.5 text-[10px] text-foreground font-medium">
                        {item.duration}
                    </div>
                )}
                {/* Hover actions */}
                <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview?.(item);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Просмотр"
                    >
                        <ZoomIn className="h-3 w-3"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(item);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Скачать"
                    >
                        <Download className="h-3 w-3"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenProject?.(item.projectId, item.requestId);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Открыть проект"
                    >
                        <ExternalLink className="h-3 w-3"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(item);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive transition-colors ml-auto"
                        title="Удалить"
                    >
                        <Trash2 className="h-3 w-3"/>
                    </button>
                </div>
            </div>
            <div className="p-3 shrink-0">
                {hasParams && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                        {item.params!.mode && (
                            <span
                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{VIDEO_MODE_LABELS[item.params!.mode] || item.params!.mode}</span>
                        )}
                        {item.params!.aspectRatio && (
                            <span
                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{item.params!.aspectRatio}</span>
                        )}
                        {item.params!.preset && item.params!.preset !== 'none' && (
                            <span
                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{VIDEO_PRESET_LABELS[item.params!.preset] || item.params!.preset}</span>
                        )}
                        {item.params!.multiShot && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Multi-shot</span>
                        )}
                        {item.resolution && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{item.resolution}</span>
                        )}
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[60%] text-right italic">«{item.prompt.slice(0, 40)}...»</span>
                </div>
            </div>
        </div>
    );
};

const AudioCard = ({item, onPreview, onOpenProject, onDelete}: {
    item: StorageItem;
    onPreview?: (item: StorageItem) => void;
    onOpenProject?: (projectId: number, requestId: number) => void;
    onDelete?: (item: StorageItem) => void;
}) => {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (playing) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
        }
    };

    const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (audioRef.current && duration > 0) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            const newTime = percentage * duration;
            audioRef.current.currentTime = newTime;
            setProgress(newTime);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    // Calculate which bars should be "active" based on progress
    const activeBars = duration > 0 ? Math.floor((progress / duration) * 40) : 0;

    const hasParams = item.params && (
        item.params.genre ||
        item.params.mood ||
        item.params.tempo ||
        item.params.instrumental
    );

    return (
        <div
            className="group rounded-2xl border border-border bg-card overflow-hidden cursor-pointer card-hover transition-all hover:border-primary/20 h-[300px] flex flex-col">
            {/* Model badge */}
            <div className="px-3 pt-3">
                <div
                    className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] text-primary font-medium inline-flex items-center gap-1">
                    <Music className="h-3 w-3"/>
                    {item.modelName}
                </div>
            </div>
            <div className="p-3 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                    <button
                        onClick={togglePlay}
                        className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-[0_0_12px_hsl(73_100%_50%/0.3)] hover:scale-105 transition-transform"
                    >
                        {playing ? (
                            <Pause className="h-4 w-4 text-primary-foreground" fill="currentColor"/>
                        ) : (
                            <Play className="h-4 w-4 text-primary-foreground ml-0.5" fill="currentColor"/>
                        )}
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{item.trackTitle}</p>
                        <p className="text-[11px] text-muted-foreground">
                            {duration > 0 ? formatTime(progress) : item.audioDuration || '--:--'} / {duration > 0 ? formatTime(duration) : item.audioDuration || '--:--'}
                        </p>
                    </div>
                </div>

                {/* Animated waveform */}
                <div
                    className="flex items-end gap-[2px] h-8 mb-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={handleWaveformClick}
                >
                    {Array.from({length: 40}, (_, i) => {
                        const baseHeight = item.waveform?.[i] ?? (0.3 + Math.random() * 0.7);
                        const isActive = i <= activeBars;
                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-full transition-all duration-100 ${playing && isActive ? "bg-primary" : "bg-border"}`}
                                style={{
                                    height: `${baseHeight * 100}%`,
                                    minHeight: 2,
                                    transform: playing && isActive ? 'scaleY(1.1)' : 'scaleY(1)'
                                }}
                            />
                        );
                    })}
                </div>

                {/* Hover actions */}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mb-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview?.(item);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Просмотр"
                    >
                        <ZoomIn className="h-3 w-3"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(item);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Скачать"
                    >
                        <Download className="h-3 w-3"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenProject?.(item.projectId, item.requestId);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Открыть проект"
                    >
                        <ExternalLink className="h-3 w-3"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(item);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive transition-colors ml-auto"
                        title="Удалить"
                    >
                        <Trash2 className="h-3 w-3"/>
                    </button>
                </div>

                {hasParams && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {item.params!.genre && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{item.params!.genre}</span>
                        )}
                        {item.params!.mood && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{item.params!.mood}</span>
                        )}
                        {item.params!.tempo && (
                            <span
                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{AUDIO_TEMPO_LABELS[item.params!.tempo] || item.params!.tempo}</span>
                        )}
                        {item.params!.instrumental && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Инструментал</span>
                        )}
                    </div>
                )}

                <audio
                    ref={audioRef}
                    src={item.url}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="hidden"
                />

                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[60%] text-right italic">«{item.prompt.slice(0, 30)}...»</span>
                </div>
            </div>
        </div>
    );
};

// ── Page ──

const ITEMS_PER_PAGE = 8;

const Storage = () => {
    const {user, listModels} = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<ContentType>("all");
    const [dateFilter, setDateFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const [previewIndex, setPreviewIndex] = useState<number>(-1);
    const audioRef = useRef<HTMLAudioElement>(null);

    const handleOpenProject = useCallback((projectId: number, requestId: number) => {
        navigate('/workspace', {state: {projectId, requestId}});
    }, [navigate]);

    const handleDelete = useCallback((item: StorageItem) => {
        // TODO: implement delete
        toast.info(`Удаление: ${item.prompt.slice(0, 40)}`, {position: 'top-right'});
    }, []);

    // Build model map for quick lookup
    const modelMap = useMemo(() => {
        const map = new Map<string, string>();
        if (listModels) {
            listModels.forEach(m => {
                map.set(m.key, m.name);
            });
        }
        return map;
    }, [listModels]);

    // Extract storage items from user.projects
    const storageItems = useMemo(() => {
        if (!user?.projects) return [];
        return extractStorageItemsFromProjects(user.projects, modelMap);
    }, [user?.projects, modelMap]);

    // Build model filters from available models
    const modelFilters = useMemo(() => {
        const uniqueModels = new Set<string>();
        storageItems.forEach(item => {
            if (item.modelId) uniqueModels.add(item.modelId);
        });

        const filters = [{value: "all", label: "Все модели"}];
        uniqueModels.forEach(modelId => {
            filters.push({
                value: modelId,
                label: modelMap.get(modelId) || modelId,
            });
        });
        return filters;
    }, [storageItems, modelMap]);

    const [modelFilter, setModelFilter] = useState("all");

    const filtered = useMemo(() => {
        let items = [...storageItems];

        // Type
        if (typeFilter !== "all") items = items.filter((i) => i.type === typeFilter);

        // Model
        if (modelFilter !== "all") items = items.filter((i) => i.modelId === modelFilter);

        // Date
        if (dateFilter !== "all") {
            const now = new Date();
            const cutoff = new Date();
            if (dateFilter === "today") cutoff.setHours(0, 0, 0, 0);
            else if (dateFilter === "week") cutoff.setDate(now.getDate() - 7);
            else if (dateFilter === "month") cutoff.setMonth(now.getMonth() - 1);
            items = items.filter((i) => i.createdAt >= cutoff);
        }

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(
                (i) =>
                    i.prompt.toLowerCase().includes(q) ||
                    i.modelName.toLowerCase().includes(q) ||
                    i.preview?.toLowerCase().includes(q) ||
                    i.trackTitle?.toLowerCase().includes(q)
            );
        }

        // Sort
        items.sort((a, b) =>
            sortOrder === "newest"
                ? b.createdAt.getTime() - a.createdAt.getTime()
                : a.createdAt.getTime() - b.createdAt.getTime()
        );

        return items;
    }, [storageItems, typeFilter, modelFilter, dateFilter, search, sortOrder]);

    const visible = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length;

    // Close preview on Escape / navigate with arrows (cyclic)
    useEffect(() => {
        if (previewIndex < 0) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setPreviewIndex(-1);
            if (e.key === "ArrowLeft") {
                setPreviewIndex(previewIndex > 0 ? previewIndex - 1 : filtered.length - 1);
            }
            if (e.key === "ArrowRight") {
                setPreviewIndex(previewIndex < filtered.length - 1 ? previewIndex + 1 : 0);
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [previewIndex, filtered.length]);

    return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-background">
            <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <h1 className="text-2xl font-bold text-foreground">Хранилище</h1>
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Поиск по промтам..."
                            className="w-full h-9 rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-text-hint focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    {/* Type pills */}
                    <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-0.5">
                        {TYPE_FILTERS.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => {
                                    setTypeFilter(f.id);
                                    setVisibleCount(ITEMS_PER_PAGE);
                                }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                    typeFilter === f.id
                                        ? "bg-primary text-primary-foreground shadow-[0_0_8px_hsl(73_100%_50%/0.2)]"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <DropdownFilter options={modelFilters} value={modelFilter} onChange={(v) => {
                        setModelFilter(v);
                        setVisibleCount(ITEMS_PER_PAGE);
                    }}/>
                    <DropdownFilter options={DATE_FILTERS} value={dateFilter} onChange={(v) => {
                        setDateFilter(v);
                        setVisibleCount(ITEMS_PER_PAGE);
                    }}/>

                    {/* Sort */}
                    <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5 ml-auto">
                        <button
                            onClick={() => setSortOrder("newest")}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                                sortOrder === "newest" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Новые
                        </button>
                        <button
                            onClick={() => setSortOrder("oldest")}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                                sortOrder === "oldest" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Старые
                        </button>
                    </div>
                </div>

                {/* Results count */}
                <p className="text-xs text-muted-foreground mb-4">
                    {filtered.length} {filtered.length === 1 ? "элемент" : filtered.length < 5 ? "элемента" : "элементов"}
                </p>

                {/* Grid */}
                {visible.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                        {visible.map((item, index) => {
                            switch (item.type) {
                                case "text":
                                    return <TextCard key={item.id} item={item} onPreview={() => setPreviewIndex(index)}
                                                     onOpenProject={handleOpenProject} onDelete={handleDelete}/>;
                                case "image":
                                    return <DesignCard key={item.id} item={item} onPreview={() => setPreviewIndex(index)}
                                                       onOpenProject={handleOpenProject} onDelete={handleDelete}/>;
                                case "video":
                                    return <VideoCard key={item.id} item={item} onPreview={() => setPreviewIndex(index)}
                                                      onOpenProject={handleOpenProject} onDelete={handleDelete}/>;
                                case "audio":
                                    return <AudioCard key={item.id} item={item} onPreview={() => setPreviewIndex(index)}
                                                      onOpenProject={handleOpenProject} onDelete={handleDelete}/>;
                                default:
                                    return null;
                            }
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                            <Search className="h-6 w-6 text-primary icon-glow"/>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {user?.projects?.length ? "Ничего не найдено" : "Хранилище пусто"}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                            {user?.projects?.length ? "Попробуйте изменить фильтры" : "Сгенерируйте контент, чтобы он появился здесь"}
                        </p>
                    </div>
                )}

                {/* Load more */}
                {hasMore && (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={() => setVisibleCount((c) => c + ITEMS_PER_PAGE)}
                            className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                        >
                            Загрузить ещё
                        </button>
                    </div>
                )}
            </div>

            {/* Fullscreen file preview */}
            {previewIndex >= 0 && filtered[previewIndex] && createPortal(
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center"
                    style={{background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)"}}
                    onClick={() => setPreviewIndex(-1)}
                >
                    {/* Close button */}
                    <button
                        onClick={() => setPreviewIndex(-1)}
                        className="fixed top-5 right-5 h-10 w-10 rounded-xl flex items-center justify-center z-[10002]"
                        style={{background: "rgba(255,255,255,0.1)"}}
                    >
                        <X className="h-5 w-5 text-white"/>
                    </button>

                    {/* Navigation buttons - cyclic */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreviewIndex(previewIndex > 0 ? previewIndex - 1 : filtered.length - 1);
                        }}
                        className="fixed left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full flex items-center justify-center z-[10002]"
                        style={{background: "rgba(255,255,255,0.1)"}}
                    >
                        <ChevronLeft className="h-6 w-6 text-white"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreviewIndex(previewIndex < filtered.length - 1 ? previewIndex + 1 : 0);
                        }}
                        className="fixed right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full flex items-center justify-center z-[10002]"
                        style={{background: "rgba(255,255,255,0.1)"}}
                    >
                        <ChevronRight className="h-6 w-6 text-white"/>
                    </button>

                    {/* Preview content */}
                    {filtered[previewIndex].type === "text" && (
                        <div
                            className="max-w-[90vw] max-h-[85vh] w-[600px] rounded-2xl bg-card border border-border p-6 overflow-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                {(() => {
                                    const Icon = MODEL_ICONS[filtered[previewIndex].modelId] || Sparkles;
                                    return (
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                                            <Icon className="h-3.5 w-3.5 text-primary"/>
                                        </div>
                                    );
                                })()}
                                <span className="text-xs font-semibold text-foreground">{filtered[previewIndex].modelName}</span>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{filtered[previewIndex].preview}</p>
                        </div>
                    )}
                    {filtered[previewIndex].type === "image" && (
                        <img
                            src={filtered[previewIndex].imageUrl}
                            alt={filtered[previewIndex].prompt}
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
                            onClick={e => e.stopPropagation()}
                        />
                    )}
                    {filtered[previewIndex].type === "video" && (
                        <video
                            src={filtered[previewIndex].url}
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
                            controls
                            onClick={e => e.stopPropagation()}
                        />
                    )}
                    {filtered[previewIndex].type === "audio" && (
                        <div
                            className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-card border border-border"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Music className="h-8 w-8 text-primary"/>
                            </div>
                            <span className="text-sm text-muted-foreground max-w-[200px] truncate text-center">
                                {filtered[previewIndex].trackTitle}
                            </span>
                            <audio
                                ref={audioRef}
                                src={filtered[previewIndex].url}
                                controls
                                className="w-[300px]"
                            />
                        </div>
                    )}

                    {/* Prompt info & actions */}
                    <div
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-[600px] w-[90%] rounded-xl p-4"
                        style={{background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)"}}
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="text-sm text-white/90 line-clamp-2 mb-2">«{filtered[previewIndex].prompt}»</p>
                        {/* Parameters */}
                        {filtered[previewIndex].params && (
                            <div className="flex flex-wrap gap-1 mb-2">
                                {filtered[previewIndex].type === "image" && (
                                    <>
                                        {filtered[previewIndex].aspectRatio && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{filtered[previewIndex].aspectRatio}</span>
                                        )}
                                        {filtered[previewIndex].params.rawMode && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Raw</span>
                                        )}
                                        {filtered[previewIndex].params.turboMode && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Turbo</span>
                                        )}
                                        {filtered[previewIndex].params.quality && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{filtered[previewIndex].params.quality}</span>
                                        )}
                                        {filtered[previewIndex].params.chaos !== undefined && filtered[previewIndex].params.chaos > 0 && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Chaos {filtered[previewIndex].params.chaos}</span>
                                        )}
                                        {filtered[previewIndex].params.stylize !== undefined && filtered[previewIndex].params.stylize !== 100 && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Stylize {filtered[previewIndex].params.stylize}</span>
                                        )}
                                        {filtered[previewIndex].params.weird !== undefined && filtered[previewIndex].params.weird > 0 && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Weird {filtered[previewIndex].params.weird}</span>
                                        )}
                                    </>
                                )}
                                {filtered[previewIndex].type === "video" && (
                                    <>
                                        {filtered[previewIndex].params.mode && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{VIDEO_MODE_LABELS[filtered[previewIndex].params.mode] || filtered[previewIndex].params.mode}</span>
                                        )}
                                        {filtered[previewIndex].params.aspectRatio && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{filtered[previewIndex].params.aspectRatio}</span>
                                        )}
                                        {filtered[previewIndex].params.preset && filtered[previewIndex].params.preset !== 'none' && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{VIDEO_PRESET_LABELS[filtered[previewIndex].params.preset] || filtered[previewIndex].params.preset}</span>
                                        )}
                                        {filtered[previewIndex].params.multiShot && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Multi-shot</span>
                                        )}
                                    </>
                                )}
                                {filtered[previewIndex].type === "audio" && (
                                    <>
                                        {filtered[previewIndex].params.genre && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{filtered[previewIndex].params.genre}</span>
                                        )}
                                        {filtered[previewIndex].params.mood && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{filtered[previewIndex].params.mood}</span>
                                        )}
                                        {filtered[previewIndex].params.tempo && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{AUDIO_TEMPO_LABELS[filtered[previewIndex].params.tempo] || filtered[previewIndex].params.tempo}</span>
                                        )}
                                        {filtered[previewIndex].params.instrumental && (
                                            <span
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Инструментал</span>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-white/60">{filtered[previewIndex].modelName}</span>
                                <span className="text-xs text-white/40">·</span>
                                <span className="text-xs text-white/60">{formatDate(filtered[previewIndex].createdAt)}</span>
                            </div>
                            {/* Action buttons */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        downloadFile(filtered[previewIndex]);
                                    }}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                                    title="Скачать"
                                >
                                    <Download className="h-3.5 w-3.5"/>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenProject(filtered[previewIndex].projectId, filtered[previewIndex].requestId);
                                    }}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                                    title="Открыть проект"
                                >
                                    <ExternalLink className="h-3.5 w-3.5"/>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(filtered[previewIndex]);
                                    }}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-red-400 hover:text-red-300 hover:bg-white/20 transition-colors"
                                    title="Удалить"
                                >
                                    <Trash2 className="h-3.5 w-3.5"/>
                                </button>
                            </div>
                        </div>
                        {/* Counter */}
                        <div className="flex justify-center mt-3">
                            <span className="text-[10px] text-white/40">{previewIndex + 1} / {filtered.length}</span>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Storage;
