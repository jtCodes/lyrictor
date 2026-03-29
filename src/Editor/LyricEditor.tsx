import {
  Flex,
  Grid,
  Text,
  View,
  ActionButton,
  DialogTrigger,
  AlertDialog,
} from "@adobe/react-spectrum";
import { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { useAudioPlayer } from "react-use-audio-player";
import LogOutButton from "../Auth/LogOutButton";
import CreateNewProjectButton from "../Project/CreateNewProjectButton";
import LoadProjectListButton from "../Project/LoadProjectListButton";
import { loadProjects, useProjectStore } from "../Project/store";
import {
  deleteProjectImages,
} from "../Project/firestoreProjectService";
import { useAIImageGeneratorStore } from "./Image/AI/store";
import AudioTimeline from "./AudioTimeline/AudioTimeline";
import LyricPreview from "./Lyrics/LyricPreview/LyricPreview";
import MoreSmallListVert from "@spectrum-icons/workflow/MoreSmallListVert";
import ViewGrid from "@spectrum-icons/workflow/ViewGrid";
import GraphBullet from "@spectrum-icons/workflow/GraphBullet";

import { useProjectService } from "../Project/useProjectService";
import { useWindowSize } from "../utils";
import MediaContentSidePanel from "./MediaContentSidePanel";
import { Resizable } from "re-resizable";
import SettingsSidePanel from "./SettingsSidePanel";
import { EditingMode } from "../Project/types";
import { useAuthStore } from "../Auth/store";
import { auth } from "../api/firebase";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuItem, DropdownDivider } from "../components/DropdownMenu";
import { ToastQueue } from "@react-spectrum/toast";
import { usePublishProject } from "../Project/usePublishProject";
import { headerButtonStyle, HEADER_BUTTON_CLASS } from "../theme";
import UserSettingsModal from "../Auth/UserSettingsModal";
import { openExternalUrl } from "../runtime";
import { signInWithGoogle } from "../Auth/signIn";
import { getProjectPlaybackUrl } from "../Project/sourcePlugins";
import { useResolvedProjectPlayback } from "../Project/sourcePlugins/useResolvedProjectPlayback";
import ProjectSourceTag from "../Project/ProjectSourceTag";
import ImmersiveLoadingIndicator from "../components/ImmersiveLoadingIndicator";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable ||
    target.getAttribute("role") === "textbox"
  );
}

