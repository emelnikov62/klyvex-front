import {useCallback, useEffect, useRef, useState} from "react";
import {
    ChevronDown,
    ChevronRight,
    Copy,
    Film,
    FolderOpen,
    FolderPlus,
    MoreHorizontal,
    Music,
    Paintbrush,
    Palette,
    Pencil,
    Pin,
    Plus,
    Trash2,
    Type
} from "lucide-react";
import type {ChatFolder, ChatSession} from "@/hooks/use-panel-state";
import {useIsMobile} from "@/hooks/use-mobile";
import {TabType} from "@/lib/kernel/models/main/AiModel";
import {useDispatch} from "react-redux";
import messageService, {MessageContext} from "@/lib/service/MessageService.ts";
import {CONFIG} from "@/lib/enums/Config.ts";
import {Response} from "@/lib/kernel/models/responses/Response.tsx";
import {toast} from "sonner";
import {useAuth} from "@/contexts/AuthContext.tsx";


const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    text: Type,
    image: Paintbrush,
    video: Film,
    audio: Music,
};

interface WorkspaceSidebarProps {
    isOpen: boolean;
    onClose: () => void;
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
    title?: string;
    activeTab?: TabType;
}

const FOLDER_COLORS = [
    "#C8FF00", "#00B4D8", "#8B5CF6", "#EC4899",
    "#F59E0B", "#F97316", "#14B8A6", "#EF4444",
];

/* ── Context Menu ── */
interface MenuOption {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
    destructive?: boolean;
    submenu?: { label: string; action: () => void }[];
}

