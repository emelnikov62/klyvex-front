import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import WorkspacePanel from "@/components/workspace/WorkspacePanel";
import { usePanelState } from "@/hooks/use-panel-state";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { TAB_CONFIG } from "@/lib/models";
import { toast } from "sonner";

type PanelVisibility = "both" | "left-only" | "right-only";

interface WorkspaceState {
  projectId?: number;
  requestId?: number;
}

const Workspace = () => {
  const location = useLocation();
  const state = location.state as WorkspaceState | null;
  const [visibility, setVisibility] = useState<PanelVisibility>("both");
  const [activePanel, setActivePanel] = useState<"left" | "right">("left");

  // Refs to track activeChatId on each panel (to avoid circular dependency during initialization)
  const leftActiveChatIdRef = useRef<number | null>(null);
  const rightActiveChatIdRef = useRef<number | null>(null);

  // Track if we already opened the project from navigation
  const openedProjectRef = useRef(false);

  // Both uploadedFiles and generatedFiles are extracted from user.projects automatically
  const left = usePanelState("text");
  const right = usePanelState("image");

  // Sync refs with actual state
  useEffect(() => {
    leftActiveChatIdRef.current = left.activeChatId;
  }, [left.activeChatId]);

  useEffect(() => {
    rightActiveChatIdRef.current = right.activeChatId;
  }, [right.activeChatId]);

  // Open project from navigation state (e.g., from Storage page)
  useEffect(() => {
    if (state?.projectId && !openedProjectRef.current) {
      openedProjectRef.current = true;
      // Open the project in the left panel - this switches tab and loads settings
      left.openProject(state.projectId, state.requestId);
      // Clear the state to prevent re-opening on subsequent renders
      window.history.replaceState({}, '', location.pathname);
    }
  }, [state?.projectId, state?.requestId, left.openProject]);

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const minimizeLeft = useCallback(() => setVisibility("right-only"), []);
  const minimizeRight = useCallback(() => setVisibility("left-only"), []);

  const toggleMaxLeft = useCallback(() => {
    setVisibility((v) => (v === "left-only" ? "both" : "left-only"));
  }, []);
  const toggleMaxRight = useCallback(() => {
    setVisibility((v) => (v === "right-only" ? "both" : "right-only"));
  }, []);

  const restore = useCallback(() => setVisibility("both"), []);

  // Wrapper for chat selection that prevents same chat on both panels
  const handleSelectChatLeft = useCallback((chatId: number | null) => {
    const rightActiveId = rightActiveChatIdRef.current;
    if (chatId !== null && rightActiveId === chatId) {
      // Chat is open on right panel - close it there first
      right.setActiveChatId(null);
      right.clearMessages();
      toast.info("Проект перемещён с правой панели");
    }
    left.setActiveChatId(chatId);
  }, [left, right]);

  const handleSelectChatRight = useCallback((chatId: number | null) => {
    const leftActiveId = leftActiveChatIdRef.current;
    if (chatId !== null && leftActiveId === chatId) {
      // Chat is open on left panel - close it there first
      left.setActiveChatId(null);
      left.clearMessages();
      toast.info("Проект перемещён с левой панели");
    }
    right.setActiveChatId(chatId);
  }, [left, right]);

  // Wrapper for tab switch that excludes chat from other panel
  const handleSwitchTabLeft = useCallback((tab: string) => {
    const rightActiveId = rightActiveChatIdRef.current;
    // Check if we need to exclude the chat from right panel
    left.switchTabWithExclude(tab, rightActiveId);
  }, [left]);

  const handleSwitchTabRight = useCallback((tab: string) => {
    const leftActiveId = leftActiveChatIdRef.current;
    // Check if we need to exclude the chat from left panel
    right.switchTabWithExclude(tab, leftActiveId);
  }, [right]);

  const panelProps = (s: ReturnType<typeof usePanelState>, onSelectChat: (id: number | null) => void, onTabSwitch: (tab: string) => void) => ({
    activeTab: s.activeTab,
    selectedModel: s.selectedModel,
    prompt: s.prompt,
    onPromptChange: s.setPrompt,
    onTabSwitch,
    onModelSelect: s.setSelectedModel,
    messages: s.messages,
    onSendMessage: s.sendMessage,
    isTextLoading: s.isTextLoading,
    attachments: s.attachments,
    onAddAttachment: s.addAttachment,
    onRemoveAttachment: s.removeAttachment,
    onAddStoredAttachment: s.addStoredAttachment,
    uploadedFiles: s.uploadedFiles,
    onAddUploadedFile: s.addUploadedFile,
    generatedFiles: s.generatedFiles,
    onAddGeneratedFile: s.addGeneratedFile,
    folders: s.folders,
    chats: s.chats,
    activeChatId: s.activeChatId,
    onSelectChat,
    onNewChat: s.newChat,
    onAddFolder: s.addFolder,
    onRenameFolder: s.renameFolder,
    onChangeFolderColor: s.changeFolderColor,
    onDeleteFolder: s.deleteFolder,
    onRenameChat: s.renameChat,
    onMoveChat: s.moveChat,
    onPinChat: s.pinChat,
    onDuplicateChat: s.duplicateChat,
    onDeleteChat: s.deleteChat,
    designSettings: s.designSettings,
    onDesignSettingsChange: s.setDesignSettings,
    onGenerateImages: s.generateImages,
    isImageLoading: s.isImageLoading,
    onDeleteDesignMessage: s.deleteDesignMessage,
    videoSettings: s.videoSettings,
    onVideoSettingsChange: s.setVideoSettings,
    onGenerateVideo: s.generateVideo,
    isVideoLoading: s.isVideoLoading,
    onDeleteVideoMessage: s.deleteVideoMessage,
    audioSettings: s.audioSettings,
    onAudioSettingsChange: s.setAudioSettings,
    onGenerateAudio: s.generateAudio,
    isAudioLoading: s.isAudioLoading,
    onDeleteAudioMessage: s.deleteAudioMessage,
    onEditMessage: s.editMessage,
  });

  /* ═══ MOBILE: single panel + bottom tab bar ═══ */
  if (isMobile) {
    // On mobile, we use left panel state for everything, switching tabs directly
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        {/* Panel content area */}
        <div className="flex-1 min-w-0 min-h-0">
          <WorkspacePanel
            {...panelProps(left, handleSelectChatLeft, handleSwitchTabLeft)}
            canClose={false}
            isFullWidth={true}
            canMinimize={false}
            isMobile={true}
          />
        </div>

        {/* Bottom Tab Bar */}
        <div
          className="fixed bottom-0 left-0 right-0 z-[1000] flex items-stretch border-t"
          style={{
            height: `calc(64px + env(safe-area-inset-bottom, 0px))`,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            background: "#0A0A0A",
            borderColor: "#222",
          }}
        >
          {TAB_CONFIG.map((tab) => {
            const isActive = left.activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => left.switchTab(tab.id)}
                className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors"
                style={{ color: isActive ? "#C8FF00" : "#888" }}
              >
                <TabIcon size={24} strokeWidth={2} className={isActive ? "drop-shadow-[0_0_6px_rgba(200,255,0,0.4)]" : ""} />
                <span className="text-[10px] font-medium leading-none text-center">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ═══ TABLET: single panel with panel switcher ═══ */
  if (isTablet) {
    const currentState = activePanel === "left" ? left : right;
    const currentSelectChat = activePanel === "left" ? handleSelectChatLeft : handleSelectChatRight;
    const currentSwitchTab = activePanel === "left" ? handleSwitchTabLeft : handleSwitchTabRight;
    return (
      <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        <div className="flex-1 min-w-0">
          <WorkspacePanel
            {...panelProps(currentState, currentSelectChat, currentSwitchTab)}
            canClose={false}
            isFullWidth={true}
            canMinimize={false}
            showPanelSwitcher={true}
            activePanel={activePanel}
            onSwitchPanel={() => setActivePanel((p) => (p === "left" ? "right" : "left"))}
          />
        </div>
      </div>
    );
  }

  /* ═══ DESKTOP: two panels ═══ */
  const leftVisible = visibility !== "right-only";
  const rightVisible = visibility !== "left-only";
  const bothVisible = visibility === "both";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      {!leftVisible && (
        <button onClick={restore} className="w-1 shrink-0 bg-border hover:w-6 hover:bg-primary transition-all duration-200 cursor-pointer" title="Восстановить панель" />
      )}

      <div className="min-w-0 overflow-hidden transition-all duration-300 ease-in-out" style={{ flex: leftVisible ? 1 : 0, width: leftVisible ? undefined : 0 }}>
        {leftVisible && (
          <WorkspacePanel
            {...panelProps(left, handleSelectChatLeft, handleSwitchTabLeft)}
            canClose={false}
            isFullWidth={!bothVisible}
            canMinimize={bothVisible}
            onMinimize={minimizeLeft}
            onToggleMaximize={toggleMaxLeft}
            isMaximized={visibility === "left-only"}
          />
        )}
      </div>

      {bothVisible && <div className="w-px bg-border shrink-0" />}

      <div className="min-w-0 overflow-hidden transition-all duration-300 ease-in-out" style={{ flex: rightVisible ? 1 : 0, width: rightVisible ? undefined : 0 }}>
        {rightVisible && (
          <WorkspacePanel
            {...panelProps(right, handleSelectChatRight, handleSwitchTabRight)}
            canClose={false}
            isFullWidth={!bothVisible}
            canMinimize={bothVisible}
            onMinimize={minimizeRight}
            onToggleMaximize={toggleMaxRight}
            isMaximized={visibility === "right-only"}
          />
        )}
      </div>

      {!rightVisible && (
        <button onClick={restore} className="w-1 shrink-0 bg-border hover:w-6 hover:bg-primary transition-all duration-200 cursor-pointer" title="Восстановить панель" />
      )}
    </div>
  );
};

export default Workspace;