export default function LyricEditor({ user }: { user?: User }) {
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const { togglePlayPause } = useAudioPlayer();
  const authUser = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.authReady);
  const username = useAuthStore((state) => state.username);

  const editingProject = useProjectStore((state) => state.editingProject);
  const projectActionMessage = useProjectStore((state) => state.projectActionMessage);
  const hasUnsavedChanges = useProjectStore(
    (state) => JSON.stringify(state.lyricTexts) !== state.savedLyricTextsSnapshot
  );

  const { publishedId, isPublishing, publish, unpublish, canPublish } =
    usePublishProject(
      authUser && editingProject && !editingProject.name.includes("(Demo)")
        ? editingProject.name
        : undefined
    );
  const leftSidePanelMaxWidth = useProjectStore(
    (state) => state.leftSidePanelMaxWidth
  );
  const setLeftSidePanelMaxWidth = useProjectStore(
    (state) => state.setLeftSidePanelMaxWidth
  );
  const rightSidePanelMaxWidth = useProjectStore(
    (state) => state.rightSidePanelMaxWidth
  );
  const setRightSidePanelMaxWidth = useProjectStore(
    (state) => state.setRightSidePanelMaxWidth
  );

  const [saveProject] = useProjectService();

  const setExistingProjects = useProjectStore(
    (state) => state.setExistingProjects
  );
  const isCreateNewProjectPopupOpen = useProjectStore(
    (state) => state.isCreateNewProjectPopupOpen
  );
  const setIsCreateNewProjectPopupOpen = useProjectStore(
    (state) => state.setIsCreateNewProjectPopupOpen
  );
  const setIsLoadProjectPopupOpen = useProjectStore(
    (state) => state.setIsLoadProjectPopupOpen
  );
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setUnsavedLyricReference = useProjectStore(
    (state) => state.setUnsavedLyricReference
  );
  const setImages = useProjectStore((state) => state.setImages);
  const resetAIImageStore = useAIImageGeneratorStore((state) => state.reset);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { playbackUrl, handlePlaybackLoadError } = useResolvedProjectPlayback(
    editingProject,
    useProjectStore((state) => state.setEditingProject)
  );
  const shouldShowEditorLoadingOverlay = Boolean(projectActionMessage && !playbackUrl);

  // const url: string =
  //   "https://firebasestorage.googleapis.com/v0/b/anigo-67b0c.appspot.com/o/Dying%20Wish%20-%20Until%20Mourning%20Comes%20(Official%20Music%20Video).mp3?alt=media&token=1573cc50-6b33-4aea-b46c-9732497e9725";
  const INITIAL_TIMELINE_WIDTH = 2500;
  const HEADER_ROW_HEIGHT = 48;
  const INITIAL_TIMELINE_VISIBLE_HEIGHT = 260;
  const MIN_TIMELINE_VISIBLE_HEIGHT = 180;
  const MIN_LYRIC_PREVIEW_ROW_HEIGHT = 180;
  const availableEditorHeight = Math.max(1, (windowHeight ?? 0) - HEADER_ROW_HEIGHT);
  const maxTimelineVisibleHeight = Math.max(
    MIN_TIMELINE_VISIBLE_HEIGHT,
    availableEditorHeight - MIN_LYRIC_PREVIEW_ROW_HEIGHT
  );
  const [timelineVisibleHeight, setTimelineVisibleHeight] = useState(
    Math.min(INITIAL_TIMELINE_VISIBLE_HEIGHT, maxTimelineVisibleHeight)
  );
  const clampedTimelineVisibleHeight = Math.min(
    Math.max(timelineVisibleHeight, MIN_TIMELINE_VISIBLE_HEIGHT),
    maxTimelineVisibleHeight
  );
  const LYRIC_PREVIEW_ROW_HEIGHT =
    Math.max(
      MIN_LYRIC_PREVIEW_ROW_HEIGHT,
      availableEditorHeight - clampedTimelineVisibleHeight
    );

  const [leftSidePanelResizeStartWidth, setLeftSidePanelResizeStartWidth] =
    useState(0);
  const [rightSidePanelResizeStartWidth, setRightSidePanelResizeStartWidth] =
    useState(0);
  const [timelineResizeStartHeight, setTimelineResizeStartHeight] = useState(0);
  const [isLeftSidePanelVisible, setIsLeftSidePanelVisible] = useState(true);
  const [isRightSidePanelVisible, setIsRightSidePanelVisible] = useState(true);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authReady) return;
    const fetchProjects = async () => {
      const projects = await loadProjects();
      setExistingProjects(projects);
    };

    fetchProjects();
  }, [authReady]);

  useEffect(() => {
    if (!editingProject && !isCreateNewProjectPopupOpen) {
      setIsLoadProjectPopupOpen(true);
    }
  }, [editingProject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (editingProject) {
          saveProject();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingProject, saveProject]);

  useEffect(() => {
    const handleGlobalSpacebar = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") {
        return;
      }

      if (e.repeat || isTypingTarget(e.target)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      togglePlayPause();
    };

    window.addEventListener("keydown", handleGlobalSpacebar, true);
    return () => window.removeEventListener("keydown", handleGlobalSpacebar, true);
  }, [togglePlayPause]);

  useEffect(() => {
    const name = editingProject?.name ?? "Lyrictor";
    document.title = hasUnsavedChanges ? `${name} *` : name;
    return () => { document.title = "Lyrictor"; };
  }, [editingProject?.name, hasUnsavedChanges]);

  async function handleResetProject() {
    if (authUser && editingProject) {
      try {
        await deleteProjectImages(authUser.uid, editingProject.name);
      } catch (e) {
        console.error("Failed to delete cloud images:", e);
      }
    }
    setLyricTexts([]);
    setLyricReference("");
    setUnsavedLyricReference("");
    setImages([]);
    resetAIImageStore();
  }

  function isDemoProject() {
    return editingProject?.name.includes("(Demo)");
  }

  const handleLeftSidePanelVisibilityToggleClick = () => {
    setIsLeftSidePanelVisible(!isLeftSidePanelVisible);
  };

  const handleRightSidePanelVisibilityToggleClick = () => {
    setIsRightSidePanelVisible(!isRightSidePanelVisible);
  };

  function getLyricsPreviewWindowWidth() {
    let sidePanelWidth = 5;

    if (isLeftSidePanelVisible) {
      sidePanelWidth += leftSidePanelMaxWidth;
    }

    if (isRightSidePanelVisible) {
      sidePanelWidth += rightSidePanelMaxWidth;
    }

    return Math.max(1, (windowWidth ?? 0) - sidePanelWidth);
  }

  return (
    <>
      <CreateNewProjectButton hideButton={true} />
      <LoadProjectListButton hideButton={true} />
      <DialogTrigger isOpen={showResetConfirm} onOpenChange={setShowResetConfirm}>
        {/* Hidden trigger — opened via state */}
        <ActionButton UNSAFE_style={{ display: "none" }}>Reset</ActionButton>
        <AlertDialog
          variant="destructive"
          title="Reset Project"
          primaryActionLabel="Reset"
          cancelLabel="Cancel"
          onPrimaryAction={handleResetProject}
        >
          This will clear all timeline content, images, and generated image log. Uploaded images will be deleted from cloud storage. This cannot be undone.
        </AlertDialog>
      </DialogTrigger>
      <UserSettingsModal
        open={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
      />
      <Grid
        areas={["header", "content", "footer"]}
        columns={["3fr"]}
        rows={[
          HEADER_ROW_HEIGHT + "px",
          LYRIC_PREVIEW_ROW_HEIGHT + "px",
          clampedTimelineVisibleHeight + "px",
        ]}
        height={"100vh"}
        minWidth={"100vw"}
        UNSAFE_style={{ overflow: "hidden" }}
      >
      <View
        gridArea="header"
        UNSAFE_style={{
          background: "rgba(30, 32, 36, 0.92)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <Flex
          direction="row"
          height="100%"
          alignItems={"center"}
          justifyContent={"space-between"}
          UNSAFE_style={{ position: "relative" }}
        >
          <View marginStart={8} UNSAFE_style={{ zIndex: 1 }}>
            <ActionButton
              isQuiet
              onPress={() => navigate("/")}
              aria-label="Back to home"
              UNSAFE_style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                opacity: 0.6,
              }}
              UNSAFE_className={HEADER_BUTTON_CLASS}
            >
              <img
                src={`${import.meta.env.BASE_URL}favicon.svg`}
                alt="Lyrictor"
                width={24}
                height={24}
              />
            </ActionButton>
          </View>
          <Flex
            alignItems={"center"}
            justifyContent={"center"}
            gap={10}
            UNSAFE_style={{
              position: "absolute",
              left: 0,
              right: 0,
              pointerEvents: "none",
            }}
          >
            <Flex
              alignItems={"center"}
              gap={10}
              UNSAFE_style={{ pointerEvents: "auto" }}
            >
              {editingProject?.albumArtSrc ? (
                <View>
                  <img
                    height={35}
                    width={35}
                    style={{
                      objectFit: "contain",
                      border: "solid",
                      borderWidth: 1,
                      borderRadius: 2,
                      borderColor: "rgba(211,211,211, 0.15)",
                    }}
                    src={editingProject.albumArtSrc}
                  />
                </View>
              ) : null}
              <Flex direction="column" justifyContent="center" gap={2}>
                <Text>
                  <span style={{ fontWeight: 500, fontSize: 14, lineHeight: 1, letterSpacing: 0.2 }}>
                    {editingProject?.name}
                  </span>
                </Text>
                <Flex alignItems="center" gap={6} wrap>
                  <ProjectSourceTag projectDetail={editingProject} size="compact" />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 400,
                      color: "rgba(255, 255, 255, 0.3)",
                      lineHeight: 1,
                    }}
                  >
                    {editingProject?.editingMode === EditingMode.static
                      ? "Vertical"
                      : "Custom"}
                    {hasUnsavedChanges ? (
                      <span style={{ color: "rgba(255, 180, 100, 0.5)" }}>
                        {" · Unsaved"}
                      </span>
                    ) : null}
                  </span>
                </Flex>
              </Flex>
            </Flex>
          </Flex>
          <Flex
            direction="row"
            alignItems={"center"}
            gap={6}
            marginEnd={10}
          >
            {/* {user ? (
              <>
                <View marginEnd={10}>
                  <Text>
                    <span>{user?.displayName}</span>
                  </Text>
                </View>
                <View marginEnd={15}>
                  <LogOutButton />
                </View>
              </>
            ) : null} */}
            <View>
              <ActionButton
                aria-label={
                  isLeftSidePanelVisible
                    ? "Hide media side panel"
                    : "Show media side panel"
                }
                isQuiet
                onPressUp={handleLeftSidePanelVisibilityToggleClick}
                UNSAFE_className={HEADER_BUTTON_CLASS}
                UNSAFE_style={headerButtonStyle(isLeftSidePanelVisible)}
              >
                <ViewGrid />
              </ActionButton>
            </View>
            <View>
              <ActionButton
                aria-label={
                  isRightSidePanelVisible
                    ? "Hide settings side panel"
                    : "Show settings side panel"
                }
                isQuiet
                onPressUp={handleRightSidePanelVisibilityToggleClick}
                UNSAFE_className={HEADER_BUTTON_CLASS}
                UNSAFE_style={headerButtonStyle(isRightSidePanelVisible)}
              >
                <GraphBullet />
              </ActionButton>
            </View>
            <View zIndex={20}>
              <DropdownMenu
                trigger={
                  <ActionButton
                    isQuiet
                    aria-label="Options"
                    UNSAFE_className={HEADER_BUTTON_CLASS}
                    UNSAFE_style={headerButtonStyle(false)}
                  >
                    <MoreSmallListVert size="S" />
                  </ActionButton>
                }
              >
                <DropdownMenuItem
                  onClick={() => setIsCreateNewProjectPopupOpen(true)}
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  }
                >
                  New Project
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsLoadProjectPopupOpen(true)}
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                  }
                >
                  Load
                </DropdownMenuItem>
                {editingProject ? (
                  <DropdownMenuItem
                    onClick={() => saveProject()}
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                    }
                  >
                    Save
                  </DropdownMenuItem>
                ) : null}
                {authUser && editingProject && !isDemoProject() ? (
                  <DropdownMenuItem
                    disabled={!canPublish}
                    onClick={async () => {
                      const beforePublish = hasUnsavedChanges
                        ? async () => {
                            ToastQueue.info("Saving before publishing...", { timeout: 3000 });
                            await saveProject();
                          }
                        : undefined;

                      const state = useProjectStore.getState();
                      const aiState = useAIImageGeneratorStore.getState();
                      if (!state.editingProject) return;
                      const project = {
                        id: state.editingProject.name,
                        projectDetail: state.editingProject,
                        lyricTexts: state.lyricTexts,
                        lyricReference: state.lyricReference,
                        generatedImageLog: aiState.generatedImageLog ?? [],
                        promptLog: aiState.promptLog ?? [],
                        images: state.images,
                      };
                      await publish(project, beforePublish);
                    }}
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                    }
                  >
                    {isPublishing ? "Publishing..." : !canPublish ? "Set username to publish" : publishedId ? "Update Published" : "Publish to Discover"}
                  </DropdownMenuItem>
                ) : null}
                {authUser && editingProject && !isDemoProject() && publishedId ? (
                  <DropdownMenuItem
                    onClick={() => unpublish()}
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    }
                    destructive
                  >
                    Unpublish
                  </DropdownMenuItem>
                ) : null}
                <DropdownDivider />
                <DropdownMenuItem
                  onClick={() => {
                    void openExternalUrl("https://github.com/jtCodes/lyrictor");
                  }}
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
                  }
                >
                  Support
                </DropdownMenuItem>
                <DropdownDivider />
                {editingProject ? (
                  <DropdownMenuItem
                    onClick={() => setShowResetConfirm(true)}
                    destructive
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                    }
                  >
                    Reset Project
                  </DropdownMenuItem>
                ) : null}
                {authUser ? (
                  <>
                    <DropdownDivider />
                    <DropdownMenuItem
                      onClick={() => setIsUserSettingsOpen(true)}
                      icon={
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                      }
                    >
                      User Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => auth.signOut()}
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                      }
                    >
                      Sign out ({authUser.displayName ?? authUser.email})
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownDivider />
                  <DropdownMenuItem
                    onClick={() => signInWithGoogle().catch(() => {})}
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                    }
                  >
                    Sign in with Google
                  </DropdownMenuItem>
                  </>
                )}
              </DropdownMenu>
            </View>
          </Flex>
        </Flex>
      </View>
      <Flex
        gridArea="content"
        height={"100%"}
        justifyContent={"space-between"}
        UNSAFE_style={{ minHeight: 0 }}
      >
        <View>
          <Resizable
            size={{
              width: isLeftSidePanelVisible ? leftSidePanelMaxWidth : 0,
              height: "100%",
            }}
            defaultSize={{
              width: leftSidePanelMaxWidth,
            }}
            minWidth={isLeftSidePanelVisible ? 350 : 0}
            minHeight={"100%"}
            onResizeStart={() => {
              setLeftSidePanelResizeStartWidth(leftSidePanelMaxWidth);
            }}
            onResize={(e, direction, ref, d) => {
              setLeftSidePanelMaxWidth(leftSidePanelResizeStartWidth + d.width);
            }}
          >
            <View
              overflow={"hidden"}
              height={"100%"}
              UNSAFE_style={{
                background: "rgba(18, 20, 24, 0.95)",
                borderRight: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <MediaContentSidePanel
                maxRowHeight={LYRIC_PREVIEW_ROW_HEIGHT}
                containerWidth={
                  isLeftSidePanelVisible ? leftSidePanelMaxWidth : 0
                }
              />
            </View>
          </Resizable>
        </View>
        <View>
          <View position="relative">
            <LyricPreview
              maxHeight={LYRIC_PREVIEW_ROW_HEIGHT}
              maxWidth={getLyricsPreviewWindowWidth()}
              resolution={editingProject?.resolution}
              editingMode={editingProject?.editingMode}
            />
            {shouldShowEditorLoadingOverlay ? (
              <ImmersiveLoadingIndicator
                title="Preparing Editor"
                message={projectActionMessage}
              />
            ) : null}
          </View>
        </View>
        <View>
          <Resizable
            size={{
              width: isRightSidePanelVisible ? rightSidePanelMaxWidth : 0,
              height: "100%",
            }}
            defaultSize={{
              width: rightSidePanelMaxWidth,
            }}
            minWidth={isRightSidePanelVisible ? 350 : 0}
            minHeight={"100%"}
            onResizeStart={() => {
              setRightSidePanelResizeStartWidth(rightSidePanelMaxWidth);
            }}
            onResize={(e, direction, ref, d) => {
              setRightSidePanelMaxWidth(
                rightSidePanelResizeStartWidth + d.width
              );
            }}
          >
            <View
              height={"100%"}
              UNSAFE_style={{
                background: "rgba(18, 20, 24, 0.95)",
                borderLeft: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <SettingsSidePanel
                maxRowHeight={LYRIC_PREVIEW_ROW_HEIGHT}
                containerWidth={
                  isRightSidePanelVisible ? rightSidePanelMaxWidth : 0
                }
              />
            </View>
          </Resizable>
        </View>
      </Flex>
      <View
        gridArea="footer"
        height={"100%"}
        overflow="hidden"
        UNSAFE_style={{ minHeight: 0 }}
      >
        <Resizable
          size={{ width: "100%", height: "100%" }}
          minHeight={MIN_TIMELINE_VISIBLE_HEIGHT}
          maxHeight={maxTimelineVisibleHeight}
          enable={{
            top: true,
            right: false,
            bottom: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
          handleStyles={{
            top: {
              height: 10,
              top: -5,
              cursor: "row-resize",
            },
          }}
          onResizeStart={() => {
            setTimelineResizeStartHeight(clampedTimelineVisibleHeight);
          }}
          onResize={(e, direction, ref, d) => {
            setTimelineVisibleHeight(
              Math.min(
                Math.max(
                  timelineResizeStartHeight + d.height,
                  MIN_TIMELINE_VISIBLE_HEIGHT
                ),
                maxTimelineVisibleHeight
              )
            );
          }}
        >
          {playbackUrl ? (
            <AudioTimeline
              width={INITIAL_TIMELINE_WIDTH}
              height={clampedTimelineVisibleHeight}
              url={playbackUrl}
              onPlaybackLoadError={handlePlaybackLoadError}
            />
          ) : null}
        </Resizable>
      </View>
      </Grid>
    </>
  );
}
