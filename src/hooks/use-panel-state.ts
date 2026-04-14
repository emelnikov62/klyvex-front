import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {getDefaultModel} from "@/lib/models";
import {DEFAULT_DESIGN_SETTINGS, type DesignSettings} from "@/lib/design-types";
import {DEFAULT_VIDEO_SETTINGS, type KeyframeImageRef, VIDEO_MODEL_CONFIG, type VideoSettings} from "@/lib/video-types";
import {type AudioSettings, DEFAULT_AUDIO_SETTINGS} from "@/lib/audio-types";
import {AiModel, TabType} from "@/lib/kernel/models/main/AiModel";
import {useAuth} from "@/contexts/AuthContext";
import {useDispatch} from "react-redux";
import messageService, {MessageContext} from "@/lib/service/MessageService.ts";
import {CONFIG} from "@/lib/enums/Config.ts";
import {Response} from "@/lib/kernel/models/responses/Response";
import {toast} from "sonner";
import {AiRequestParams} from "@/lib/kernel/models/requests/ai/AiRequest.tsx";
import {fileToBase64, generateRandomName, generateTempProjectId, truncateToWords} from "@/lib/utils/file";
import type {AttachedFile, ChatFolder, ChatMessage, ChatSession, RequestMessage, StoredFile} from "@/lib/types/chat";

// Re-export types for backward compatibility
export type {ChatMessage, AttachedFile, StoredFile, RequestMessage, ChatSession, ChatFolder} from "@/lib/types/chat";

// Create temporary ChatSession for first generation
function createTempChatSession(name: string, modelId: string, type: string): ChatSession {
    return {
        id: generateTempProjectId(),
        name,
        messages: [],
        folder: {id: 0, name: '', color: '', type: '', projects: []},
        modelId,
        type,
        pinned: false,
    };
}

// Helper: Convert RequestMessage[] to ChatMessage[]
function convertRequestsToMessages(requests: RequestMessage[]): ChatMessage[] {
    const messages: ChatMessage[] = [];
    requests.forEach(r => {
        try {
            const request = JSON.parse(r.request);
            const response = JSON.parse(r.response);

            // Build user attachments from aiParams
            const userAttachments: AttachedFile[] = [];

            // Add images from aiParams
            if (request.params.files?.images) {
                request.params.files.images.forEach((url: string) => {
                    userAttachments.push({
                        url: url,
                        isImage: true
                    });
                });
            }

            // Add videos from aiParams
            if (request.params.files?.videos) {
                request.params.files.videos.forEach((url: string) => {
                    userAttachments.push({
                        url: url,
                        isVideo: true
                    });
                });
            }

            // Add audio from aiParams (if exists in request structure)
            if (request.params.files?.audios) {
                request.params.files.audios.forEach((url: string) => {
                    userAttachments.push({
                        url: url,
                        isAudio: true
                    });
                });
            }

            // Build designSettings from request params (for image generation)
            let userDesignSettings: DesignSettings | undefined;
            if (request.params.image) {
                // Restore styleRefs from template
                const styleRefs: { name?: string; url: string; base64?: string }[] = [];
                if (request.params.image.reference) {
                    const reference = request.params.image.reference;
                    styleRefs.push({
                        name: reference.template,
                        url: reference.template
                    });
                }

                userDesignSettings = {
                    aspectRatio: request.params.image.ratio || '1:1',
                    quality: request.params.image.quality || '1K',
                    rawMode: request.params.image.rawMode || false,
                    turboMode: request.params.image.turbo || false,
                    chaos: request.params.image.chaos || 0,
                    stylize: request.params.image.stylize || 100,
                    weird: request.params.image.weird || 0,
                    negativePrompt: request.params.image.negativePrompt || '',
                    styleRefs: styleRefs,
                    characterRefs: [],
                };
            }

            // Build videoSettings from request params (for video generation)
            let userVideoSettings: VideoSettings | undefined;
            if (request.params.video) {
                // Extract keyframe images if present
                let keyframeImage1: KeyframeImageRef | null = null;
                let keyframeImage2: KeyframeImageRef | null = null;

                if (request.params.files?.images && request.params.video.mode == 'keyframes') {
                    keyframeImage1 = {
                        name: request.params.files.images[0],
                        url: request.params.files.images[0]
                    };
                    keyframeImage2 = {
                        name: request.params.files.images[1],
                        url: request.params.files.images[1]
                    };
                }

                userVideoSettings = {
                    mode: request.params.video.mode || 'i2v',
                    aspectRatio: request.params.video.ratio || '16:9',
                    duration: request.params.video.duration || 5,
                    resolution: request.params.video.quality || '720p',
                    multiShot: request.params.video.multiShot || false,
                    negativePrompt: request.params.video.negativePrompt || '',
                    preset: request.params.video.preset || 'none',
                    keyframeImage1,
                    keyframeImage2,
                };
            }

            // Build audioSettings from request params (for audio generation)
            let userAudioSettings: AudioSettings | undefined;
            if (request.params.audio) {
                userAudioSettings = {
                    mode: (request.params.audio?.genre || request.params.audio?.mood) ? 'custom' : 'simple',
                    instrumental: request.params.audio?.instrumental || false,
                    duration: request.params.duration || request.params.audio?.duration || 120,
                    genre: request.params.audio?.genre || '',
                    tempo: request.params.audio?.tempo || 'medium',
                    mood: request.params.audio?.mood || '',
                };
            }

            messages.push({
                id: `msg-${request.id}-u`,
                modelId: request.model,
                role: 'user',
                content: request.params?.prompt || '',
                attachments: userAttachments.length > 0 ? userAttachments : undefined,
                timestamp: new Date(r.date),
                designSettings: userDesignSettings,
                videoSettings: userVideoSettings,
                audioSettings: userAudioSettings,
            });

            messages.push({
                id: `msg-${response.request.id}-a`,
                modelId: response.request.context?.model,
                role: 'assistant',
                content: response.request.context?.answer || '',
                attachments: response.request.context?.images?.map((url: string) => ({
                    url,
                    isImage: true
                })) || response.request.context?.videos?.map((url: string) => ({
                    url,
                    isVideo: true
                })) || response.request.context?.audios?.map((url: string) => ({
                    url,
                    isAudio: true
                })) || [],
                timestamp: new Date(response.request.date)
            });
        } catch (e) {
            console.error('Failed to parse request/response:', e);
        }
    });
    return messages;
}

// Helper: Parse projects and build folders structure
function parseProjectsData(
    projects: ChatSession[],
    folders: ChatFolder[],
    tabType: TabType
): { folders: ChatFolder[]; chatsWithoutFolder: ChatSession[] } {
    // Filter projects by tab type
    const filteredProjects = projects.filter(p => p.type === tabType);

    // Ensure messages are populated from requests
    const processedProjects = filteredProjects.map(p => ({
        ...p,
        messages: p.messages?.length > 0 ? p.messages : (p.requests ? convertRequestsToMessages(p.requests) : [])
    }));

    // Group projects by folder
    const folderMap = new Map<number, ChatFolder>();

    // First, add all folders from user.folders (they may be empty or have projects)
    folders.forEach(folder => {
        folderMap.set(folder.id, {
            ...folder,
            projects: folder.projects || []
        });
    });

    const chatsWithoutFolder: ChatSession[] = [];

    processedProjects.forEach(project => {
        if (project.folder && project.folder.id) {
            // Project has a folder
            if (!folderMap.has(project.folder.id)) {
                // Folder not in user.folders, create it from project.folder
                folderMap.set(project.folder.id, {
                    ...project.folder,
                    projects: []
                });
            }
            folderMap.get(project.folder.id)!.projects.push(project);
        } else {
            // Project without folder
            chatsWithoutFolder.push(project);
        }
    });

    // Filter folders by tab type (only include folders that match the tab type or are empty)
    const filteredFolders = Array.from(folderMap.values()).filter(folder => {
        // Include folder if it has projects for this tab type or if it matches the tab type
        const hasProjectsForTab = folder.projects.some(p => p.type === tabType);
        const folderMatchesTab = folder.type === tabType;
        return hasProjectsForTab || folderMatchesTab || folder.projects.length === 0;
    });

    return {
        folders: filteredFolders,
        chatsWithoutFolder
    };
}

// Helper: Get current messages from project
function getProjectMessages(project: ChatSession | undefined): ChatMessage[] {
    if (!project) return [];
    return project.messages?.length > 0
        ? project.messages
        : (project.requests ? convertRequestsToMessages(project.requests) : []);
}

