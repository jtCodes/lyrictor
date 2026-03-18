import {
  Flex,
  Grid,
  Text,
  View,
  ActionButton,
  Badge,
  DialogTrigger,
  AlertDialog,
} from "@adobe/react-spectrum";
import { User } from "firebase/auth";
import { useEffect, useState } from "react";
import LogOutButton from "../Auth/LogOutButton";
import CreateNewProjectButton from "../Project/CreateNewProjectButton";
import LoadProjectListButton from "../Project/LoadProjectListButton";
import { loadProjects, useProjectStore } from "../Project/store";
import {
  deleteProjectImages,
  publishProject,
  unpublishProject,
  getPublishedIdForProject,
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
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../api/firebase";
import { useNavigate } from "react-router-dom";
import Home from "@spectrum-icons/workflow/Home";
import { DropdownMenu, DropdownMenuItem, DropdownDivider } from "../components/DropdownMenu";

export default function LyricEditor({ user }: { user?: User }) {
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const authUser = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.authReady);
  const username = useAuthStore((state) => state.username);

  const editingProject = useProjectStore((state) => state.editingProject);
  const hasUnsavedChanges = useProjectStore(
    (state) => JSON.stringify(state.lyricTexts) !== state.savedLyricTextsSnapshot
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
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // const url: string =
  //   "https://firebasestorage.googleapis.com/v0/b/anigo-67b0c.appspot.com/o/Dying%20Wish%20-%20Until%20Mourning%20Comes%20(Official%20Music%20Video).mp3?alt=media&token=1573cc50-6b33-4aea-b46c-9732497e9725";
  const INITIAL_TIMELINE_WIDTH = 2500;
  const HEADER_ROW_HEIGHT = 120;
  const TIMELINE_VISIBLE_HEIGHT = 260;
  const LYRIC_PREVIEW_ROW_HEIGHT =
    (windowHeight ?? 0) - (HEADER_ROW_HEIGHT + TIMELINE_VISIBLE_HEIGHT - 17.5);

  const [leftSidePanelResizeStartWidth, setLeftSidePanelResizeStartWidth] =
    useState(0);
  const [rightSidePanelResizeStartWidth, setRightSidePanelResizeStartWidth] =
    useState(0);
  const [isLeftSidePanelVisible, setIsLeftSidePanelVisible] = useState(true);
  const [isRightSidePanelVisible, setIsRightSidePanelVisible] = useState(true);
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
    if (authUser && editingProject && !isDemoProject()) {
      getPublishedIdForProject(authUser.uid, editingProject.name)
        .then(setPublishedId)
        .catch(() => setPublishedId(null));
    } else {
      setPublishedId(null);
    }
  }, [authUser, editingProject?.name]);

  useEffect(() => {
    if (!editingProject && !isCreateNewProjectPopupOpen) {
      setIsLoadProjectPopupOpen(true);
    }
  }, [editingProject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (editingProject && !isDemoProject()) {
          saveProject();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingProject, saveProject]);

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

    return (windowWidth ?? 0) - sidePanelWidth;
  }

  return (
    <Grid
      areas={["header", "content", "footer"]}
      columns={["3fr"]}
      rows={["size-600", LYRIC_PREVIEW_ROW_HEIGHT + "px", "auto"]}
      minHeight={"100vh"}
      minWidth={"100vw"}
      gap="size-40"
      UNSAFE_style={{ overflow: "hidden" }}
    >
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
      <View backgroundColor="gray-300" gridArea="header">
        <Flex
          direction="row"
          height="size-600"
          gap="size-100"
          alignItems={"center"}
          justifyContent={"space-between"}
        >
          <View marginStart={15}>
            <Flex alignContent={"center"} justifyContent={"center"} gap={5}>
              <View alignSelf={"center"}>
                <ActionButton
                  isQuiet
                  onPress={() => navigate("/")}
                  aria-label="Back to home"
                  UNSAFE_style={{ cursor: "pointer" }}
                >
                  <Home size="S" />
                </ActionButton>
              </View>
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
              <View alignSelf={"center"}>
                <Text>
                  <span style={{ fontWeight: 600 }}>
                    {editingProject?.name}
                    {hasUnsavedChanges ? (
                      <span
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontWeight: 400,
                          marginLeft: 6,
                          fontSize: 11,
                        }}
                      >
                        (unsaved)
                      </span>
                    ) : null}
                  </span>
                </Text>
              </View>
              <View alignSelf={"center"}>
                <Badge
                  variant="neutral"
                  UNSAFE_style={{
                    fontSize: 9,
                    fontWeight: "100",
                    letterSpacing: 0.5,
                    padding: 0,
                  }}
                >
                  <Text UNSAFE_style={{ padding: "2px 4.5px" }}>
                    {editingProject?.editingMode === EditingMode.static
                      ? "VERTICAL"
                      : "CUSTOM"}
                  </Text>
                </Badge>
              </View>
            </Flex>
          </View>
          <Flex
            direction="row"
            justifyContent={"space-between"}
            alignItems={"center"}
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
            <View marginStart={10}>
              <ActionButton
                aria-label={
                  isLeftSidePanelVisible
                    ? "Hide media side panel"
                    : "Show media side panel"
                }
                isQuiet={!isLeftSidePanelVisible}
                onPressUp={handleLeftSidePanelVisibilityToggleClick}
              >
                <ViewGrid />
              </ActionButton>
            </View>
            <View marginStart={10} marginEnd={10}>
              <ActionButton
                aria-label={
                  isRightSidePanelVisible
                    ? "Hide settings side panel"
                    : "Show settings side panel"
                }
                isQuiet={!isRightSidePanelVisible}
                onPressUp={handleRightSidePanelVisibilityToggleClick}
              >
                <GraphBullet />
              </ActionButton>
            </View>
            <View marginStart={10} marginEnd={10} zIndex={20}>
              <DropdownMenu
                trigger={
                  <ActionButton
                    isQuiet
                    aria-label="Options"
                    UNSAFE_style={{ cursor: "pointer" }}
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
                {!isDemoProject() && editingProject ? (
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
                    onClick={async () => {
                      if (isPublishing) return;
                      setIsPublishing(true);
                      try {
                        if (publishedId) {
                          await unpublishProject(publishedId);
                          setPublishedId(null);
                        } else {
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
                          const id = await publishProject(
                            authUser.uid,
                            username ?? authUser.displayName ?? "Anonymous",
                            project
                          );
                          setPublishedId(id);
                        }
                      } finally {
                        setIsPublishing(false);
                      }
                    }}
                    icon={
                      publishedId
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                    }
                  >
                    {isPublishing ? "Publishing..." : publishedId ? "Unpublish" : "Publish to Discover"}
                  </DropdownMenuItem>
                ) : null}
                <DropdownDivider />
                <DropdownMenuItem
                  onClick={() => window.open("https://github.com/jtCodes/lyrictor")}
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
                <DropdownDivider />
                {authUser ? (
                  <DropdownMenuItem
                    onClick={() => auth.signOut()}
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    }
                  >
                    Sign out ({authUser.displayName ?? authUser.email})
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => signInWithPopup(auth, googleProvider).catch(() => {})}
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                    }
                  >
                    Sign in with Google
                  </DropdownMenuItem>
                )}
              </DropdownMenu>
            </View>
          </Flex>
        </Flex>
      </View>
      <Flex height={"100%"} justifyContent={"space-between"} gap={0}>
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
            <View backgroundColor="gray-75" overflow={"hidden"} height={"100%"}>
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
          <LyricPreview
            maxHeight={LYRIC_PREVIEW_ROW_HEIGHT}
            maxWidth={getLyricsPreviewWindowWidth()}
            resolution={editingProject?.resolution}
            editingMode={editingProject?.editingMode}
          />
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
            <View backgroundColor="gray-75" height={"100%"}>
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
      <View gridArea="footer">
        {editingProject?.audioFileUrl ? (
          <AudioTimeline
            width={INITIAL_TIMELINE_WIDTH}
            height={TIMELINE_VISIBLE_HEIGHT}
            url={editingProject?.audioFileUrl}
          />
        ) : null}
      </View>
    </Grid>
  );
}
