export interface KeyframeImageRef {
    name?: string;
    url: string;
    base64?: string;
}

export interface VideoSettings {
    mode: string;
    aspectRatio: string;
    duration: number;
    resolution: string;
    multiShot: boolean;
    negativePrompt: string;
    preset: string;
    // For keyframes mode - two image references
    keyframeImage1: KeyframeImageRef | null;
    keyframeImage2: KeyframeImageRef | null;
}

// Per-model config
export const VIDEO_MODEL_CONFIG: Record<string, {
    modes: { value: string; label: string }[];
    aspectRatios: { value: string; label: string }[];
    durations: { value: number; label: string }[];
    resolutions: { value: string; label: string }[] | null;
    hasMultiShot: boolean;
    hasPresets: boolean;
    advancedTitle: string;
    maxAttachments: number;
    // Per-mode attachment limits (optional, overrides default)
    modeAttachmentLimits?: Record<string, { maxImages: number; maxVideos: number }>;
}> = {
    kling: {
        modes: [
            {value: "i2v", label: "Картинка → Видео"},
            {value: "text", label: "Текст → Видео"},
            {value: "keyframes", label: "Ключевые кадры"},
            {value: "o1-i2v", label: "Kling 01 Image→Video"},
            {value: "o1-v2v", label: "Kling 01 Video→Video"},
            {value: "motion", label: "Kling Motion"},
        ],
        aspectRatios: [
            {value: "1:1", label: "1:1 Square"},
            {value: "16:9", label: "16:9 Landscape"},
            {value: "9:16", label: "9:16 Portrait"},
        ],
        durations: [
            {value: 3, label: "3 сек"},
            {value: 5, label: "5 сек"},
            {value: 10, label: "10 сек"},
            {value: 15, label: "15 сек"},
        ],
        resolutions: [
            {value: "720p", label: "720p"},
            {value: "1080p", label: "1080p"},
        ],
        hasMultiShot: true,
        hasPresets: true,
        advancedTitle: "KLING 3.0 — ADVANCED",
        maxAttachments: 4,
        modeAttachmentLimits: {
            motion: { maxImages: 1, maxVideos: 1 }
        },
    },
    runway: {
        modes: [
            {value: "4.5-t2v", label: "Gen 4.5 Текст → Видео"},
            {value: "4.5-i2v", label: "Gen 4.5 Картинка → Видео"},
        ],
        aspectRatios: [
            {value: "1:1", label: "1:1 Square"},
            {value: "3:4", label: "3:4 Portrait"},
            {value: "4:3", label: "4:3 Landscape"},
            {value: "9:16", label: "9:16 Portrait"},
            {value: "16:9", label: "16:9 Landscape"},
        ],
        durations: [
            {value: 5, label: "5 сек"},
            {value: 10, label: "10 сек"},
        ],
        resolutions: [
            {value: "720p", label: "720p"},
            {value: "1080p", label: "1080p"},
        ],
        hasMultiShot: false,
        hasPresets: false,
        advancedTitle: "RUNWAY — ADVANCED",
        maxAttachments: 4,
    },
    sora: {
        modes: [],
        aspectRatios: [
            {value: "9:16", label: "9:16 Portrait"},
            {value: "16:9", label: "16:9 Landscape"},
        ],
        durations: [
            {value: 5, label: "5 сек"},
            {value: 10, label: "10 сек"},
            {value: 15, label: "15 сек"},
            {value: 20, label: "20 сек"},
        ],
        resolutions: [
            {value: "720p", label: "720p"},
            {value: "1080p", label: "1080p"},
        ],
        hasMultiShot: false,
        hasPresets: false,
        advancedTitle: "SORA 2 — ADVANCED",
        maxAttachments: 1,
    },
};

export const VIDEO_PRESETS = [
    {value: "none", label: "Без пресета"},
    {value: "cinematic", label: "Кинематографичный"},
    {value: "anime", label: "Аниме"},
    {value: "realistic", label: "Реалистичный"},
];

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
    mode: "i2v",
    aspectRatio: "16:9",
    duration: 5,
    resolution: "720p",
    multiShot: false,
    negativePrompt: "",
    preset: "none",
    keyframeImage1: null,
    keyframeImage2: null,
};

export function getMaxAttachments(modelId: string): number {
    return VIDEO_MODEL_CONFIG[modelId]?.maxAttachments ?? 4;
}

export function getModeAttachmentLimits(modelId: string, mode: string): { maxImages: number; maxVideos: number } | null {
    const config = VIDEO_MODEL_CONFIG[modelId];
    if (!config?.modeAttachmentLimits?.[mode]) return null;
    return config.modeAttachmentLimits[mode];
}