// Helper: Check if URL is valid (not a blob URL)
function isValidUrl(url: string | undefined): boolean {
    if (!url) return false;
    // Filter out blob URLs which are temporary and invalid after page refresh
    if (url.startsWith('blob:')) return false;
    // Keep http/https URLs and data URLs
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}

// Helper: Extract uploaded files from user.projects (from requests - user attachments)
function extractUploadedFilesFromProjects(projects: ChatSession[]): StoredFile[] {
    const files: StoredFile[] = [];

    projects.forEach(project => {
        if (!project.requests) return;

        project.requests.forEach(r => {
            try {
                const request = JSON.parse(r.request);
                const prompt = request.params.prompt || project.name || '';
                const date = new Date(r.date);

                // Extract uploaded images from request
                if (request.params.files?.images) {
                    request.params.files.images.forEach((url: string) => {
                        if (isValidUrl(url) && !files.some(f => f.url === url)) {
                            files.push({
                                id: `upl-img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                type: "image",
                                url,
                                prompt,
                                createdAt: date,
                            });
                        }
                    });
                }

                // Extract uploaded videos from request
                if (request.params.files?.videos) {
                    request.params.files.videos.forEach((url: string) => {
                        if (isValidUrl(url) && !files.some(f => f.url === url)) {
                            files.push({
                                id: `upl-vid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                type: "video",
                                url,
                                prompt,
                                createdAt: date,
                            });
                        }
                    });
                }

                // Extract uploaded audios from request
                if (request.params.files?.audios) {
                    request.params.files.audios.forEach((url: string) => {
                        if (isValidUrl(url) && !files.some(f => f.url === url)) {
                            files.push({
                                id: `upl-aud-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                type: "audio",
                                url,
                                prompt,
                                createdAt: date,
                            });
                        }
                    });
                }
            } catch (e) {
                console.error('Failed to parse request:', e);
            }
        });
    });

    // Sort by date descending (newest first)
    return files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Helper: Extract generated files from user.projects (from responses)
function extractGeneratedFilesFromProjects(projects: ChatSession[]): StoredFile[] {
    const files: StoredFile[] = [];

    projects.forEach(project => {
        if (!project.requests) return;

        project.requests.forEach(r => {
            try {
                const request = JSON.parse(r.request);
                const response = JSON.parse(r.response);
                const prompt = request.params.prompt || response.request?.context?.prompt || project.name || '';
                const date = new Date(r.date);

                // Extract images from response
                if (response.request?.context?.images) {
                    response.request.context.images.forEach((url: string) => {
                        if (url && !files.some(f => f.url === url)) {
                            files.push({
                                id: `gen-img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                type: "image",
                                url,
                                prompt,
                                createdAt: date,
                            });
                        }
                    });
                }

                // Extract videos from response
                if (response.request?.context?.videos) {
                    response.request.context.videos.forEach((url: string) => {
                        if (url && !files.some(f => f.url === url)) {
                            files.push({
                                id: `gen-vid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                type: "video",
                                url,
                                prompt,
                                createdAt: date,
                            });
                        }
                    });
                }

                // Extract audios from response
                if (response.request?.context?.audios) {
                    response.request.context.audios.forEach((url: string) => {
                        if (url && !files.some(f => f.url === url)) {
                            files.push({
                                id: `gen-aud-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                type: "audio",
                                url,
                                prompt,
                                createdAt: date,
                            });
                        }
                    });
                }
            } catch (e) {
                console.error('Failed to parse response:', e);
            }
        });
    });

    // Sort by date descending (newest first)
    return files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

interface SharedFilesOptions {
    uploadedFiles?: StoredFile[];
    onAddUploadedFile?: (file: StoredFile) => void;
    generatedFiles?: StoredFile[];
    onAddGeneratedFile?: (file: StoredFile) => void;
}

export function usePanelState(initialTab: TabType = "text", sharedFiles?: SharedFilesOptions) {
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const {listModels, user, updateProjectMessages, addProject, replaceProjectId} = useAuth()
    const [selectedModel, setSelectedModel] = useState<AiModel>(getDefaultModel(initialTab, listModels));
    // Separate prompts for each tab
    const [textPrompt, setTextPrompt] = useState("");
    const [designPrompt, setDesignPrompt] = useState("");
    const [videoPrompt, setVideoPrompt] = useState("");
    const [audioPrompt, setAudioPrompt] = useState("");
    // Separate attachments for each tab
    const [textAttachments, setTextAttachments] = useState<AttachedFile[]>([]);
    const [designAttachments, setDesignAttachments] = useState<AttachedFile[]>([]);
    const [videoAttachments, setVideoAttachments] = useState<AttachedFile[]>([]);
    const [audioAttachments, setAudioAttachments] = useState<AttachedFile[]>([]);
    const [isTextLoading, setIsTextLoading] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [localGeneratedFiles, setLocalGeneratedFiles] = useState<StoredFile[]>([]);
    const [localUploadedFiles, setLocalUploadedFiles] = useState<StoredFile[]>([]);
    const dispatch = useDispatch();

    // Get current tab's prompt using useMemo
    const prompt = useMemo(() => {
        switch (activeTab) {
            case 'image':
                return designPrompt;
            case 'video':
                return videoPrompt;
            case 'audio':
                return audioPrompt;
            default:
                return textPrompt;
        }
    }, [activeTab, textPrompt, designPrompt, videoPrompt, audioPrompt]);

    // Get current tab's attachments using useMemo
    const attachments = useMemo(() => {
        switch (activeTab) {
            case 'image':
                return designAttachments;
            case 'video':
                return videoAttachments;
            case 'audio':
                return audioAttachments;
            default:
                return textAttachments;
        }
    }, [activeTab, textAttachments, designAttachments, videoAttachments, audioAttachments]);

    // Set prompt for current tab
    const setPrompt = useCallback((value: string) => {
        switch (activeTab) {
            case 'image':
                setDesignPrompt(value);
                break;
            case 'video':
                setVideoPrompt(value);
                break;
            case 'audio':
                setAudioPrompt(value);
                break;
            default:
                setTextPrompt(value);
        }
    }, [activeTab]);

    // Set attachments for current tab - handles both direct value and functional update
    const setAttachmentsForTab = useCallback((tab: TabType, value: AttachedFile[] | ((prev: AttachedFile[]) => AttachedFile[])) => {
        const setter = typeof value === 'function' ? value : () => value;
        switch (tab) {
            case 'image':
                setDesignAttachments(prev => setter(prev));
                break;
            case 'video':
                setVideoAttachments(prev => setter(prev));
                break;
            case 'audio':
                setAudioAttachments(prev => setter(prev));
                break;
            default:
                setTextAttachments(prev => setter(prev));
        }
    }, []);

    // Convenience wrapper that uses activeTab
    const setAttachments = useCallback((value: AttachedFile[] | ((prev: AttachedFile[]) => AttachedFile[])) => {
        setAttachmentsForTab(activeTab, value);
    }, [activeTab, setAttachmentsForTab]);

    // Design state
    const [designSettings, setDesignSettings] = useState<DesignSettings>(DEFAULT_DESIGN_SETTINGS);

    // Video state
    const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);

    // Chat sessions & folders - derived from user.projects
    const {folders: initialFolders, chatsWithoutFolder: initialChats} = useMemo(
        () => parseProjectsData(user.projects || [], user.folders || [], initialTab),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const [folders, setFolders] = useState<ChatFolder[]>(initialFolders);
    const [chats, setChats] = useState<ChatSession[]>(initialChats);
    const [activeChatId, setActiveChatId] = useState<number | null>(() => {
        const allChats = initialFolders.flatMap(f => f.projects).concat(initialChats);
        return allChats.length > 0 ? allChats[0].id : null;
    });

    // Flag to prevent message loading conflict when opening project
    const isOpeningProjectRef = useRef(false);

    // Ref to track current activeTab without causing re-renders in openProject
    const activeTabRef = useRef(activeTab);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    // Sync folders and chats when user.projects changes (but preserve temp projects)
    useEffect(() => {
        const {folders: newFolders, chatsWithoutFolder: newChats} = parseProjectsData(user.projects || [], user.folders || [], activeTab);

        // Preserve temp projects (with negative ids) from current state
        setChats((prevChats) => {
            const tempChats = prevChats.filter(c => c.id < 0);
            return [...newChats, ...tempChats];
        });
        setFolders((prevFolders) => {
            return newFolders.map(newFolder => {
                const existingFolder = prevFolders.find(f => f.id === newFolder.id);
                const tempProjectsInFolder = existingFolder?.projects.filter(c => c.id < 0) || [];
                return {
                    ...newFolder,
                    projects: [...newFolder.projects, ...tempProjectsInFolder]
                };
            });
        });

        // If active chat is no longer valid (except temp projects), select first available
        const allChats = newFolders.flatMap(f => f.projects).concat(newChats);
        if (activeChatId && activeChatId > 0 && !allChats.find(c => c.id === activeChatId)) {
            setActiveChatId(allChats.length > 0 ? allChats[0].id : null);
        }
    }, [user.projects, user.folders, activeTab]);

    // Separate messages for each tab
    const [textMessages, setTextMessages] = useState<ChatMessage[]>([]);
    const [designMessages, setDesignMessages] = useState<ChatMessage[]>([]);
    const [videoMessages, setVideoMessages] = useState<ChatMessage[]>([]);
    const [audioMessages, setAudioMessages] = useState<ChatMessage[]>([]);

    // Get current tab's messages using useMemo
    const messages = useMemo(() => {
        switch (activeTab) {
            case 'image':
                return designMessages;
            case 'video':
                return videoMessages;
            case 'audio':
                return audioMessages;
            default:
                return textMessages;
        }
    }, [activeTab, textMessages, designMessages, videoMessages, audioMessages]);

    // Find current chat from user.projects or local chats/folders (for temp projects)
    const currentChat = useMemo(() => {
        if (!activeChatId) return null;
        // First check user.projects (real projects)
        const allProjects = user.projects || [];
        const found = allProjects.find(c => c.id === activeChatId);
        if (found) return found;
        // Then check local chats and folders (for temp projects with negative ids)
        const localChat = chats.find(c => c.id === activeChatId);
        if (localChat) return localChat;
        const folderChat = folders.flatMap(f => f.projects).find(c => c.id === activeChatId);
        return folderChat || null;
    }, [activeChatId, user.projects, chats, folders]);

    // Load messages when activeChatId or currentChat changes
    useEffect(() => {
        // Skip if we're opening a project (messages already loaded in openProject)
        if (isOpeningProjectRef.current) {
            isOpeningProjectRef.current = false;
            return;
        }

        // Don't clear messages for temp projects (negative ids)
        // They don't exist in user.projects yet but are in local chats/folders
        if (activeChatId === null) {
            setTextMessages([]);
            setDesignMessages([]);
            setVideoMessages([]);
            setAudioMessages([]);
            return;
        }

        // For temp projects, skip loading messages from currentChat
        // Messages are managed locally in the send/generate functions
        if (activeChatId < 0) {
            return;
        }

        if (!currentChat) {
            setTextMessages([]);
            setDesignMessages([]);
            setVideoMessages([]);
            setAudioMessages([]);
            return;
        }

        // Get messages from current chat
        const chatMessages = currentChat.messages?.length > 0
            ? currentChat.messages
            : (currentChat.requests ? convertRequestsToMessages(currentChat.requests) : []);

        // Update the appropriate messages state based on active tab
        switch (activeTab) {
            case 'image':
                setDesignMessages(chatMessages);
                break;
            case 'video':
                setVideoMessages(chatMessages);
                break;
            case 'audio':
                setAudioMessages(chatMessages);
                break;
            default:
                setTextMessages(chatMessages);
        }
    }, [activeChatId, currentChat, activeTab]);

    const switchTab = useCallback((tab: TabType) => {
        setActiveTab(tab);
        const defaultModel = getDefaultModel(tab, listModels);
        setSelectedModel(defaultModel);
        // Update video mode when switching to video tab
        if (tab === 'video' && defaultModel) {
            const modelConfig = VIDEO_MODEL_CONFIG[defaultModel.key];
            if (modelConfig?.modes?.length > 0) {
                setVideoSettings((prev) => ({...prev, mode: modelConfig.modes[0].value}));
            }
        }

        // Parse projects data for the new tab
        const {folders: newFolders, chatsWithoutFolder: newChats} = parseProjectsData(user.projects || [], user.folders || [], tab);
        setFolders(newFolders);
        setChats(newChats);

        // Select first chat from the new tab
        const allChats = newFolders.flatMap(f => f.projects).concat(newChats);
        const firstChatId = allChats.length > 0 ? allChats[0].id : null;
        setActiveChatId(firstChatId);

        // Load messages for the first chat in the new tab
        if (firstChatId) {
            const selectedChat = allChats.find(c => c.id === firstChatId);
            if (selectedChat && selectedChat.messages) {
                switch (tab) {
                    case 'image':
                        setDesignMessages(selectedChat.messages);
                        break;
                    case 'video':
                        setVideoMessages(selectedChat.messages);
                        break;
                    case 'audio':
                        setAudioMessages(selectedChat.messages);
                        break;
                    default:
                        setTextMessages(selectedChat.messages);
                }
            } else {
                setTextMessages([]);
                setDesignMessages([]);
                setVideoMessages([]);
                setAudioMessages([]);
            }
        } else {
            setTextMessages([]);
            setDesignMessages([]);
            setVideoMessages([]);
            setAudioMessages([]);
        }
    }, [listModels, user.projects]);

    // Switch tab with excluding a specific chat (used to prevent same chat on both panels)
    const switchTabWithExclude = useCallback((tab: TabType, excludeChatId: number | null) => {
        setActiveTab(tab);
        const defaultModel = getDefaultModel(tab, listModels);
        setSelectedModel(defaultModel);
        // Update video mode when switching to video tab
        if (tab === 'video' && defaultModel) {
            const modelConfig = VIDEO_MODEL_CONFIG[defaultModel.key];
            if (modelConfig?.modes?.length > 0) {
                setVideoSettings((prev) => ({...prev, mode: modelConfig.modes[0].value}));
            }
        }

        // Parse projects data for the new tab
        const {folders: newFolders, chatsWithoutFolder: newChats} = parseProjectsData(user.projects || [], user.folders || [], tab);
        setFolders(newFolders);
        setChats(newChats);

        // Select first chat from the new tab, excluding the one open on other panel
        const allChats = newFolders.flatMap(f => f.projects).concat(newChats);
        const availableChats = allChats.filter(c => c.id !== excludeChatId);
        const firstChatId = availableChats.length > 0 ? availableChats[0].id : null;
        setActiveChatId(firstChatId);

        // Load messages for the first chat in the new tab
        if (firstChatId) {
            const selectedChat = allChats.find(c => c.id === firstChatId);
            if (selectedChat && selectedChat.messages) {
                switch (tab) {
                    case 'image':
                        setDesignMessages(selectedChat.messages);
                        break;
                    case 'video':
                        setVideoMessages(selectedChat.messages);
                        break;
                    case 'audio':
                        setAudioMessages(selectedChat.messages);
                        break;
                    default:
                        setTextMessages(selectedChat.messages);
                }
            } else {
                setTextMessages([]);
                setDesignMessages([]);
                setVideoMessages([]);
                setAudioMessages([]);
            }
        } else {
            setTextMessages([]);
            setDesignMessages([]);
            setVideoMessages([]);
            setAudioMessages([]);
        }
    }, [listModels, user.projects]);

    // Extract uploaded files from user.projects (from requests - user attachments) and local state
    const uploadedFiles = useMemo(() => {
        // If shared files provided, use them
        if (sharedFiles?.uploadedFiles) {
            return sharedFiles.uploadedFiles;
        }
        // Merge local uploaded files with files from user.projects
        const projectFiles = extractUploadedFilesFromProjects(user.projects || []);
        // Combine and deduplicate by URL
        const allFiles = [...localUploadedFiles, ...projectFiles];
        const seen = new Set<string>();
        return allFiles.filter(file => {
            if (seen.has(file.url)) return false;
            seen.add(file.url);
            return true;
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [user.projects, sharedFiles?.uploadedFiles, localUploadedFiles]);

    // Extract generated files from user.projects (responses from server) and local state
    const generatedFiles = useMemo(() => {
        // If shared files provided, use them
        if (sharedFiles?.generatedFiles) {
            return sharedFiles.generatedFiles;
        }
        // Merge local generated files with files from user.projects
        const projectFiles = extractGeneratedFilesFromProjects(user.projects || []);
        // Combine and deduplicate by URL
        const allFiles = [...localGeneratedFiles, ...projectFiles];
        const seen = new Set<string>();
        return allFiles.filter(file => {
            if (seen.has(file.url)) return false;
            seen.add(file.url);
            return true;
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [user.projects, sharedFiles?.generatedFiles, localGeneratedFiles]);

    const addUploadedFile = useCallback((file: StoredFile) => {
        if (sharedFiles?.onAddUploadedFile) {
            sharedFiles.onAddUploadedFile(file);
        }
        // Add to local state for immediate UI update
        setLocalUploadedFiles((prev) => {
            // Avoid duplicates by URL
            if (prev.some(f => f.url === file.url)) return prev;
            return [file, ...prev];
        });
    }, [sharedFiles]);

    // addGeneratedFile adds files to local state for immediate display
    const addGeneratedFile = useCallback((file: StoredFile) => {
        if (sharedFiles?.onAddGeneratedFile) {
            sharedFiles.onAddGeneratedFile(file);
        }
        // Add to local state for immediate UI update
        setLocalGeneratedFiles((prev) => {
            // Avoid duplicates by URL
            if (prev.some(f => f.url === file.url)) return prev;
            return [file, ...prev];
        });
    }, [sharedFiles]);

    // Wrapper for setSelectedModel that updates video mode when selecting a video model
    const handleSetSelectedModel = useCallback((model: AiModel) => {
        setSelectedModel(model);
        // Update video mode when selecting a video model
        if (model?.type === 'video') {
            const modelConfig = VIDEO_MODEL_CONFIG[model.key];
            if (modelConfig?.modes?.length > 0) {
                setVideoSettings((prev) => ({...prev, mode: modelConfig.modes[0].value}));
            }
        }
    }, []);

    // Helper to add message and persist to user.projects
    const addMessageAndPersist = useCallback((tab: TabType, message: ChatMessage) => {
        // Update local state
        switch (tab) {
            case 'image':
                setDesignMessages((prev) => {
                    const newMessages = [...prev, message];
                    if (activeChatId) {
                        updateProjectMessages(activeChatId, newMessages);
                    }
                    return newMessages;
                });
                break;
            case 'video':
                setVideoMessages((prev) => {
                    const newMessages = [...prev, message];
                    if (activeChatId) {
                        updateProjectMessages(activeChatId, newMessages);
                    }
                    return newMessages;
                });
                break;
            case 'audio':
                setAudioMessages((prev) => {
                    const newMessages = [...prev, message];
                    if (activeChatId) {
                        updateProjectMessages(activeChatId, newMessages);
                    }
                    return newMessages;
                });
                break;
            default:
                setTextMessages((prev) => {
                    const newMessages = [...prev, message];
                    if (activeChatId) {
                        updateProjectMessages(activeChatId, newMessages);
                    }
                    return newMessages;
                });
        }
    }, [activeChatId, updateProjectMessages]);

    const sendMessage = useCallback(() => {
        if (!prompt.trim() && attachments.length === 0) return;

        let currentChatId = activeChatId;
        let isTempProject = false;

        // Create temporary project if no active chat
        if (currentChatId === null) {
            isTempProject = true;
            const tempProject = createTempChatSession(
                truncateToWords(prompt.trim(), 40),
                selectedModel.key,
                'text'
            );
            currentChatId = tempProject.id;

            // Add to local state and user.projects
            setChats((prev) => [...prev, tempProject]);
            setActiveChatId(tempProject.id);
            addProject(tempProject);
        }

        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: prompt,
            attachments: attachments.length > 0 ? [...attachments] : undefined,
            timestamp: new Date(),
        };

        // Add user message immediately
        setTextMessages((prev) => {
            const newMessages = [...prev, userMsg];
            updateProjectMessages(currentChatId!, newMessages);
            return newMessages;
        });

        const currentPrompt = prompt;
        const tempChatId = currentChatId;

        messageService.send(
            dispatch,
            {
                sendEvent: CONFIG.EVENTS.AI.SEND.name,
                request: {
                    key: `req-${Date.now()}-${user.id}`,
                    id: user.id,
                    type: CONFIG.TYPES.MAIN.REQUEST.name,
                    request: {
                        method: CONFIG.TYPES.MAIN.REQUEST.METHODS.AI.name,
                        idUserProject: isTempProject ? null : tempChatId,
                        aiParams: {
                            model: selectedModel.key,
                            prompt: currentPrompt.trim()
                        }
                    },
                    user: {id: user.id}
                },
                useTimeout: false,
                callback: (response: Response) => {
                    if (response.error) {
                        toast.warning(response.error.message, {position: 'top-right'});
                    } else {
                        const realProjectId = response.request.idProject;

                        // Replace temp project ID with real one
                        if (isTempProject && tempChatId < 0) {
                            setActiveChatId(realProjectId);
                            setChats((prev) => prev.map((c) =>
                                c.id === tempChatId ? {...c, id: realProjectId} : c
                            ));
                            setFolders((prev) => prev.map((f) => ({
                                ...f,
                                projects: f.projects.map((c) =>
                                    c.id === tempChatId ? {...c, id: realProjectId} : c
                                ),
                            })));
                            replaceProjectId(tempChatId, realProjectId);
                        }

                        const aiMsg: ChatMessage = {
                            id: `msg-${response.request.id}`,
                            role: "assistant",
                            content: response.request.context.answer,
                            modelId: response.request.context.model,
                            timestamp: new Date(response.request.date),
                        };

                        // Use functional update to get current messages and add AI response
                        setTextMessages((prevMessages) => {
                            const allMessages = [...prevMessages, aiMsg];
                            const projectIdToUpdate = isTempProject ? realProjectId : tempChatId;
                            updateProjectMessages(projectIdToUpdate, allMessages);
                            return allMessages;
                        });
                    }

                    setIsTextLoading(false);
                }
            } as MessageContext
        );

        // Auto-rename on first message (only for existing projects)
        if (!isTempProject && tempChatId && messages.length === 0 && prompt.trim()) {
            setChats((prev) => prev.map((c) =>
                c.id === tempChatId && !c.isManuallyRenamed
                    ? {...c, name: truncateToWords(prompt.trim(), 40)}
                    : c
            ));
            setFolders((prev) => prev.map((f) => ({
                ...f,
                projects: f.projects.map((c) =>
                    c.id === tempChatId && !c.isManuallyRenamed
                        ? {...c, name: truncateToWords(prompt.trim(), 40)}
                        : c
                ),
            })));
        }

        setPrompt("");
        setAttachments([]);
        setIsTextLoading(true);
    }, [prompt, attachments, selectedModel, activeChatId, messages.length, dispatch, user.id, updateProjectMessages, addProject, replaceProjectId]);

    // Design: generate images
    const generateImages = useCallback((promptText?: string, regenerateAttachments?: AttachedFile[]) => {
        const text = promptText || prompt;
        const attachmentsToUse = regenerateAttachments || attachments;
        if (!text.trim()) return;

        let currentChatId = activeChatId;
        let isTempProject = false;

        // Create temporary project if no active chat
        if (currentChatId === null) {
            isTempProject = true;
            const tempProject = createTempChatSession(
                truncateToWords(text.trim(), 40),
                selectedModel.key,
                'image'
            );
            currentChatId = tempProject.id;

            // Add to local state and user.projects
            setChats((prev) => [...prev, tempProject]);
            setActiveChatId(tempProject.id);
            addProject(tempProject);
        }

        // Auto-rename on first generation (only for existing projects)
        if (!isTempProject && currentChatId && designMessages.length === 0 && text.trim()) {
            setChats((prev) => prev.map((c) =>
                c.id === currentChatId && !c.isManuallyRenamed
                    ? {...c, name: truncateToWords(text.trim(), 40)}
                    : c
            ));
            setFolders((prev) => prev.map((f) => ({
                ...f,
                projects: f.projects.map((c) =>
                    c.id === currentChatId && !c.isManuallyRenamed
                        ? {...c, name: truncateToWords(text.trim(), 40)}
                        : c
                ),
            })));
        }

        let params = {
            model: selectedModel.key,
            prompt: text,
            ratio: designSettings.aspectRatio,
            quality: designSettings.quality,
            images: attachmentsToUse.map(a => {
                return {url: a.buffer ? null : a.url, buffer: a.buffer, name: generateRandomName(a.name)}
            })
        } as AiRequestParams;

        if (selectedModel.key.toLowerCase() == 'midjourney') {
            // Build template from styleRef
            let template: { url?: string; buffer?: string; name: string } | null = null;
            if (designSettings.styleRefs.length > 0) {
                const styleRef = designSettings.styleRefs[0];
                const isHttpUrl = styleRef.url && (styleRef.url.startsWith('http://') || styleRef.url.startsWith('https://'));

                template = {
                    name: generateRandomName(styleRef.name)
                };

                // If has base64 and not an http url - use buffer
                if (styleRef.base64 && !isHttpUrl) {
                    template.buffer = styleRef.base64;
                }
                // If has http/https url - use url
                else if (isHttpUrl) {
                    template.url = styleRef.url;
                }
                // Fallback to base64 if available
                else if (styleRef.base64) {
                    template.buffer = styleRef.base64;
                }
            }

            params = {
                ...params,
                turbo: designSettings.turboMode,
                negativePrompt: designSettings.negativePrompt,
                chaos: designSettings.chaos,
                weird: designSettings.weird,
                stylize: designSettings.stylize,
                template
            };
        }

        // Add user message to chat with prompt and params
        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: text,
            attachments: attachmentsToUse.length > 0 ? [...attachmentsToUse] : undefined,
            timestamp: new Date(),
            modelId: selectedModel.key,
            designSettings: {...designSettings},
        };

        // Add user message to state
        setDesignMessages((prev) => {
            const newMessages = [...prev, userMsg];
            if (currentChatId) {
                updateProjectMessages(currentChatId, newMessages);
            }
            return newMessages;
        });

        const tempChatId = currentChatId;

        messageService.send(
            dispatch,
            {
                sendEvent: CONFIG.EVENTS.AI.SEND.name,
                request: {
                    key: `req-${Date.now()}-${user.id}`,
                    id: user.id,
                    type: CONFIG.TYPES.MAIN.REQUEST.name,
                    request: {
                        method: CONFIG.TYPES.MAIN.REQUEST.METHODS.AI.name,
                        idUserProject: isTempProject ? null : tempChatId,
                        aiParams: params
                    },
                    user: {id: user.id}
                },
                useTimeout: false,
                callback: (response: Response) => {
                    if (response.error) {
                        toast.warning(response.error.message, {position: 'top-right'});
                    } else {
                        const realProjectId = response.request.idProject;

                        // Replace temp project ID with real one
                        if (isTempProject && tempChatId < 0) {
                            setActiveChatId(realProjectId);
                            setChats((prev) => prev.map((c) =>
                                c.id === tempChatId ? {...c, id: realProjectId} : c
                            ));
                            setFolders((prev) => prev.map((f) => ({
                                ...f,
                                projects: f.projects.map((c) =>
                                    c.id === tempChatId ? {...c, id: realProjectId} : c
                                ),
                            })));
                            replaceProjectId(tempChatId, realProjectId);
                        }

                        const urls = response.request.context.images;

                        // Add assistant message with generated images
                        const assistantMsg: ChatMessage = {
                            id: `msg-${response.request.id}`,
                            role: "assistant",
                            content: text,
                            modelId: response.request.context.model,
                            attachments: urls.map((url) => ({
                                url,
                                isImage: true,
                            })),
                            timestamp: new Date(response.request.date),
                        };

                        // Use functional update to get current messages and add AI response
                        setDesignMessages((prevMessages) => {
                            const allMessages = [...prevMessages, assistantMsg];
                            const projectIdToUpdate = isTempProject ? realProjectId : tempChatId;
                            updateProjectMessages(projectIdToUpdate, allMessages);
                            return allMessages;
                        });

                        // Save generated images to generatedFiles (filter duplicates by URL)
                        const uniqueUrls = [...new Set(urls)] as string[];
                        uniqueUrls.forEach((url: string) => {
                            const generatedFile: StoredFile = {
                                id: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                type: "image",
                                url,
                                prompt: text,
                                createdAt: new Date(),
                            };
                            addGeneratedFile(generatedFile);
                        });
                    }

                    setIsImageLoading(false);
                }
            } as MessageContext
        );

        if (!promptText) setPrompt("");
        setAttachments([]);
        setIsImageLoading(true);
    }, [prompt, selectedModel, designSettings, attachments, activeChatId, designMessages.length, dispatch, user.id, addGeneratedFile, updateProjectMessages, addProject, replaceProjectId]);

    // Delete design message
    const deleteDesignMessage = useCallback((msgId: string) => {
        setDesignMessages((prev) => prev.filter((m) => m.id !== msgId));
    }, []);

    // Video: generate video
    const generateVideo = useCallback((promptText?: string) => {
        const text = promptText || prompt;
        if (!text.trim()) return;

        let currentChatId = activeChatId;
        let isTempProject = false;

        // Create temporary project if no active chat
        if (currentChatId === null) {
            isTempProject = true;
            const tempProject = createTempChatSession(
                truncateToWords(text.trim(), 40),
                selectedModel.key,
                'video'
            );
            currentChatId = tempProject.id;

            // Add to local state and user.projects
            setChats((prev) => [...prev, tempProject]);
            setActiveChatId(tempProject.id);
            addProject(tempProject);
        }

        // Auto-rename on first generation (only for existing projects)
        if (!isTempProject && currentChatId && videoMessages.length === 0 && text.trim()) {
            setChats((prev) => prev.map((c) =>
                c.id === currentChatId && !c.isManuallyRenamed
                    ? {...c, name: truncateToWords(text.trim(), 40)}
                    : c
            ));
            setFolders((prev) => prev.map((f) => ({
                ...f,
                projects: f.projects.map((c) =>
                    c.id === currentChatId && !c.isManuallyRenamed
                        ? {...c, name: truncateToWords(text.trim(), 40)}
                        : c
                ),
            })));
        }

        // Add user message to chat
        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: text,
            attachments: attachments.length > 0 ? [...attachments] : undefined,
            timestamp: new Date(),
            modelId: selectedModel.key,
            videoSettings: {...videoSettings},
        };

        // Add user message to state
        setVideoMessages((prev) => {
            const newMessages = [...prev, userMsg];
            if (currentChatId) {
                updateProjectMessages(currentChatId, newMessages);
            }
            return newMessages;
        });

        const tempChatId = currentChatId;

        messageService.send(
            dispatch,
            {
                sendEvent: CONFIG.EVENTS.AI.SEND.name,
                request: {
                    key: `req-${Date.now()}-${user.id}`,
                    id: user.id,
                    type: CONFIG.TYPES.MAIN.REQUEST.name,
                    request: {
                        method: CONFIG.TYPES.MAIN.REQUEST.METHODS.AI.name,
                        idUserProject: isTempProject ? null : tempChatId,
                        aiParams: {
                            model: selectedModel.key,
                            prompt: text,
                            duration: videoSettings.duration,
                            mode: videoSettings.mode,
                            ratio: videoSettings.aspectRatio,
                            quality: videoSettings.resolution,
                            negativePrompt: videoSettings.negativePrompt,
                            preset: videoSettings.preset,
                            videos: attachments
                                .filter(a => a.isVideo)
                                .map(a => ({
                                    url: a.buffer ? null : a.url,
                                    buffer: a.buffer,
                                    name: generateRandomName(a.name)
                                })),
                            audios: attachments
                                .filter(a => a.isAudio)
                                .map(a => ({
                                    url: a.buffer ? null : a.url,
                                    buffer: a.buffer,
                                    name: generateRandomName(a.name)
                                })),
                            images: [
                                // Regular image attachments
                                ...attachments.filter(a => a.isImage || !a.isVideo).map(a => ({
                                    url: a.buffer ? null : a.url,
                                    buffer: a.buffer,
                                    name: generateRandomName(a.name)
                                })),
                                // Keyframe images for keyframes mode
                                ...(videoSettings.mode === 'keyframes' ? [
                                    videoSettings.keyframeImage1 ? {
                                        url: videoSettings.keyframeImage1.base64 ? null : videoSettings.keyframeImage1.url,
                                        buffer: videoSettings.keyframeImage1.base64,
                                        name: videoSettings.keyframeImage1.name || 'keyframe1'
                                    } : null,
                                    videoSettings.keyframeImage2 ? {
                                        url: videoSettings.keyframeImage2.base64 ? null : videoSettings.keyframeImage2.url,
                                        buffer: videoSettings.keyframeImage2.base64,
                                        name: videoSettings.keyframeImage2.name || 'keyframe2'
                                    } : null
                                ].filter(Boolean) : [])
                            ]
                        }
                    },
                    user: {id: user.id}
                },
                useTimeout: false,
                callback: (response: Response) => {
                    if (response.error) {
                        toast.warning(response.error.message, {position: 'top-right'});
                    } else {
                        const realProjectId = response.request.idProject;

                        // Replace temp project ID with real one
                        if (isTempProject && tempChatId < 0) {
                            setActiveChatId(realProjectId);
                            setChats((prev) => prev.map((c) =>
                                c.id === tempChatId ? {...c, id: realProjectId} : c
                            ));
                            setFolders((prev) => prev.map((f) => ({
                                ...f,
                                projects: f.projects.map((c) =>
                                    c.id === tempChatId ? {...c, id: realProjectId} : c
                                ),
                            })));
                            replaceProjectId(tempChatId, realProjectId);
                        }

                        const urls = response.request.context.videos;

                        // Add assistant message with generated videos
                        const assistantMsg: ChatMessage = {
                            id: `msg-${response.request.id}`,
                            role: "assistant",
                            content: text,
                            modelId: response.request.context.model,
                            attachments: urls.map((url) => ({
                                url,
                                isVideo: true,
                            })),
                            timestamp: new Date(response.request.date),
                        };

                        // Use functional update to get current messages and add AI response
                        setVideoMessages((prevMessages) => {
                            const allMessages = [...prevMessages, assistantMsg];
                            const projectIdToUpdate = isTempProject ? realProjectId : tempChatId;
                            updateProjectMessages(projectIdToUpdate, allMessages);
                            return allMessages;
                        });

                        // Save generated videos to generatedFiles (filter duplicates by URL)
                        const uniqueUrls = [...new Set(urls)] as string[];
                        uniqueUrls.forEach((url: string) => {
                            const generatedFile: StoredFile = {
                                id: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                type: "video",
                                url,
                                prompt: text,
                                createdAt: new Date(),
                            };
                            addGeneratedFile(generatedFile);
                        });
                    }

                    setIsVideoLoading(false);
                }
            } as MessageContext
        );

        if (!promptText) setPrompt("");
        setAttachments([]);
        // Clear keyframe images after sending
        if (videoSettings.mode === 'keyframes') {
            setVideoSettings((prev) => ({...prev, keyframeImage1: null, keyframeImage2: null}));
        }
        setIsVideoLoading(true);
    }, [prompt, selectedModel, videoSettings, attachments, activeChatId, videoMessages.length, dispatch, user.id, addGeneratedFile, updateProjectMessages, addProject, replaceProjectId]);

    // Delete video message
    const deleteVideoMessage = useCallback((msgId: string) => {
        setVideoMessages((prev) => prev.filter((m) => m.id !== msgId));
    }, []);

    // Audio state
    const [audioSettings, setAudioSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);

    const generateAudio = useCallback((promptText?: string, regenerateAttachments?: AttachedFile[]) => {
        const text = promptText || prompt;
        const attachmentsToUse = regenerateAttachments || attachments;
        if (!text.trim()) return;

        let currentChatId = activeChatId;
        let isTempProject = false;

        // Create temporary project if no active chat
        if (currentChatId === null) {
            isTempProject = true;
            const tempProject = createTempChatSession(
                truncateToWords(text.trim(), 40),
                selectedModel.key,
                'audio'
            );
            currentChatId = tempProject.id;

            // Add to local state and user.projects
            setChats((prev) => [...prev, tempProject]);
            setActiveChatId(tempProject.id);
            addProject(tempProject);
        }

        // Auto-rename on first generation (only for existing projects)
        if (!isTempProject && currentChatId && audioMessages.length === 0 && text.trim()) {
            setChats((prev) => prev.map((c) =>
                c.id === currentChatId && !c.isManuallyRenamed
                    ? {...c, name: truncateToWords(text.trim(), 40)}
                    : c
            ));
            setFolders((prev) => prev.map((f) => ({
                ...f,
                projects: f.projects.map((c) =>
                    c.id === currentChatId && !c.isManuallyRenamed
                        ? {...c, name: truncateToWords(text.trim(), 40)}
                        : c
                ),
            })));
        }

        // Add user message to chat
        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: text,
            attachments: attachmentsToUse.length > 0 ? [...attachmentsToUse] : undefined,
            timestamp: new Date(),
            modelId: selectedModel.key,
            audioSettings: {...audioSettings},
        };

        // Add user message to state
        setAudioMessages((prev) => {
            const newMessages = [...prev, userMsg];
            updateProjectMessages(currentChatId!, newMessages);
            return newMessages;
        });

        const tempChatId = currentChatId;

        messageService.send(
            dispatch,
            {
                sendEvent: CONFIG.EVENTS.AI.SEND.name,
                request: {
                    key: `req-${Date.now()}-${user.id}`,
                    id: user.id,
                    type: CONFIG.TYPES.MAIN.REQUEST.name,
                    request: {
                        method: CONFIG.TYPES.MAIN.REQUEST.METHODS.AI.name,
                        idUserProject: isTempProject ? null : tempChatId,
                        aiParams: {
                            model: selectedModel.key,
                            prompt: text,
                            duration: audioSettings.duration,
                            genre: audioSettings.genre,
                            instrumental: audioSettings.instrumental,
                            tempo: audioSettings.tempo,
                            mood: audioSettings.mood,
                            audios: attachments
                                .filter(a => a.isAudio)
                                .map(a => ({
                                    url: a.buffer ? null : a.url,
                                    buffer: a.buffer,
                                    name: generateRandomName(a.name)
                                })),
                        }
                    },
                    user: {id: user.id}
                },
                useTimeout: false,
                callback: (response: Response) => {
                    if (response.error) {
                        toast.warning(response.error.message, {position: 'top-right'});
                    } else {
                        const realProjectId = response.request.idProject;

                        // Replace temp project ID with real one
                        if (isTempProject && tempChatId < 0) {
                            setActiveChatId(realProjectId);
                            setChats((prev) => prev.map((c) =>
                                c.id === tempChatId ? {...c, id: realProjectId} : c
                            ));
                            setFolders((prev) => prev.map((f) => ({
                                ...f,
                                projects: f.projects.map((c) =>
                                    c.id === tempChatId ? {...c, id: realProjectId} : c
                                ),
                            })));
                            replaceProjectId(tempChatId, realProjectId);
                        }

                        const urls = response.request.context.audios;

                        // Add assistant message with generated audio
                        const assistantMsg: ChatMessage = {
                            id: `msg-${response.request.id}`,
                            role: "assistant",
                            content: text,
                            modelId: response.request.context.model,
                            attachments: urls.map((url) => ({
                                url,
                                isAudio: true,
                            })),
                            timestamp: new Date(response.request.date),
                        };

                        // Use functional update to get current messages and add AI response
                        setAudioMessages((prevMessages) => {
                            const allMessages = [...prevMessages, assistantMsg];
                            const projectIdToUpdate = isTempProject ? realProjectId : tempChatId;
                            updateProjectMessages(projectIdToUpdate, allMessages);
                            return allMessages;
                        });

                        // Save generated audio to generatedFiles (filter duplicates by URL)
                        const uniqueUrls = [...new Set(urls)] as string[];
                        uniqueUrls.forEach((url: string) => {
                            const generatedFile: StoredFile = {
                                id: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                type: "audio",
                                url,
                                prompt: text,
                                createdAt: new Date(),
                            };
                            addGeneratedFile(generatedFile);
                        });
                    }

                    setIsAudioLoading(false);
                }
            } as MessageContext
        );

        if (!promptText) setPrompt("");
        setAttachments([]);
        setIsAudioLoading(true);
    }, [prompt, attachments, selectedModel, audioSettings, activeChatId, audioMessages.length, dispatch, user.id, updateProjectMessages, addGeneratedFile, addProject, replaceProjectId]);

    // Delete audio message
    const deleteAudioMessage = useCallback((msgId: string) => {
        setAudioMessages((prev) => prev.filter((m) => m.id !== msgId));
    }, []);

    const MAX_ATTACHMENTS = 4;

    const addAttachment = useCallback(async (file: File): Promise<{ added: boolean; currentCount: number; max: number }> => {
        const result = {added: false, currentCount: 0, max: MAX_ATTACHMENTS};

        if (attachments.length >= MAX_ATTACHMENTS) {
            result.currentCount = attachments.length;
            return result;
        }

        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        const url = URL.createObjectURL(file);
        const name = file.name;

        let buffer: string | undefined;
        try {
            const fullBase64 = await fileToBase64(file);
            buffer = fullBase64.split(',')[1];
        } catch (e) {
            console.error('Failed to convert file to base64:', e);
        }

        result.added = true;
        result.currentCount = attachments.length + 1;

        setAttachments((prev) => [...prev, {
            name,
            type: file.type,
            url,
            isImage,
            isVideo,
            buffer
        }]);

        return result;
    }, [attachments.length, setAttachments]);

    const removeAttachment = useCallback((index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    }, [setAttachments]);

    const addStoredAttachment = useCallback((files: StoredFile[]): { added: boolean; currentCount: number; max: number } => {
        const result = {added: false, currentCount: 0, max: MAX_ATTACHMENTS};

        const remaining = MAX_ATTACHMENTS - attachments.length;
        if (remaining <= 0) {
            result.currentCount = attachments.length;
            return result;
        }

        const toAdd = files.slice(0, remaining);
        const newAttachments: AttachedFile[] = toAdd.map(file => ({
            name: file.name || file.prompt || `file-${file.id}`,
            type: file.type === "image" ? "image/*" : file.type === "video" ? "video/*" : file.type === "audio" ? "audio/*" : "application/octet-stream",
            url: file.url,
            isImage: file.type === "image",
            isVideo: file.type === "video",
            isAudio: file.type === "audio",
            buffer: file.buffer,
        }));

        result.added = true;
        result.currentCount = attachments.length + newAttachments.length;

        setAttachments((prev) => [...prev, ...newAttachments]);
        return result;
    }, [attachments.length, setAttachments]);

    const addFolder = useCallback((name: string, color: string, type: string) => {
        setFolders((prev) => [...prev, {id: Math.random() * 10000, name, color, type, projects: []}]);
    }, []);

    const renameFolder = useCallback((id: number, name: string) => {
        setFolders((prev) => prev.map((f) => f.id === id ? {...f, name} : f));
    }, []);

    const changeFolderColor = useCallback((id: number, color: string) => {
        messageService.send(
            dispatch,
            {
                sendEvent: CONFIG.EVENTS.MAIN.SEND.name,
                request: {
                    key: `cfc-${Date.now()}-${user.id}`,
                    id: user.id,
                    type: CONFIG.TYPES.MAIN.FOLDER.name,
                    folder: {
                        method: CONFIG.TYPES.MAIN.FOLDER.METHODS.COLOR.name,
                        color: color,
                        id: id
                    },
                    user: {id: user.id}
                },
                useTimeout: false,
                callback: (response: Response) => {
                    if (response.error) {
                        toast.warning(response.error.message, {position: 'top-right'});
                    } else {
                        setFolders((prev) => prev.map((f) => f.id === response.folder.id ? {...f, color: response.folder.color} : f));
                    }
                }
            } as MessageContext);
    }, []);

    const deleteFolder = useCallback((id: number) => {
        messageService.send(
            dispatch,
            {
                sendEvent: CONFIG.EVENTS.MAIN.SEND.name,
                request: {
                    key: `df-${Date.now()}-${user.id}`,
                    id: user.id,
                    type: CONFIG.TYPES.MAIN.FOLDER.name,
                    folder: {
                        method: CONFIG.TYPES.MAIN.FOLDER.METHODS.DELETE.name,
                        id: id
                    },
                    user: {id: user.id}
                },
                useTimeout: false,
                callback: (response: Response) => {
                    if (response.error) {
                        toast.warning(response.error.message, {position: 'top-right'});
                    } else {
                        setFolders((prev) => prev.filter((f) => f.id !== id));
                    }
                }
            } as MessageContext);
    }, []);

    const renameChat = useCallback((id: number, title: string) => {
        messageService.send(
            dispatch,
            {
                sendEvent: CONFIG.EVENTS.MAIN.SEND.name,
                request: {
                    key: `rc-${Date.now()}-${user.id}`,
                    id: user.id,
                    type: CONFIG.TYPES.MAIN.PROJECT.name,
                    project: {
                        method: CONFIG.TYPES.MAIN.PROJECT.METHODS.RENAME.name,
                        id: id,
                        name: title
                    },
                    user: {id: user.id}
                },
                useTimeout: false,
                callback: (response: Response) => {
                    if (response.error) {
                        toast.warning(response.error.message, {position: 'top-right'});
                    } else {
                        // Try to rename in root
                        setChats((prev) => {
                            const found = prev.find((c) => c.id === id);
                            if (found) {
                                return prev.map((c) => c.id === id ? {...c, name: title, isManuallyRenamed: true} : c);
                            }
                            return prev;
                        });
                        // Try to rename in folders
                        setFolders((prev) => prev.map((f) => ({
                            ...f,
                            projects: f.projects.map((c) => c.id === id ? {...c, name: title, isManuallyRenamed: true} : c),
                        })));
                    }
                }
            } as MessageContext);
    }, []);

    const moveChat = useCallback((chatId: number, targetFolderId: number | null) => {
        // Move chat between root and folders
        let chatToMove: ChatSession | null = null;

        // Find chat in root
        setChats((prev) => {
            const found = prev.find((c) => c.id === chatId);
            if (found) {
                chatToMove = found;
                return prev.filter((c) => c.id !== chatId);
            }
            return prev;
        });

        // Find chat in folders
        setFolders((prev) => {
            for (const folder of prev) {
                const found = folder.projects.find((c) => c.id === chatId);
                if (found) {
                    chatToMove = found;
                    break;
                }
            }
            return prev.map((f) => ({
                ...f,
                projects: f.projects.filter((c) => c.id !== chatId),
            }));
        });

        // Place chat in target location
        if (chatToMove) {
            messageService.send(
                dispatch,
                {
                    sendEvent: CONFIG.EVENTS.MAIN.SEND.name,
                    request: {
                        key: `mc-${Date.now()}-${user.id}`,
                        id: user.id,
                        type: CONFIG.TYPES.MAIN.PROJECT.name,
                        project: {
                            method: CONFIG.TYPES.MAIN.PROJECT.METHODS.MOVE.name,
                            id: chatToMove.id,
                            idUserFolder: targetFolderId
                        },
                        user: {id: user.id}
                    },
                    useTimeout: false,
                    callback: (response: Response) => {
                        if (response.error) {
                            toast.warning(response.error.message, {position: 'top-right'});
                        } else {
                            if (targetFolderId === null) {
                                setChats((prev) => [...prev, chatToMove!]);
                            } else {
                                setFolders((prev) => prev.map((f) =>
                                    f.id === targetFolderId
                                        ? {...f, projects: [...f.projects, chatToMove!]}
                                        : f
                                ));
                            }
                        }
                    }
                } as MessageContext);
        }
    }, []);

    const pinChat = useCallback((id: number) => {
        // Try to find and pin chat in root
        setChats((prev) => {
            const found = prev.find((c) => c.id === id);
            if (found) {
                return prev.map((c) => c.id === id ? {...c, pinned: !c.pinned} : c);
            }
            return prev;
        });
        // Try to find and pin chat in folders
        setFolders((prev) => prev.map((f) => ({
            ...f,
            projects: f.projects.map((c) => c.id === id ? {...c, pinned: !c.pinned} : c),
        })));
    }, []);

    const duplicateChat = useCallback((id: number) => {
        let original: ChatSession | null = null;

        // Find in root
        setChats((prev) => {
            const found = prev.find((c) => c.id === id);
            if (found) {
                original = found;
            }
            return prev;
        });

        // Find in folders
        if (!original) {
            setFolders((prev) => {
                for (const folder of prev) {
                    const found = folder.projects.find((c) => c.id === id);
                    if (found) {
                        original = found;
                        break;
                    }
                }
                return prev;
            });
        }

        if (original) {
            messageService.send(
                dispatch,
                {
                    sendEvent: CONFIG.EVENTS.MAIN.SEND.name,
                    request: {
                        key: `dc-${Date.now()}-${user.id}`,
                        id: user.id,
                        type: CONFIG.TYPES.MAIN.PROJECT.name,
                        project: {
                            method: CONFIG.TYPES.MAIN.PROJECT.METHODS.DUPLICATE.name,
                            id: id
                        },
                        user: {id: user.id}
                    },
                    useTimeout: false,
                    callback: (response: Response) => {
                        if (response.error) {
                            toast.warning(response.error.message, {position: 'top-right'});
                        } else {
                            const copy: ChatSession = {
                                ...original,
                                id: response.project.id,
                                name: response.project.name,
                                pinned: false,
                            };

                            if (response.project.folder?.id) {
                                setFolders((prev) => prev.map((f) =>
                                    f.id === response.project.folder.id
                                        ? {...f, projects: [...f.projects, copy!]}
                                        : f
                                ));
                            } else {
                                setChats((prev) => [...prev, copy]);
                            }
                        }
                    }
                } as MessageContext);
        }
    }, []);

    const deleteChat = useCallback((id: number) => {
        messageService.send(
            dispatch,
            {
                sendEvent: CONFIG.EVENTS.MAIN.SEND.name,
                request: {
                    key: `dc-${Date.now()}-${user.id}`,
                    id: user.id,
                    type: CONFIG.TYPES.MAIN.PROJECT.name,
                    project: {
                        method: CONFIG.TYPES.MAIN.PROJECT.METHODS.DELETE.name,
                        id: id
                    },
                    user: {id: user.id}
                },
                useTimeout: false,
                callback: (response: Response) => {
                    if (response.error) {
                        toast.warning(response.error.message, {position: 'top-right'});
                    } else {
                        // Delete from root
                        setChats((prev) => prev.filter((c) => c.id !== id));
                        // Delete from folders
                        setFolders((prev) => prev.map((f) => ({
                            ...f,
                            projects: f.projects.filter((c) => c.id !== id),
                        })));
                        if (activeChatId === id) {
                            setActiveChatId(null);
                            setTextMessages([]);
                            setDesignMessages([]);
                            setVideoMessages([]);
                            setAudioMessages([]);
                        }
                    }
                }
            } as MessageContext);
    }, [activeChatId]);

    const newChat = useCallback(() => {
        messageService.send(
            dispatch,
            {
                sendEvent: CONFIG.EVENTS.MAIN.SEND.name,
                request: {
                    key: `proj-${Date.now()}-${user.id}`,
                    id: user.id,
                    type: CONFIG.TYPES.MAIN.PROJECT.name,
                    project: {
                        method: CONFIG.TYPES.MAIN.PROJECT.METHODS.CREATE.name,
                        name: 'Новый чат',
                        type: selectedModel.type
                    },
                    user: {id: user.id}
                },
                useTimeout: true,
                callback: (response: Response) => {
                    if (response.error) {
                        toast.warning(response.error.message, {position: 'top-right'});
                    } else {
                        setChats((prev) => [...prev, response.project]);
                        setActiveChatId(response.project.id);
                        setTextMessages([]);
                        setDesignMessages([]);
                        setVideoMessages([]);
                        setAudioMessages([]);
                        setAttachments([]);
                    }
                }
            } as MessageContext
        );
    }, [selectedModel]);

    // Edit message - set prompt and attachments for editing
    const editMessage = useCallback((content: string, editAttachments?: AttachedFile[], editDesignSettings?: DesignSettings, editModelId?: string, editVideoSettings?: VideoSettings, editAudioSettings?: AudioSettings) => {
        setPrompt(content);
        setAttachments(editAttachments || []);
        if (editDesignSettings) {
            setDesignSettings(editDesignSettings);
        }
        if (editVideoSettings) {
            setVideoSettings(editVideoSettings);
        }
        if (editAudioSettings) {
            setAudioSettings(editAudioSettings);
        }
        if (editModelId) {
            const model = listModels.find((m) => m.key.toLowerCase() === editModelId.toLowerCase());
            if (model) {
                setSelectedModel(model);
            }
        }
    }, [activeTab, listModels]);

    // Clear all messages (used when moving chat to other panel)
    const clearMessages = useCallback(() => {
        setTextMessages([]);
        setDesignMessages([]);
        setVideoMessages([]);
        setAudioMessages([]);
    }, []);

    // Open a specific project by ID - switches tab and loads settings
    const openProject = useCallback((projectId: number, requestId?: number) => {
        // Set flag to prevent message loading conflict
        isOpeningProjectRef.current = true;

        // Find the project in user.projects
        const project = user.projects?.find(p => p.id === projectId);
        if (!project) {
            isOpeningProjectRef.current = false;
            return;
        }

        // Determine the tab type from project type
        const projectType = project.type as TabType || 'text';

        // Switch to the correct tab if needed
        if (activeTabRef.current !== projectType) {
            setActiveTab(projectType);
            const defaultModel = getDefaultModel(projectType, listModels);
            setSelectedModel(defaultModel);

            // Update video mode when switching to video tab
            if (projectType === 'video' && defaultModel) {
                const modelConfig = VIDEO_MODEL_CONFIG[defaultModel.key];
                if (modelConfig?.modes?.length > 0) {
                    setVideoSettings((prev) => ({...prev, mode: modelConfig.modes[0].value}));
                }
            }

            // Parse projects data for the new tab
            const {folders: newFolders, chatsWithoutFolder: newChats} = parseProjectsData(user.projects || [], user.folders || [], projectType);
            setFolders(newFolders);
            setChats(newChats);
        }

        // Set the active chat
        setActiveChatId(projectId);

        // Load messages and settings from the project
        const chatMessages = project.messages?.length > 0
            ? project.messages
            : (project.requests ? convertRequestsToMessages(project.requests) : []);

        // Update messages for the correct tab
        switch (projectType) {
            case 'image':
                setDesignMessages(chatMessages);
                break;
            case 'video':
                setVideoMessages(chatMessages);
                break;
            case 'audio':
                setAudioMessages(chatMessages);
                break;
            default:
                setTextMessages(chatMessages);
        }

        // If requestId is provided, find the specific request and load settings from it
        if (requestId) {
            const specificRequest = project.requests?.find(r => r.id === requestId);
            if (specificRequest) {
                try {
                    const request = JSON.parse(specificRequest.request);
                    // Load settings from the specific request
                    if (projectType === 'image' && request.params?.image) {
                        const imgParams = request.params.image;
                        setDesignSettings(prev => ({
                            ...prev,
                            aspectRatio: imgParams.ratio || prev.aspectRatio,
                        }));
                        if (imgParams.chaos !== undefined) {
                            setDesignSettings(prev => ({...prev, chaos: imgParams.chaos}));
                        }
                        if (imgParams.stylize !== undefined) {
                            setDesignSettings(prev => ({...prev, stylize: imgParams.stylize}));
                        }
                        if (imgParams.weird !== undefined) {
                            setDesignSettings(prev => ({...prev, weird: imgParams.weird}));
                        }
                    }
                    if (projectType === 'video' && request.params?.video) {
                        const vidParams = request.params.video;
                        setVideoSettings(prev => ({
                            ...prev,
                            mode: vidParams.mode || prev.mode,
                            aspectRatio: vidParams.aspectRatio || prev.aspectRatio,
                            preset: vidParams.preset || prev.preset,
                            duration: vidParams.duration || prev.duration,
                        }));
                    }
                    if (projectType === 'audio' && request.params?.audio) {
                        const audParams = request.params.audio;
                        setAudioSettings(prev => ({
                            ...prev,
                            genre: audParams.genre || prev.genre,
                            mood: audParams.mood || prev.mood,
                            tempo: audParams.tempo || prev.tempo,
                            instrumental: audParams.instrumental ?? prev.instrumental,
                        }));
                    }
                    // Set model from request if available
                    if (request.model) {
                        const model = listModels.find((m) => m.key.toLowerCase() === request.model.toLowerCase());
                        if (model) {
                            setSelectedModel(model);
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse specific request:', e);
                }
            }
        } else {
            // Load settings from the last user message (fallback)
            const lastUserMessage = [...chatMessages].reverse().find(m => m.role === 'user');
            if (lastUserMessage) {
                if (lastUserMessage.designSettings) {
                    setDesignSettings(lastUserMessage.designSettings);
                }
                if (lastUserMessage.videoSettings) {
                    setVideoSettings(lastUserMessage.videoSettings);
                }
                if (lastUserMessage.audioSettings) {
                    setAudioSettings(lastUserMessage.audioSettings);
                }
                // Set model from message if available
                if (lastUserMessage.modelId) {
                    const model = listModels.find((m) => m.key.toLowerCase() === lastUserMessage.modelId!.toLowerCase());
                    if (model) {
                        setSelectedModel(model);
                    }
                }
            }
        }
    }, [user.projects, user.folders, listModels]);

    return {
        activeTab, selectedModel, prompt, setPrompt, switchTab, switchTabWithExclude, setSelectedModel: handleSetSelectedModel,
        messages, sendMessage, isTextLoading,
        attachments, addAttachment, removeAttachment, addStoredAttachment,
        uploadedFiles, addUploadedFile,
        generatedFiles, addGeneratedFile,
        folders, chats, activeChatId, setActiveChatId, addFolder, newChat,
        renameFolder, changeFolderColor, deleteFolder,
        renameChat, moveChat, pinChat, duplicateChat, deleteChat,
        // Design
        designSettings, setDesignSettings, generateImages, isImageLoading, deleteDesignMessage,
        // Video
        videoSettings, setVideoSettings, generateVideo, isVideoLoading, deleteVideoMessage,
        // Audio
        audioSettings, setAudioSettings, generateAudio, isAudioLoading, deleteAudioMessage,
        // Edit
        editMessage,
        // Clear
        clearMessages,
        // Open project
        openProject,
    };
}
