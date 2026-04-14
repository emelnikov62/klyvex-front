import {useEffect, useRef, useState, useCallback} from "react";
import {createPortal} from "react-dom";
import {toast} from "sonner";
import {getModelIcon, getModelsForTab, TAB_CONFIG} from "@/lib/models";
import type {AttachedFile, ChatFolder, ChatMessage, ChatSession, StoredFile} from "@/hooks/use-panel-state";
import type {DesignSettings} from "@/lib/design-types";
import type {VideoSettings} from "@/lib/video-types";
import {getModeAttachmentLimits} from "@/lib/video-types";
import type {AudioSettings} from "@/lib/audio-types";
import ChatMessageItem from "./ChatMessageItem";
import CloverIcon from "@/components/ui/clover-icon";
import WorkspaceSidebar from "./WorkspaceSidebar";
import DesignParamsBar from "./DesignParamsBar";
import VideoParamsBar from "./VideoParamsBar";
import AudioParamsBar from "./AudioParamsBar";
import AttachmentPicker from "./AttachmentPicker";
import {
    Check,
    ChevronDown,
    Columns2,
    FileText,
    FolderOpen,
    Image,
    Maximize2,
    Mic,
    Minimize2,
    Minus,
    Music,
    Paperclip,
    Plus,
    Send,
    Video,
    X,
} from "lucide-react";
import MobileBottomSheet from "@/components/ui/mobile-bottom-sheet";
import {AiModel, TabType} from "@/lib/kernel/models/main/AiModel";
import {useAuth} from "@/contexts/AuthContext";

interface WorkspacePanelProps {
    activeTab: TabType;
    selectedModel: AiModel;
    prompt: string;
    onPromptChange: (v: string) => void;
    onTabSwitch: (tab: TabType) => void;
    onModelSelect: (model: AiModel) => void;
    canClose: boolean;
    onClose?: () => void;
    isFullWidth: boolean;
    canMinimize: boolean;
    onMinimize?: () => void;
    onToggleMaximize?: () => void;
    isMaximized?: boolean;
    isMobile?: boolean;
    showPanelSwitcher?: boolean;
    activePanel?: "left" | "right";
    onSwitchPanel?: () => void;
    messages: ChatMessage[];
    onSendMessage: () => void;
    isTextLoading: boolean;
    attachments: AttachedFile[];
    onAddAttachment: (file: File) => Promise<{ added: boolean; currentCount: number; max: number }>;
    onRemoveAttachment: (index: number) => void;
    onAddStoredAttachment: (files: StoredFile[]) => { added: boolean; currentCount: number; max: number };
    uploadedFiles: StoredFile[];
    onAddUploadedFile: (file: StoredFile) => void;
    generatedFiles: StoredFile[];
    onAddGeneratedFile: (file: StoredFile) => void;
    folders: ChatFolder[];
    chats: ChatSession[];
    activeChatId: number | null;
    onSelectChat: (id: number) => void;
    onNewChat: () => void;
    onAddFolder: (name: string, color: string, type: string) => void;
    onRenameFolder?: (id: number, name: string) => void;
    onChangeFolderColor?: (id: number, color: string) => void;
    onDeleteFolder?: (id: number) => void;
    onRenameChat?: (id: number, title: string) => void;
    onMoveChat?: (chatId: number, folderId: number | null) => void;
    onPinChat?: (id: number) => void;
    onDuplicateChat?: (id: number) => void;
    onDeleteChat?: (id: number) => void;
    designSettings: DesignSettings;
    onDesignSettingsChange: (s: DesignSettings) => void;
    onGenerateImages: (prompt?: string, attachments?: AttachedFile[]) => void;
    isImageLoading: boolean;
    onDeleteDesignMessage?: (msgId: string) => void;
    videoSettings: VideoSettings;
    onVideoSettingsChange: (s: VideoSettings) => void;
    onGenerateVideo: (prompt?: string) => void;
    isVideoLoading: boolean;
    onDeleteVideoMessage?: (msgId: string) => void;
    audioSettings: AudioSettings;
    onAudioSettingsChange: (s: AudioSettings) => void;
    onGenerateAudio: (prompt?: string, attachments?: AttachedFile[]) => void;
    isAudioLoading: boolean;
    onDeleteAudioMessage?: (msgId: string) => void;
    onEditMessage?: (content: string, attachments?: AttachedFile[], designSettings?: DesignSettings, modelId?: string, videoSettings?: VideoSettings, audioSettings?: AudioSettings) => void;
}