const ContextMenu = ({x, y, options, onClose}: { x: number; y: number; options: MenuOption[]; onClose: () => void }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="fixed z-[100] min-w-[180px] rounded-lg border border-border bg-card shadow-[0_4px_16px_rgba(0,0,0,0.4)] popup-enter"
            style={{top: y, left: x}}
        >
            <div className="py-1">
                {options.map((opt, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            opt.action();
                            onClose();
                        }}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-surface-hover ${opt.destructive ? "text-destructive" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <opt.icon className="h-3.5 w-3.5"/>
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

/* ── Delete Confirmation Dialog ── */
const DeleteDialog = ({
                          title, description, onCancel, buttons,
                      }: {
    title: string; description: string; onCancel: () => void;
    buttons: { label: string; action: () => void; destructive?: boolean }[];
}) => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <div className="w-80 rounded-2xl border border-border bg-card p-6 popup-enter">
            <h3 className="text-sm font-bold text-foreground mb-2">{title}</h3>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">{description}</p>
            <div className="flex flex-col gap-2">
                {buttons.map((btn, i) => (
                    <button
                        key={i}
                        onClick={btn.action}
                        className={`w-full h-9 rounded-xl text-xs font-semibold transition-all btn-press ${btn.destructive
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            : "border border-border text-foreground hover:bg-surface-hover"
                        }`}
                    >
                        {btn.label}
                    </button>
                ))}
                <button onClick={onCancel}
                        className="w-full h-9 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Отмена
                </button>
            </div>
        </div>
    </div>
);

/* ── Color Picker Popup ── */
const ColorPicker = ({currentColor, onSelect, onClose}: { currentColor: string; onSelect: (c: string) => void; onClose: () => void }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [onClose]);

    return (
        <div ref={ref} className="fixed z-[100] rounded-xl border border-border bg-card p-3 shadow-[0_4px_16px_rgba(0,0,0,0.4)] popup-enter">
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-2">Цвет папки</p>
            <div className="flex gap-2">
                {FOLDER_COLORS.map((c) => (
                    <button
                        key={c}
                        onClick={() => {
                            onSelect(c);
                            onClose();
                        }}
                        className={`h-6 w-6 rounded-full transition-all ${currentColor === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110" : "hover:scale-110"}`}
                        style={{backgroundColor: c}}
                    />
                ))}
            </div>
        </div>
    );
};

/* ── Chat Item ── */
const ChatItem = ({
                      chat, isActive, folders, onSelect, onRename, onMove, onPin, onDuplicate, onDelete,
                      onDragStart, onDragEnd, onDragOver, onDrop, isDragOver, activeTab,
                  }: {
    chat: ChatSession; isActive: boolean; folders: ChatFolder[];
    onSelect: () => void; onRename: (title: string) => void;
    onMove: (folderId: number | null) => void; onPin: () => void;
    onDuplicate: () => void; onDelete: () => void;
    onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void;
    onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void;
    isDragOver: boolean; activeTab?: TabType;
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(chat.name);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    const ChatIcon = TAB_ICONS[activeTab || "text"] || Type;

    useEffect(() => {
        if (isRenaming) inputRef.current?.focus();
    }, [isRenaming]);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
                btnRef.current && !btnRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
                setShowMoveSubmenu(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [menuOpen]);

    const toggleMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen((prev) => {
            if (prev) setShowMoveSubmenu(false);
            return !prev;
        });
    };

    const confirmRename = () => {
        const trimmed = renameValue.trim();
        if (trimmed && trimmed !== chat.name) onRename(trimmed);
        setIsRenaming(false);
    };

    const menuAction = (fn: () => void) => (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        setShowMoveSubmenu(false);
        fn();
    };

    return (
        <>
            <div
                draggable
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onContextMenu={toggleMenu}
                onClick={isRenaming ? undefined : onSelect}
                className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all relative cursor-pointer select-none ${isDragOver ? "border border-dashed border-primary bg-primary/5" : ""
                } ${isActive
                    ? "bg-primary/10 border border-primary/30 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                }`}
            >
                {isActive && <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary"/>}
                {chat.pinned && <Pin className="h-2.5 w-2.5 text-primary shrink-0"/>}
                <ChatIcon className="h-3 w-3 shrink-0"/>

                {isRenaming ? (
                    <input
                        ref={inputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") confirmRename();
                            if (e.key === "Escape") setIsRenaming(false);
                        }}
                        onBlur={confirmRename}
                        className="flex-1 min-w-0 bg-transparent text-xs text-foreground outline-none border-b border-primary/50"
                        maxLength={100}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="truncate flex-1">{chat.name}</span>
                )}

                {!isRenaming && (
                    <button
                        ref={btnRef}
                        onClick={toggleMenu}
                        className={`flex h-5 w-5 items-center justify-center rounded shrink-0 transition-all ${menuOpen
                            ? "opacity-100 text-primary"
                            : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                        }`}
                    >
                        <MoreHorizontal className="h-3 w-3"/>
                    </button>
                )}

                {/* Inline dropdown menu — positioned relative to button */}
                {menuOpen && (
                    <div
                        ref={menuRef}
                        className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-border bg-card shadow-[0_4px_16px_rgba(0,0,0,0.4)] popup-enter"
                    >
                        {!showMoveSubmenu ? (
                            <div className="py-1">
                                <button onClick={menuAction(() => {
                                    setIsRenaming(true);
                                    setRenameValue(chat.name);
                                })}
                                        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                                    <Pencil className="h-3.5 w-3.5"/> Переименовать
                                </button>
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMoveSubmenu(true);
                                }}
                                        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                                    <span className="flex items-center gap-2.5"><FolderOpen className="h-3.5 w-3.5"/> Переместить в папку</span>
                                    <ChevronRight className="h-3 w-3"/>
                                </button>
                                <button onClick={menuAction(onPin)}
                                        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                                    <Pin className="h-3.5 w-3.5"/> {chat.pinned ? "Открепить" : "Закрепить"}
                                </button>
                                <button onClick={menuAction(onDuplicate)}
                                        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                                    <Copy className="h-3.5 w-3.5"/> Дублировать
                                </button>
                                <button onClick={menuAction(() => setShowDeleteConfirm(true))}
                                        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-destructive hover:bg-surface-hover transition-colors">
                                    <Trash2 className="h-3.5 w-3.5"/> Удалить
                                </button>
                            </div>
                        ) : (
                            <div className="p-2 animate-fade-in">
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMoveSubmenu(false);
                                }}
                                        className="flex items-center gap-1.5 px-2 py-1 mb-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                                    <ChevronDown className="h-3 w-3 -rotate-90"/> Назад
                                </button>
                                <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase px-2 mb-1">Переместить в:</p>
                                {folders.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground px-2 py-2">Нет папок</p>
                                ) : (
                                    folders.map((f) => (
                                        <button
                                            key={f.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onMove(f.id);
                                                setShowMoveSubmenu(false);
                                                setMenuOpen(false);
                                            }}
                                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                                        >
                                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{backgroundColor: f.color}}/>
                                            <span className="flex-1 text-left">{f.name}</span>
                                        </button>
                                    ))
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMove(null);
                                        setShowMoveSubmenu(false);
                                        setMenuOpen(false);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                                >
                                    <FolderOpen className="h-3 w-3 shrink-0"/>
                                    <span className="flex-1 text-left">Без папки</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showDeleteConfirm && (
                <DeleteDialog
                    title="Удалить чат?"
                    description="Это действие нельзя отменить."
                    onCancel={() => setShowDeleteConfirm(false)}
                    buttons={[
                        {
                            label: "Удалить", action: () => {
                                onDelete();
                                setShowDeleteConfirm(false);
                            }, destructive: true
                        },
                    ]}
                />
            )}
        </>
    );
};

