import type { DesignSettings } from "@/lib/design-types";
import type { VideoSettings } from "@/lib/video-types";
import type { AudioSettings } from "@/lib/audio-types";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    modelId?: string;
    attachments?: AttachedFile[];
    timestamp: Date;
    designSettings?: DesignSettings;
    videoSettings?: VideoSettings;
    audioSettings?: AudioSettings;
}

export interface AttachedFile {
    name?: string;
    type?: string;
    url?: string;
    isImage?: boolean;
    isVideo?: boolean;
    isAudio?: boolean;
    buffer?: string;
}

export interface StoredFile {
    id: string;
    type: "image" | "video" | "audio" | "file";
    name?: string;
    url: string;
    thumbnailUrl?: string;
    prompt?: string;
    createdAt: Date;
    duration?: string;
    buffer?: string;
}

export interface RequestMessage {
    id: number;
    request: string;
    response: string;
    date: Date;
}

export interface ChatSession {
    id: number;
    name: string;
    messages: ChatMessage[];
    requests?: RequestMessage[];
    folder: ChatFolder;
    modelId: string;
    pinned?: boolean;
    order?: number;
    type?: string;
    isManuallyRenamed?: boolean;
}

export interface ChatFolder {
    id?: number;
    name?: string;
    color?: string;
    type?: string;
    projects?: ChatSession[];
}