const WorkspacePanel = ({
                            activeTab, selectedModel, prompt, onPromptChange,
                            onTabSwitch, onModelSelect, canClose, onClose,
                            messages, onSendMessage, isTextLoading,
                            attachments, onAddAttachment, onRemoveAttachment, onAddStoredAttachment,
                            uploadedFiles, onAddUploadedFile, generatedFiles, onAddGeneratedFile,
                            folders, chats, activeChatId, onSelectChat, onNewChat, onAddFolder,
                            onRenameFolder, onChangeFolderColor, onDeleteFolder,
                            onRenameChat, onMoveChat, onPinChat, onDuplicateChat, onDeleteChat,
                            designSettings, onDesignSettingsChange, onGenerateImages, isImageLoading, onDeleteDesignMessage,
                            videoSettings, onVideoSettingsChange, onGenerateVideo, isVideoLoading, onDeleteVideoMessage,
                            audioSettings, onAudioSettingsChange, onGenerateAudio, isAudioLoading, onDeleteAudioMessage,
                            canMinimize, onMinimize, onToggleMaximize, isMaximized, onEditMessage,
                            isMobile, showPanelSwitcher, activePanel, onSwitchPanel,
                        }: WorkspacePanelProps) => {
    const [modelPickerOpen, setModelPickerOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState<AttachedFile | null>(null);
    const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
    const [showMotionImagePicker, setShowMotionImagePicker] = useState(false);
    const [showMotionVideoPicker, setShowMotionVideoPicker] = useState(false);
    const {listModels} = useAuth();
    const models = getModelsForTab(activeTab, listModels);
    const ModelIcon = getModelIcon(selectedModel?.icon);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const modelPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!modelPickerOpen || isMobile) return;
        const handleClick = (e: MouseEvent) => {
            if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node))
                setModelPickerOpen(false);
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setModelPickerOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [modelPickerOpen, isMobile]);

    // Close fullscreen preview on Escape
    useEffect(() => {
        if (!previewAttachment) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setPreviewAttachment(null);
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [previewAttachment]);

    const isDesignTab = activeTab === "image";
    const isVideoTab = activeTab === "video";
    const isAudioTab = activeTab === "audio";
    const isCurrentTabLoading = isDesignTab ? isImageLoading : isVideoTab ? isVideoLoading : isAudioTab ? isAudioLoading : isTextLoading;
    const hasContent = isDesignTab
        ? messages.length > 0
        : isVideoTab
            ? messages.length > 0
            : isAudioTab
                ? messages.length > 0
                : messages.length > 0;

    // Track previous messages length to only scroll on new messages
    const prevMessagesLengthRef = useRef(messages.length);

    useEffect(() => {
        // Only scroll if messages length increased (new message added) or loading started
        if (messages.length > prevMessagesLengthRef.current || isCurrentTabLoading) {
            messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages, isCurrentTabLoading]);

    const handleSubmit = () => {
        // Validation for Kling Motion mode - requires both image and video
        if (isMotionMode) {
            if (imageCount === 0 && videoCount === 0) {
                toast.error("Для режима Kling Motion необходимо прикрепить изображение и видео");
                return;
            }
            if (imageCount === 0) {
                toast.error("Для режима Kling Motion необходимо прикрепить изображение");
                return;
            }
            if (videoCount === 0) {
                toast.error("Для режима Kling Motion необходимо прикрепить видео");
                return;
            }
        }
        // Validation for keyframes mode - requires both keyframe images
        if (isKeyframesMode) {
            if (!videoSettings.keyframeImage1 && !videoSettings.keyframeImage2) {
                toast.error("Для режима Ключевые кадры необходимо прикрепить оба изображения");
                return;
            }
            if (!videoSettings.keyframeImage1) {
                toast.error("Необходимо прикрепить первый кадр");
                return;
            }
            if (!videoSettings.keyframeImage2) {
                toast.error("Необходимо прикрепить последний кадр");
                return;
            }
        }
        if (isDesignTab) onGenerateImages();
        else if (isVideoTab) onGenerateVideo();
        else if (isAudioTab) onGenerateAudio(undefined, attachments);
        else onSendMessage();
        if (textareaRef.current) textareaRef.current.style.height = "36px";
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const MAX_ATTACHMENTS = 4;
    const isAtFileLimit = attachments.length >= MAX_ATTACHMENTS;

    // Check if we're in Kling Motion mode with separate attachment limits
    const motionLimits = isVideoTab && selectedModel?.key === 'kling' && videoSettings.mode === 'motion'
        ? getModeAttachmentLimits('kling', 'motion')
        : null;
    const isMotionMode = motionLimits !== null;

    // Check if we're in keyframes mode - attachments are handled via settings panel
    const isKeyframesMode = isVideoTab && selectedModel?.key === 'kling' && videoSettings.mode === 'keyframes';

    // Count current images and videos in attachments
    const imageCount = attachments.filter(a => a.isImage).length;
    const videoCount = attachments.filter(a => a.isVideo).length;
    const isAtImageLimit = motionLimits ? imageCount >= motionLimits.maxImages : isAtFileLimit;
    const isAtVideoLimit = motionLimits ? videoCount >= motionLimits.maxVideos : isAtFileLimit;

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const files: File[] = [];
        for (const item of Array.from(items)) {
            if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) files.push(file);
            }
        }
        if (files.length === 0) return;
        e.preventDefault();
        const remaining = MAX_ATTACHMENTS - attachments.length;
        if (remaining <= 0) {
            toast("Максимум 4 файла");
            return;
        }
        const toAdd = files.slice(0, remaining);
        for (const f of toAdd) {
            await onAddAttachment(f);
        }
        if (files.length > remaining) {
            toast(`Добавлено ${toAdd.length} из ${files.length}. Максимум 4 файла.`);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const remaining = MAX_ATTACHMENTS - attachments.length;
        if (remaining <= 0) {
            toast("Максимум 4 файла");
            e.target.value = "";
            return;
        }
        const toAdd = Array.from(files).slice(0, remaining);
        for (const f of toAdd) {
            await onAddAttachment(f);
        }
        if (files.length > remaining) {
            toast(`Добавлено ${toAdd.length} из ${files.length}. Максимум 4 файла.`);
        }
        e.target.value = "";
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !motionLimits) return;
        // Remove existing images first (in reverse order to preserve indices)
        const imageIndices = attachments.map((a, i) => a.isImage ? i : -1).filter(i => i !== -1).reverse();
        imageIndices.forEach(i => onRemoveAttachment(i));
        const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
        const toAdd = imageFiles.slice(0, motionLimits.maxImages);
        for (const f of toAdd) {
            await onAddAttachment(f);
        }
        if (imageFiles.length > motionLimits.maxImages) {
            toast(`Добавлено ${toAdd.length} из ${imageFiles.length} изображений. Максимум ${motionLimits.maxImages}.`);
        }
        e.target.value = "";
    };

    const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !motionLimits) return;
        // Remove existing videos first (in reverse order to preserve indices)
        const videoIndices = attachments.map((a, i) => a.isVideo ? i : -1).filter(i => i !== -1).reverse();
        videoIndices.forEach(i => onRemoveAttachment(i));
        const videoFiles = Array.from(files).filter(f => f.type.startsWith("video/"));
        const toAdd = videoFiles.slice(0, motionLimits.maxVideos);
        for (const f of toAdd) {
            await onAddAttachment(f);
        }
        if (videoFiles.length > motionLimits.maxVideos) {
            toast(`Добавлено ${toAdd.length} из ${videoFiles.length} видео. Максимум ${motionLimits.maxVideos}.`);
        }
        e.target.value = "";
    };

    const handleMicClick = () => {
        setIsRecording(!isRecording);
        if (!isRecording) {
            setTimeout(() => {
                onPromptChange(prompt + (prompt ? " " : "") + "futuristic landscape");
                setIsRecording(false);
            }, 2000);
        }
    };

    const sidebarTitle = isDesignTab ? "ДИЗАЙН · ПРОЕКТЫ" : isVideoTab ? "ВИДЕО · ПРОЕКТЫ" : isAudioTab ? "АУДИО · ПРОЕКТЫ" : "ТЕКСТ · ЧАТЫ";
    const placeholderText = isDesignTab ? "Опишите изображение..." : isVideoTab ? "Опишите видео..." : isAudioTab ? "Опишите трек или песню..." : "Введите промт...";

    const activeChat = chats.find((c) => c.id === activeChatId) ||
        folders?.flatMap((f) => f.projects).find((c) => c.id === activeChatId);
    const tabLabels: Record<string, string> = {text: "Текст", image: "Дизайн", video: "Видео", audio: "Аудио"};
    const chatName = activeChat?.name || tabLabels[activeTab] || "Текст";

    /* ═══════════════ MOBILE LAYOUT ═══════════════ */
    if (isMobile) {
        return (
            <div className="flex flex-col h-full min-w-0 relative">
                <WorkspaceSidebar
                    isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
                    folders={folders} chats={chats} activeChatId={activeChatId}
                    onSelectChat={(id) => {
                        onSelectChat(id);
                        setSidebarOpen(false);
                    }}
                    onNewChat={() => {
                        onNewChat();
                        setSidebarOpen(false);
                    }}
                    onAddFolder={onAddFolder} onRenameFolder={onRenameFolder}
                    onChangeFolderColor={onChangeFolderColor} onDeleteFolder={onDeleteFolder}
                    onRenameChat={onRenameChat} onMoveChat={onMoveChat}
                    onPinChat={onPinChat} onDuplicateChat={onDuplicateChat}
                    onDeleteChat={onDeleteChat}
                    title={sidebarTitle} activeTab={activeTab}
                />

                {/* Mobile header: sidebar + new chat | chat name | (empty spacer) */}
                <div className="relative flex items-center px-4 shrink-0" style={{height: 44}}>
                    <div className="flex items-center gap-1 shrink-0 z-10">
                        <button onClick={() => setSidebarOpen(true)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground active:bg-surface-hover">
                            <FolderOpen className="h-4 w-4"/>
                        </button>
                        <button onClick={onNewChat}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground active:bg-surface-hover">
                            <Plus className="h-4 w-4"/>
                        </button>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"/>
                            <span className="text-xs text-muted-foreground truncate max-w-[180px]">{chatName}</span>
                        </div>
                    </div>
                    <div className="w-[84px] shrink-0 ml-auto"/>
                </div>

                {/* Chat area — with bottom padding for fixed input + tab bar */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 min-h-0" style={{paddingBottom: 160}}>
                    <div key={activeTab} className={`tab-fade-in ${!hasContent ? "flex flex-col items-center justify-center h-full" : ""}`}>
                        {!hasContent ? (
                            <div className="text-center max-w-sm">
                                <div
                                    className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 model-icon-glow">
                                    <ModelIcon className="h-8 w-8 text-primary icon-glow"/>
                                </div>
                                <h2 className="text-xl font-bold text-foreground mb-2">{selectedModel?.name}</h2>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{selectedModel?.description}</p>
                                <span className="text-primary text-lg icon-glow">✦</span>
                            </div>
                        ) : (
                            <div className="space-y-4 max-w-3xl mx-auto">
                                {messages.map((msg, idx) => {
                                    // Find previous user message to get attachments for regeneration
                                    const prevUserMsg = idx > 0 ? messages.slice(0, idx).reverse().find(m => m.role === "user") : null;
                                    return (
                                        <ChatMessageItem
                                            key={msg.id}
                                            message={msg}
                                            onDelete={isDesignTab ? onDeleteDesignMessage : isVideoTab ? onDeleteVideoMessage : isAudioTab ? onDeleteAudioMessage : undefined}
                                            onRegenerate={(isDesignTab || isVideoTab || isAudioTab) ? (p, att) => isDesignTab ? onGenerateImages(p, att) : isVideoTab ? onGenerateVideo(p) : onGenerateAudio(p, att) : undefined}
                                            regenerateAttachments={prevUserMsg?.attachments}
                                            onEdit={onEditMessage}
                                            prevUserContent={prevUserMsg?.content}
                                            prevUserDesignSettings={prevUserMsg?.designSettings}
                                            prevUserModelId={prevUserMsg?.modelId}
                                            prevUserVideoSettings={prevUserMsg?.videoSettings}
                                            prevUserAudioSettings={prevUserMsg?.audioSettings}
                                        />
                                    );
                                })}
                                {(isTextLoading || (isDesignTab && isImageLoading) || (isVideoTab && isVideoLoading) || (isAudioTab && isAudioLoading)) && (
                                    <div className="flex gap-3">
                                        <div
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                                            <div className="spinner-lime h-4 w-4"/>
                                        </div>
                                        <div className="rounded-2xl px-4 py-3 bg-card/60 border border-border"><span
                                            className="text-sm text-muted-foreground animate-pulse-glow">{isDesignTab ? "Генерирую изображения..." : isVideoTab ? "Генерирую видео..." : isAudioTab ? "Генерирую аудио..." : "Генерирую ответ..."}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div ref={messagesEndRef}/>
                </div>

                {/* Fixed input bar — positioned above bottom tab bar */}
                <div
                    className="fixed left-0 right-0 z-[999] px-4 py-2"
                    style={{
                        bottom: `calc(64px + env(safe-area-inset-bottom, 0px))`,
                        background: "#1A1A1A",
                        borderTop: "1px solid #222",
                    }}
                >
                    {/* Attached files preview - hidden for keyframes mode */}
                    {!isKeyframesMode && attachments.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1.5 mb-1.5 animate-in fade-in-0 duration-200">
                            {attachments.map((att, i) => (
                                att.isImage ? (
                                    <div key={i} className="relative shrink-0">
                                        <img
                                            src={att.url}
                                            alt={att.name}
                                            className="h-[72px] w-[72px] rounded-[10px] object-cover cursor-pointer"
                                            onClick={() => setPreviewAttachment(att)}
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveAttachment(i);
                                            }}
                                            className="absolute top-1 right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full"
                                            style={{background: "rgba(0,0,0,0.6)"}}
                                        >
                                            <X className="h-2.5 w-2.5 text-white"/>
                                        </button>
                                    </div>
                                ) : att.isVideo ? (
                                    <div key={i} className="relative shrink-0">
                                        <video
                                            src={att.url}
                                            className="h-[72px] w-[72px] rounded-[10px] object-cover cursor-pointer"
                                            onClick={() => setPreviewAttachment(att)}
                                            muted
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="h-6 w-6 rounded-full bg-black/50 flex items-center justify-center">
                                                <svg className="h-3 w-3 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M8 5v14l11-7z"/>
                                                </svg>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveAttachment(i);
                                            }}
                                            className="absolute top-1 right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full"
                                            style={{background: "rgba(0,0,0,0.6)"}}
                                        >
                                            <X className="h-2.5 w-2.5 text-white"/>
                                        </button>
                                    </div>
                                ) : att.isAudio ? (
                                    <div
                                        key={i}
                                        className="relative shrink-0 h-[72px] w-[72px] rounded-[10px] cursor-pointer overflow-hidden"
                                        style={{background: "linear-gradient(135deg, rgba(200,255,0,0.2) 0%, rgba(200,255,0,0.05) 100%)"}}
                                        onClick={() => setPreviewAttachment(att)}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="h-8 w-8 rounded-full bg-primary/90 flex items-center justify-center">
                                                <Music className="h-4 w-4 text-primary-foreground"/>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveAttachment(i);
                                            }}
                                            className="absolute top-1 right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full"
                                            style={{background: "rgba(0,0,0,0.6)"}}
                                        >
                                            <X className="h-2.5 w-2.5 text-white"/>
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        key={i}
                                        className="shrink-0 flex items-center gap-2 rounded-lg px-2 py-1.5"
                                        style={{background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)"}}
                                    >
                                        <FileText className="h-4 w-4 text-muted-foreground shrink-0"/>
                                        <span
                                            className="text-xs text-muted-foreground max-w-[80px] truncate">{att.name.length > 12 ? att.name.slice(0, 12) + "…" : att.name}</span>
                                        <button
                                            onClick={() => onRemoveAttachment(i)}
                                            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                                            style={{background: "rgba(0,0,0,0.6)"}}
                                        >
                                            <X className="h-2.5 w-2.5 text-white"/>
                                        </button>
                                    </div>
                                )
                            ))}
                        </div>
                    )}

                    {/* Params row */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap mb-2">
                        <div ref={modelPickerRef} className="relative shrink-0">
                            <button onClick={() => setModelPickerOpen(!modelPickerOpen)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-secondary px-3 h-7 text-xs font-medium text-primary whitespace-nowrap">
                                <ModelIcon className="h-3 w-3"/>
                                {selectedModel?.name}
                                <ChevronDown className="h-3 w-3"/>
                            </button>
                            <MobileBottomSheet open={modelPickerOpen} onClose={() => setModelPickerOpen(false)} title="ВЫБОР МОДЕЛИ">
                                <div className="p-1.5">
                                    {models.map((model) => {
                                        const Icon = getModelIcon(model.icon);
                                        const isActive = model.id === selectedModel.id;
                                        return (
                                            <button key={model.id} onClick={(e) => {
                                                e.stopPropagation();
                                                onModelSelect(model);
                                                setTimeout(() => setModelPickerOpen(false), 150);
                                            }}
                                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}
                                            >
                                                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "icon-glow" : ""}`}/>
                                                <div className="text-left min-w-0 flex-1">
                                                    <p className="font-medium text-xs">{model.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{model.description.slice(0, 40)}...</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">{model?.cost}
                                                        <CloverIcon className="h-2.5 w-2.5 text-primary" fill="currentColor"/></span>
                                                    {isActive && <Check className="h-3.5 w-3.5 text-primary"/>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </MobileBottomSheet>
                        </div>
                        {isDesignTab &&
                            <DesignParamsBar settings={designSettings} onSettingsChange={onDesignSettingsChange} modelName={selectedModel.name}
                                             modelId={selectedModel.key} isMobile uploadedFiles={uploadedFiles} onAddUploadedFile={onAddUploadedFile}
                                             generatedFiles={generatedFiles}/>}
                        {isVideoTab &&
                            <VideoParamsBar settings={videoSettings} onSettingsChange={onVideoSettingsChange} modelId={selectedModel.key} isMobile
                                            uploadedFiles={uploadedFiles} onAddUploadedFile={onAddUploadedFile} generatedFiles={generatedFiles}/>}
                        {isAudioTab && <AudioParamsBar settings={audioSettings} onSettingsChange={onAudioSettingsChange} isMobile/>}
                    </div>

                    {/* Input row */}
                    <div className="rounded-xl border border-border bg-card px-2 py-1.5 flex items-center gap-1.5">
                        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect}
                               accept="image/*,text/*,video/*,.pdf"/>
                        <input ref={videoInputRef} type="file" className="hidden" onChange={handleVideoSelect} accept="video/*"/>
                        {/* Attachment button - hidden for keyframes mode */}
                        {!isKeyframesMode && (
                            isMotionMode ? (
                                <>
                                    {/* Image attachment button for motion mode */}
                                    <button
                                        onClick={() => setShowMotionImagePicker(true)}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:text-primary"
                                    >
                                        <Image className="h-5 w-5"/>
                                    </button>
                                    {/* Video attachment button for motion mode */}
                                    <button
                                        onClick={() => setShowMotionVideoPicker(true)}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:text-primary"
                                    >
                                        <Video className="h-5 w-5"/>
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => !isAtFileLimit && setShowAttachmentPicker(true)}
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isAtFileLimit ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground active:text-primary"}`}
                                >
                                    <Paperclip className="h-5 w-5"/>
                                </button>
                            )
                        )}
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => {
                                onPromptChange(e.target.value);
                                e.target.style.height = "auto";
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                            }}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder={placeholderText}
                            className="flex-1 min-w-0 bg-transparent text-base md:text-sm text-foreground placeholder:text-text-hint focus:outline-none resize-none overflow-y-auto py-1.5 leading-5"
                            style={{height: "32px", maxHeight: "120px"}}
                            rows={1}
                            disabled={isCurrentTabLoading}
                        />
                        <button onClick={handleMicClick}
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isRecording ? "text-destructive" : "text-muted-foreground active:text-primary"}`}>
                            <Mic className="h-5 w-5"/>
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isCurrentTabLoading || (!prompt.trim() && !isKeyframesMode && attachments.length === 0)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                        >
                            <Send className="h-4 w-4"/>
                        </button>
                    </div>
                </div>

                {/* Attachment Picker - Mobile */}
                <AttachmentPicker
                    open={showAttachmentPicker}
                    onClose={() => setShowAttachmentPicker(false)}
                    onSelect={(files) => {
                        const result = onAddStoredAttachment(files);
                        if (!result.added) {
                            toast("Максимум файлов достигнут");
                        }
                    }}
                    maxFiles={MAX_ATTACHMENTS}
                    currentCount={attachments.length}
                    uploadedFiles={uploadedFiles}
                    onSaveUploadedFile={onAddUploadedFile}
                    generatedFiles={generatedFiles}
                />

                {/* Motion Mode Image Picker - Mobile */}
                <AttachmentPicker
                    open={showMotionImagePicker}
                    onClose={() => setShowMotionImagePicker(false)}
                    onSelect={(files) => {
                        if (files.length > 0) {
                            const imageIndices = attachments.map((a, i) => a.isImage ? i : -1).filter(i => i !== -1).reverse();
                            imageIndices.forEach(i => onRemoveAttachment(i));
                            onAddStoredAttachment(files.slice(0, motionLimits?.maxImages || 1));
                        }
                    }}
                    maxFiles={motionLimits?.maxImages || 1}
                    currentCount={0}
                    acceptedTypes={["image"]}
                    uploadedFiles={uploadedFiles}
                    onSaveUploadedFile={onAddUploadedFile}
                    generatedFiles={generatedFiles}
                />

                {/* Motion Mode Video Picker - Mobile */}
                <AttachmentPicker
                    open={showMotionVideoPicker}
                    onClose={() => setShowMotionVideoPicker(false)}
                    onSelect={(files) => {
                        if (files.length > 0) {
                            const videoIndices = attachments.map((a, i) => a.isVideo ? i : -1).filter(i => i !== -1).reverse();
                            videoIndices.forEach(i => onRemoveAttachment(i));
                            onAddStoredAttachment(files.slice(0, motionLimits?.maxVideos || 1));
                        }
                    }}
                    maxFiles={motionLimits?.maxVideos || 1}
                    currentCount={0}
                    acceptedTypes={["video"]}
                    uploadedFiles={uploadedFiles}
                    onSaveUploadedFile={onAddUploadedFile}
                    generatedFiles={generatedFiles}
                />

                {/* Preview attachment - Mobile */}
                {previewAttachment && createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center"
                        style={{background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)"}}
                        onClick={() => setPreviewAttachment(null)}
                    >
                        <button
                            onClick={() => setPreviewAttachment(null)}
                            className="fixed top-5 right-5 h-10 w-10 rounded-xl flex items-center justify-center transition-colors z-[10000]"
                            style={{background: "rgba(255,255,255,0.1)"}}
                        >
                            <X className="h-5 w-5 text-white"/>
                        </button>
                        {previewAttachment.isVideo ? (
                            <video
                                src={previewAttachment.url}
                                className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
                                onClick={(e) => e.stopPropagation()}
                                controls
                                autoPlay
                            />
                        ) : previewAttachment.isAudio ? (
                            <div
                                className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-card border border-border"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Music className="h-8 w-8 text-primary"/>
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
            </div>
        );
    }

    /* ═══════════════ DESKTOP / TABLET LAYOUT ═══════════════ */
    return (
        <div className="flex flex-col h-full min-w-0 relative">
            <WorkspaceSidebar
                isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
                folders={folders} chats={chats} activeChatId={activeChatId}
                onSelectChat={(id) => {
                    onSelectChat(id);
                    setSidebarOpen(false);
                }}
                onNewChat={() => {
                    onNewChat();
                    setSidebarOpen(false);
                }}
                onAddFolder={onAddFolder} onRenameFolder={onRenameFolder}
                onChangeFolderColor={onChangeFolderColor} onDeleteFolder={onDeleteFolder}
                onRenameChat={onRenameChat} onMoveChat={onMoveChat}
                onPinChat={onPinChat} onDuplicateChat={onDuplicateChat}
                onDeleteChat={onDeleteChat}
                title={sidebarTitle} activeTab={activeTab}
            />

            {/* Row 1: nav + tabs + window controls */}
            <div className="flex items-center justify-between px-4 shrink-0" style={{minHeight: 44}}>
                <div className="flex items-center gap-1 min-w-0">
                    <button onClick={() => setSidebarOpen(true)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#888] hover:text-foreground hover:bg-surface-hover transition-colors">
                        <FolderOpen className="h-4 w-4"/>
                    </button>
                    <button onClick={onNewChat}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#888] hover:text-foreground hover:bg-surface-hover transition-colors">
                        <Plus className="h-4 w-4"/>
                    </button>
                    <div className="w-px h-4 bg-border mx-1.5 shrink-0"/>
                    <div className="flex items-center gap-0.5">
                        {TAB_CONFIG.map((tab) => {
                            const TabIcon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabSwitch(tab.id)}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${isActive ? "text-primary" : "text-[#888] hover:text-[#BBB]"
                                    }`}
                                >
                                    <TabIcon size={16} strokeWidth={2} className={isActive ? "drop-shadow-[0_0_6px_rgba(200,255,0,0.4)]" : ""}/>
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    {showPanelSwitcher && (
                        <button onClick={onSwitchPanel}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#888] hover:text-foreground hover:bg-surface-hover transition-colors"
                                title={`Панель ${activePanel === "left" ? "2" : "1"}`}>
                            <Columns2 className="h-3.5 w-3.5"/>
                        </button>
                    )}
                    {!showPanelSwitcher && (
                        <>
                            <button onClick={onMinimize} disabled={!canMinimize}
                                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${canMinimize ? "text-[#888] hover:text-foreground hover:bg-surface-hover" : "text-[#444] cursor-not-allowed"}`}
                            >
                                <Minus className="h-3 w-3"/>
                            </button>
                            <button onClick={onToggleMaximize}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#888] hover:text-foreground hover:bg-surface-hover transition-colors">
                                {isMaximized ? <Minimize2 className="h-3 w-3"/> : <Maximize2 className="h-3 w-3"/>}
                            </button>
                        </>
                    )}
                    {canClose && (
                        <button onClick={onClose}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#888] hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <X className="h-3 w-3"/>
                        </button>
                    )}
                </div>
            </div>

            {/* Row 2: active chat name */}
            <div className="flex items-center gap-2 pl-4 pr-4 shrink-0" style={{height: 28}}>
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"/>
                <span className="text-[13px] text-[#999] truncate">{chatName}</span>
            </div>

            {/* Main area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
                <div key={activeTab}
                     className={`tab-fade-in w-full max-w-[860px] mx-auto ${!hasContent ? "flex flex-col items-center justify-center h-full" : ""}`}>
                    {!hasContent ? (
                        <div className="text-center max-w-sm">
                            <div
                                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 model-icon-glow">
                                <ModelIcon className="h-8 w-8 text-primary icon-glow"/>
                            </div>
                            <h2 className="text-xl font-bold text-foreground mb-2">{selectedModel?.name}</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{selectedModel?.description}</p>
                            <span className="text-primary text-lg icon-glow">✦</span>
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-3xl mx-auto">
                            {messages.map((msg, idx) => {
                                // Find previous user message to get attachments for regeneration
                                const prevUserMsg = idx > 0 ? messages.slice(0, idx).reverse().find(m => m.role === "user") : null;
                                return (
                                    <ChatMessageItem
                                        key={msg.id}
                                        message={msg}
                                        onDelete={isDesignTab ? onDeleteDesignMessage : isVideoTab ? onDeleteVideoMessage : isAudioTab ? onDeleteAudioMessage : undefined}
                                        onRegenerate={(isDesignTab || isVideoTab || isAudioTab) ? (p, att) => isDesignTab ? onGenerateImages(p, att) : isVideoTab ? onGenerateVideo(p) : onGenerateAudio(p) : undefined}
                                        regenerateAttachments={prevUserMsg?.attachments}
                                        onEdit={onEditMessage}
                                        prevUserContent={prevUserMsg?.content}
                                        prevUserDesignSettings={prevUserMsg?.designSettings}
                                        prevUserModelId={prevUserMsg?.modelId}
                                        prevUserVideoSettings={prevUserMsg?.videoSettings}
                                        prevUserAudioSettings={prevUserMsg?.audioSettings}
                                    />
                                );
                            })}
                            {(isTextLoading || (isDesignTab && isImageLoading) || (isVideoTab && isVideoLoading) || (isAudioTab && isAudioLoading)) && (
                                <div className="flex gap-3">
                                    <div
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                                        <div className="spinner-lime h-4 w-4"/>
                                    </div>
                                    <div className="rounded-2xl px-4 py-3 bg-card/60 border border-border"><span
                                        className="text-sm text-muted-foreground animate-pulse-glow">{isDesignTab ? "Генерирую изображения..." : isVideoTab ? "Генерирую видео..." : isAudioTab ? "Генерирую аудио..." : "Генерирую ответ..."}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div ref={messagesEndRef}/>
            </div>

            {/* Input bar */}
            <div className="shrink-0 px-4 pb-3 pt-1 overflow-visible w-full max-w-[860px] mx-auto">
                {/* Attached files preview - hidden for keyframes mode */}
                {!isKeyframesMode && attachments.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                        {attachments.map((att, i) => (
                            att.isImage ? (
                                <div key={i} className="relative group">
                                    <img
                                        src={att.url}
                                        alt={att.name}
                                        className="h-[72px] w-[72px] rounded-[10px] object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setPreviewAttachment(att)}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveAttachment(i);
                                        }}
                                        className="absolute top-1 right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{background: "rgba(0,0,0,0.6)"}}
                                    >
                                        <X className="h-2.5 w-2.5 text-white"/>
                                    </button>
                                </div>
                            ) : att.isVideo ? (
                                <div key={i} className="relative group">
                                    <video
                                        src={att.url}
                                        className="h-[72px] w-[72px] rounded-[10px] object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setPreviewAttachment(att)}
                                        muted
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="h-6 w-6 rounded-full bg-black/50 flex items-center justify-center">
                                            <svg className="h-3 w-3 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M8 5v14l11-7z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveAttachment(i);
                                        }}
                                        className="absolute top-1 right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{background: "rgba(0,0,0,0.6)"}}
                                    >
                                        <X className="h-2.5 w-2.5 text-white"/>
                                    </button>
                                </div>
                            ) : att.isAudio ? (
                                <div
                                    key={i}
                                    className="relative group h-[72px] w-[72px] rounded-[10px] cursor-pointer overflow-hidden"
                                    style={{background: "linear-gradient(135deg, rgba(200,255,0,0.2) 0%, rgba(200,255,0,0.05) 100%)"}}
                                    onClick={() => setPreviewAttachment(att)}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center hover:opacity-80 transition-opacity">
                                        <div className="h-8 w-8 rounded-full bg-primary/90 flex items-center justify-center">
                                            <Music className="h-4 w-4 text-primary-foreground"/>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveAttachment(i);
                                        }}
                                        className="absolute top-1 right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{background: "rgba(0,0,0,0.6)"}}
                                    >
                                        <X className="h-2.5 w-2.5 text-white"/>
                                    </button>
                                </div>
                            ) : (
                                <div key={i}
                                     className="relative group flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2 py-1.5">
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0"/>
                                    <span
                                        className="text-[11px] text-muted-foreground max-w-[80px] truncate">{att.name.length > 12 ? att.name.slice(0, 12) + "…" : att.name}</span>
                                    <button
                                        onClick={() => onRemoveAttachment(i)}
                                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{background: "rgba(0,0,0,0.6)"}}
                                    >
                                        <X className="h-2.5 w-2.5 text-white"/>
                                    </button>
                                </div>
                            )
                        ))}
                    </div>
                )}

                <div
                    className="rounded-xl border border-border bg-card px-3 py-2 min-h-[56px] flex flex-col justify-center focus-within:border-primary/30 transition-colors">
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect}
                           accept="image/*,text/*,video/*,.pdf"/>
                    <input ref={videoInputRef} type="file" className="hidden" onChange={handleVideoSelect} accept="video/*"/>
                    <div className="flex items-center gap-2">
                        {/* Attachment button - hidden for keyframes mode */}
                        {!isKeyframesMode && (
                            isMotionMode ? (
                                <>
                                    {/* Image attachment button for motion mode */}
                                    <button
                                        onClick={() => setShowMotionImagePicker(true)}
                                        className="flex shrink-0 items-center gap-1 rounded-lg h-9 px-2 transition-colors self-center text-muted-foreground hover:text-primary hover:bg-surface-hover"
                                    >
                                        <Image className="h-[18px] w-[18px]"/>
                                        <span
                                            className={`text-[11px] font-medium rounded-md px-1.5 py-0.5 ${imageCount > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {imageCount}/{motionLimits?.maxImages}
                    </span>
                                    </button>
                                    {/* Video attachment button for motion mode */}
                                    <button
                                        onClick={() => setShowMotionVideoPicker(true)}
                                        className="flex shrink-0 items-center gap-1 rounded-lg h-9 px-2 transition-colors self-center text-muted-foreground hover:text-primary hover:bg-surface-hover"
                                    >
                                        <Video className="h-[18px] w-[18px]"/>
                                        <span
                                            className={`text-[11px] font-medium rounded-md px-1.5 py-0.5 ${videoCount > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {videoCount}/{motionLimits?.maxVideos}
                    </span>
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => !isAtFileLimit && setShowAttachmentPicker(true)}
                                    className={`flex shrink-0 items-center gap-1 rounded-lg h-9 px-2 transition-colors self-center ${isAtFileLimit ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-primary hover:bg-surface-hover"}`}
                                >
                                    <Paperclip className="h-[18px] w-[18px]"/>
                                    <span
                                        className={`text-[11px] font-medium rounded-md px-1.5 py-0.5 ${isAtFileLimit ? "bg-destructive/15 text-destructive" : attachments.length > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {attachments.length}/{MAX_ATTACHMENTS}
                  </span>
                                </button>
                            )
                        )}
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => {
                                onPromptChange(e.target.value);
                                e.target.style.height = "auto";
                                e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                            }}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder={placeholderText}
                            className="flex-1 min-w-0 bg-transparent text-base md:text-sm text-foreground placeholder:text-text-hint focus:outline-none resize-none overflow-y-auto py-2 leading-5"
                            style={{height: "36px", maxHeight: "200px"}}
                            rows={1}
                            disabled={isCurrentTabLoading}
                        />
                        <button onClick={handleMicClick}
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors self-center ${isRecording ? "bg-destructive/20 text-destructive animate-pulse-glow" : "text-[#A0A0A0] hover:text-primary hover:bg-surface-hover"}`}>
                            <Mic className="h-[18px] w-[18px]"/>
                        </button>
                        <div className="flex items-center gap-1 rounded-lg bg-secondary border border-border px-2.5 h-7 shrink-0 self-center">
                            <span className="text-[11px] font-semibold text-muted-foreground">{selectedModel?.cost}</span>
                            <CloverIcon className="h-3 w-3 text-primary" fill="currentColor"/>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={isCurrentTabLoading || (!prompt.trim() && !isKeyframesMode && attachments.length === 0)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 self-center"
                        >
                            <Send className="h-4 w-4"/>
                        </button>
                    </div>
                </div>

                {/* Bottom params */}
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap px-0 overflow-visible">
                    <div ref={modelPickerRef} className="relative">
                        <button onClick={() => setModelPickerOpen(!modelPickerOpen)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-secondary px-3 h-7 text-xs font-medium text-primary hover:bg-surface-hover transition-colors">
                            <ModelIcon className="h-3 w-3"/>
                            {selectedModel?.name}
                            <ChevronDown className="h-3 w-3"/>
                        </button>
                        {modelPickerOpen && (
                            <div
                                className="absolute bottom-[calc(100%+8px)] left-0 w-64 rounded-xl border border-border bg-card shadow-xl shadow-background/50 overflow-hidden z-[1000] animate-popup-fade">
                                <div className="p-1.5">
                                    {models.map((model) => {
                                        const Icon = getModelIcon(model.icon);
                                        const isActive = model.id === selectedModel.id;
                                        return (
                                            <button key={model.id} onClick={() => {
                                                onModelSelect(model);
                                                setModelPickerOpen(false);
                                            }}
                                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}
                                            >
                                                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "icon-glow" : ""}`}/>
                                                <div className="text-left min-w-0 flex-1">
                                                    <p className="font-medium text-xs">{model.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{model.description.slice(0, 40)}...</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">{model.cost}
                                                        <CloverIcon className="h-2.5 w-2.5 text-primary" fill="currentColor"/></span>
                                                    {isActive && <Check className="h-3.5 w-3.5 text-primary"/>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    {isDesignTab &&
                        <DesignParamsBar settings={designSettings} onSettingsChange={onDesignSettingsChange} modelName={selectedModel.name}
                                         modelId={selectedModel.key} uploadedFiles={uploadedFiles} onAddUploadedFile={onAddUploadedFile}
                                         generatedFiles={generatedFiles}/>}
                    {isVideoTab && <VideoParamsBar settings={videoSettings} onSettingsChange={onVideoSettingsChange} modelId={selectedModel.key}
                                                   uploadedFiles={uploadedFiles} onAddUploadedFile={onAddUploadedFile}
                                                   generatedFiles={generatedFiles}/>}
                    {isAudioTab && <AudioParamsBar settings={audioSettings} onSettingsChange={onAudioSettingsChange}/>}
                </div>
            </div>

            {/* Preview attachment - Desktop */}
            {previewAttachment && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    style={{background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)"}}
                    onClick={() => setPreviewAttachment(null)}
                >
                    <button
                        onClick={() => setPreviewAttachment(null)}
                        className="fixed top-5 right-5 h-10 w-10 rounded-xl flex items-center justify-center transition-colors z-[10000]"
                        style={{background: "rgba(255,255,255,0.1)"}}
                    >
                        <X className="h-5 w-5 text-white"/>
                    </button>
                    {previewAttachment.isVideo ? (
                        <video
                            src={previewAttachment.url}
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
                            onClick={(e) => e.stopPropagation()}
                            controls
                            autoPlay
                        />
                    ) : previewAttachment.isAudio ? (
                        <div
                            className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-card border border-border"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Music className="h-8 w-8 text-primary"/>
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

            {/* Attachment Picker */}
            <AttachmentPicker
                open={showAttachmentPicker}
                onClose={() => setShowAttachmentPicker(false)}
                onSelect={(files) => {
                    const result = onAddStoredAttachment(files);
                    if (!result.added) {
                        toast("Максимум файлов достигнут");
                    }
                }}
                maxFiles={MAX_ATTACHMENTS}
                currentCount={attachments.length}
                uploadedFiles={uploadedFiles}
                onSaveUploadedFile={onAddUploadedFile}
                generatedFiles={generatedFiles}
            />

            {/* Motion Mode Image Picker */}
            <AttachmentPicker
                open={showMotionImagePicker}
                onClose={() => setShowMotionImagePicker(false)}
                onSelect={(files) => {
                    if (files.length > 0) {
                        // Remove existing images first (in reverse order to preserve indices)
                        const imageIndices = attachments.map((a, i) => a.isImage ? i : -1).filter(i => i !== -1).reverse();
                        imageIndices.forEach(i => onRemoveAttachment(i));
                        // Add via onAddStoredAttachment
                        onAddStoredAttachment(files.slice(0, motionLimits?.maxImages || 1));
                    }
                }}
                maxFiles={motionLimits?.maxImages || 1}
                currentCount={0}
                acceptedTypes={["image"]}
                uploadedFiles={uploadedFiles}
                onSaveUploadedFile={onAddUploadedFile}
                generatedFiles={generatedFiles}
            />

            {/* Motion Mode Video Picker */}
            <AttachmentPicker
                open={showMotionVideoPicker}
                onClose={() => setShowMotionVideoPicker(false)}
                onSelect={(files) => {
                    if (files.length > 0) {
                        // Remove existing videos first (in reverse order to preserve indices)
                        const videoIndices = attachments.map((a, i) => a.isVideo ? i : -1).filter(i => i !== -1).reverse();
                        videoIndices.forEach(i => onRemoveAttachment(i));
                        // Add via onAddStoredAttachment
                        onAddStoredAttachment(files.slice(0, motionLimits?.maxVideos || 1));
                    }
                }}
                maxFiles={motionLimits?.maxVideos || 1}
                currentCount={0}
                acceptedTypes={["video"]}
                uploadedFiles={uploadedFiles}
                onSaveUploadedFile={onAddUploadedFile}
                generatedFiles={generatedFiles}
            />
        </div>
    );
};

export default WorkspacePanel;