/* ── Main Sidebar ── */
const WorkspaceSidebar = ({
                              isOpen, onClose, folders, chats, activeChatId,
                              onSelectChat, onNewChat, onAddFolder,
                              onRenameFolder, onChangeFolderColor, onDeleteFolder,
                              onRenameChat, onMoveChat, onPinChat, onDuplicateChat, onDeleteChat,
                              title = "ТЕКСТ · ЧАТЫ", activeTab,
                          }: WorkspaceSidebarProps) => {
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
    const [collapsedFolders, setCollapsedFolders] = useState<Set<number>>(new Set());
    const [dragChatId, setDragChatId] = useState<number | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<number | null>(null); // folderId or -1

    // Folder context menu state
    const [folderMenuState, setFolderMenuState] = useState<{ folderId: number; x: number; y: number } | null>(null);
    const [folderRenameId, setFolderRenameId] = useState<number | null>(null);
    const [folderRenameValue, setFolderRenameValue] = useState("");
    const [folderDeleteId, setFolderDeleteId] = useState<number | null>(null);
    const [folderColorState, setFolderColorState] = useState<{ folderId: number; x: number; y: number } | null>(null);

    const folderRenameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (folderRenameId) folderRenameRef.current?.focus();
    }, [folderRenameId]);

    const isMobile = useIsMobile();

    // Swipe-to-close for mobile
    const touchStartX = useRef<number | null>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const dispatch = useDispatch();
    const {user} = useAuth();

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (diff < -50) onClose();
        touchStartX.current = null;
    }, [onClose]);

    if (!isOpen) return null;

    const toggleCollapse = (folderId: number) => {
        setCollapsedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    // Sort: pinned first
    const sortChats = (list: ChatSession[]) =>
        [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    // Drag handlers
    const handleDragStart = (chatId: number) => (e: React.DragEvent) => {
        setDragChatId(chatId);
        e.dataTransfer.effectAllowed = "move";
        (e.target as HTMLElement).style.opacity = "0.5";
    };

    const handleDragEnd = () => {
        setDragChatId(null);
        setDragOverTarget(null);
    };

    const handleFolderDragOver = (folderId: number) => (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragChatId) setDragOverTarget(folderId);
    };

    const handleFolderDrop = (folderId: number | null) => (e: React.DragEvent) => {
        e.preventDefault();
        if (dragChatId) {
            onMoveChat?.(dragChatId, folderId);
        }
        setDragChatId(null);
        setDragOverTarget(null);
    };

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;

        messageService.send(
            dispatch,
            {
                sendEvent: CONFIG.EVENTS.MAIN.SEND.name,
                request: {
                    key: `nf-${Date.now()}-${user.id}`,
                    id: user.id,
                    type: CONFIG.TYPES.MAIN.FOLDER.name,
                    folder: {
                        method: CONFIG.TYPES.MAIN.FOLDER.METHODS.CREATE.name,
                        color: newFolderColor,
                        type: activeTab,
                        name: newFolderName
                    },
                    user: {id: user.id}
                },
                useTimeout: false,
                callback: (response: Response) => {
                    if (response.error) {
                        toast.warning(response.error.message, {position: 'top-right'});
                    } else {
                        onAddFolder(response.folder.name, response.folder.color, response.folder.type || "text");
                        setNewFolderName("");
                        setNewFolderColor(FOLDER_COLORS[0]);
                        setShowNewFolder(false);
                    }
                }
            } as MessageContext);
    };

    const confirmFolderRename = (folderId: number) => {
        const trimmed = folderRenameValue.trim();

        messageService.send(
            dispatch,
            {
                sendEvent: CONFIG.EVENTS.MAIN.SEND.name,
                request: {
                    key: `nf-${Date.now()}-${user.id}`,
                    id: user.id,
                    type: CONFIG.TYPES.MAIN.FOLDER.name,
                    folder: {
                        method: CONFIG.TYPES.MAIN.FOLDER.METHODS.RENAME.name,
                        name: trimmed,
                        id: folderId
                    },
                    user: {id: user.id}
                },
                useTimeout: false,
                callback: (response: Response) => {
                    if (response.error) {
                        toast.warning(response.error.message, {position: 'top-right'});
                    } else {
                        onRenameFolder?.(response.folder.id, response.folder.name);
                        setFolderRenameId(null);
                    }
                }
            } as MessageContext);
    };

    const openFolderMenu = (folderId: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setFolderMenuState({
            folderId,
            x: Math.min(e.clientX, window.innerWidth - 200),
            y: Math.min(e.clientY, window.innerHeight - 200),
        });
    };

    const getFolderMenuOptions = (folder: ChatFolder): MenuOption[] => [
        {
            label: "Переименовать", icon: Pencil, action: () => {
                setFolderRenameId(folder.id);
                setFolderRenameValue(folder.name);
            }
        },
        {label: "Изменить цвет", icon: Palette, action: () => setFolderColorState({folderId: folder.id, x: 120, y: 200})},
        {
            label: collapsedFolders.has(folder.id) ? "Развернуть" : "Свернуть",
            icon: collapsedFolders.has(folder.id) ? ChevronRight : ChevronDown,
            action: () => toggleCollapse(folder.id),
        },
        {label: "Удалить папку", icon: Trash2, action: () => setFolderDeleteId(folder.id), destructive: true},
    ];

    return (
        <>
            {/* Backdrop — mobile: fixed fullscreen to cover tab bar + input bar */}
            {isMobile && (
                <div
                    className="fixed inset-0 bg-black/50 animate-in fade-in-0 duration-200"
                    style={{zIndex: 1100}}
                    onClick={onClose}
                    onTouchEnd={(e) => {
                        e.preventDefault();
                        onClose();
                    }}
                />
            )}
            <div className={isMobile ? "fixed inset-0 flex" : "absolute inset-0 z-40 flex"} style={isMobile ? {zIndex: 1101} : undefined}>
                {/* Panel */}
                <div
                    ref={sidebarRef}
                    className="w-64 h-full bg-[hsl(0_0%_7.8%)] border-r border-border flex flex-col shrink-0 sidebar-slide-in relative"
                    onTouchStart={isMobile ? handleTouchStart : undefined}
                    onTouchEnd={isMobile ? handleTouchEnd : undefined}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between h-11 px-3 border-b border-border shrink-0">
                        <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">{title}</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setShowNewFolder(true)}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                                    title="Создать папку">
                                <FolderPlus className="h-3.5 w-3.5"/>
                            </button>
                            <button onClick={onNewChat}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                                    title="Новый чат">
                                <Plus className="h-3.5 w-3.5"/>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {/* Folders */}
                        {folders.filter((folder) => folder.type === activeTab).map((folder) => {
                            const folderChats = sortChats(folder.projects);
                            const collapsed = collapsedFolders.has(folder.id);
                            const isDropTarget = dragOverTarget === folder.id;

                            return (
                                <div key={folder.id}
                                     onDragOver={handleFolderDragOver(folder.id)}
                                     onDrop={handleFolderDrop(folder.id)}
                                >
                                    <div
                                        className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${isDropTarget ? "border border-dashed border-primary bg-primary/5" : ""
                                        }`}
                                        onContextMenu={(e) => openFolderMenu(folder.id, e)}
                                    >
                                        <button onClick={() => toggleCollapse(folder.id)}
                                                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                                            {collapsed
                                                ? <ChevronRight className="h-3 w-3"/>
                                                : <ChevronDown className="h-3 w-3"/>
                                            }
                                        </button>
                                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{backgroundColor: folder.color}}/>

                                        {folderRenameId === folder.id ? (
                                            <input
                                                ref={folderRenameRef}
                                                value={folderRenameValue}
                                                onChange={(e) => setFolderRenameValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") confirmFolderRename(folder.id);
                                                    if (e.key === "Escape") setFolderRenameId(null);
                                                }}
                                                onBlur={() => confirmFolderRename(folder.id)}
                                                className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-foreground outline-none border-b border-primary/50"
                                                maxLength={50}
                                            />
                                        ) : (
                                            <span className="text-xs font-semibold text-foreground truncate flex-1">{folder.name}</span>
                                        )}

                                        <span className="text-[10px] text-muted-foreground">{folderChats.length}</span>

                                        <button
                                            onClick={(e) => openFolderMenu(folder.id, e)}
                                            className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-primary transition-all shrink-0"
                                        >
                                            <MoreHorizontal className="h-3 w-3"/>
                                        </button>
                                    </div>

                                    {!collapsed && (
                                        <div className="space-y-0.5 ml-3 mt-0.5">
                                            {folderChats.length === 0 ? (
                                                <p className="text-[10px] text-muted-foreground px-2.5 py-1 italic">Пусто</p>
                                            ) : (
                                                folderChats.map((chat) => (
                                                    <ChatItem
                                                        key={chat.id}
                                                        chat={chat}
                                                        isActive={activeChatId === chat.id}
                                                        folders={folders}
                                                        onSelect={() => onSelectChat(chat.id)}
                                                        onRename={(t) => onRenameChat?.(chat.id, t)}
                                                        onMove={(fId) => onMoveChat?.(chat.id, fId)}
                                                        onPin={() => onPinChat?.(chat.id)}
                                                        onDuplicate={() => onDuplicateChat?.(chat.id)}
                                                        onDelete={() => onDeleteChat?.(chat.id)}
                                                        onDragStart={handleDragStart(chat.id)}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={handleFolderDrop(folder.id)}
                                                        isDragOver={false}
                                                        activeTab={activeTab}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Without folder */}
                        <div
                            onDragOver={handleFolderDragOver(-1)}
                            onDrop={handleFolderDrop(null)}
                        >
                            <div
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${dragOverTarget == -1 ? "border border-dashed border-primary bg-primary/5" : ""
                                }`}>
                                <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Без папки</span>
                            </div>
                            <div className="space-y-0.5 ml-1 mt-0.5">
                                {chats.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground px-2.5 py-1 italic">Пусто</p>
                                ) : (
                                    sortChats(chats).map((chat) => (
                                        <ChatItem
                                            key={chat.id}
                                            chat={chat}
                                            isActive={activeChatId === chat.id}
                                            folders={folders}
                                            onSelect={() => onSelectChat(chat.id)}
                                            onRename={(t) => onRenameChat?.(chat.id, t)}
                                            onMove={(fId) => onMoveChat?.(chat.id, fId)}
                                            onPin={() => onPinChat?.(chat.id)}
                                            onDuplicate={() => onDuplicateChat?.(chat.id)}
                                            onDelete={() => onDeleteChat?.(chat.id)}
                                            onDragStart={handleDragStart(chat.id)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={handleFolderDrop(null)}
                                            isDragOver={false}
                                            activeTab={activeTab}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Backdrop */}
                <div className="flex-1 bg-background/50 backdrop-blur-sm" onClick={onClose}/>

                {/* Folder context menu */}
                {folderMenuState && (
                    <ContextMenu
                        x={folderMenuState.x}
                        y={folderMenuState.y}
                        options={getFolderMenuOptions(folders.find((f) => f.id === folderMenuState.folderId)!)}
                        onClose={() => setFolderMenuState(null)}
                    />
                )}

                {/* Folder color picker */}
                {folderColorState && (
                    <ColorPicker
                        currentColor={folders.find((f) => f.id === folderColorState.folderId)?.color ?? FOLDER_COLORS[0]}
                        onSelect={(c) => onChangeFolderColor?.(folderColorState.folderId, c)}
                        onClose={() => setFolderColorState(null)}
                    />
                )}

                {/* Folder delete confirm */}
                {folderDeleteId && (
                    <DeleteDialog
                        title="Удалить папку?"
                        description="Все чаты внутри папки будут удалены."
                        onCancel={() => setFolderDeleteId(null)}
                        buttons={[
                            {
                                label: "Удалить", action: () => {
                                    onDeleteFolder?.(folderDeleteId);
                                    setFolderDeleteId(null);
                                }, destructive: true
                            },
                        ]}
                    />
                )}

                {/* New folder modal */}
                {showNewFolder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                        <div className="w-80 rounded-2xl border border-border bg-card p-6 popup-enter">
                            <h3 className="text-base font-bold text-foreground mb-4">Новая папка</h3>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Имя папки..."
                                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                                    maxLength={50}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleCreateFolder();
                                    }}
                                />
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Цвет</label>
                                    <div className="flex gap-2">
                                        {FOLDER_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => setNewFolderColor(color)}
                                                className={`h-7 w-7 rounded-full transition-all ${newFolderColor === color ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110" : "hover:scale-110"
                                                }`}
                                                style={{backgroundColor: color}}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => {
                                        setShowNewFolder(false);
                                        setNewFolderName("");
                                    }}
                                            className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-surface-hover transition-colors">
                                        Отмена
                                    </button>
                                    <button onClick={handleCreateFolder} disabled={!newFolderName.trim()}
                                            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold glow-lime hover:bg-primary/90 transition-all disabled:opacity-50 btn-press">
                                        Создать
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default WorkspaceSidebar;
