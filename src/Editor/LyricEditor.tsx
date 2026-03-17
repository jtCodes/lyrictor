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
import { useEffect, useState, useRef } from "react";
import LogOutButton from "../Auth/LogOutButton";
import CreateNewProjectButton from "../Project/CreateNewProjectButton";
import LoadProjectListButton from "../Project/LoadProjectListButton";
import { loadProjects, useProjectStore } from "../Project/store";
import { deleteProjectImages } from "../Project/firestoreProjectService";
import { useAIImageGeneratorStore } from "./Image/AI/store";
import AudioTimeline from "./AudioTimeline/AudioTimeline";
import LyricPreview from "./Lyrics/LyricPreview/LyricPreview";
import Add from "@spectrum-icons/workflow/Add";
import ViewGrid from "@spectrum-icons/workflow/ViewGrid";
import GraphBullet from "@spectrum-icons/workflow/GraphBullet";
import githubIcon from "../github-mark.png";
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
import ChevronLeft from "@spectrum-icons/workflow/ChevronLeft";

export default function LyricEditor({ user }: { user?: User }) {
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const authUser = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.authReady);

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
                  <ChevronLeft size="S" />
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
              <div style={{ position: "relative" }} ref={menuRef}>
                <ActionButton
                  isQuiet
                  onPress={() => setMenuOpen(!menuOpen)}
                  aria-label="Options"
                >
                  <Add size="S" />
                </ActionButton>

                {menuOpen && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 99 }}
                      onClick={() => setMenuOpen(false)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 38,
                        right: 0,
                        zIndex: 100,
                        minWidth: 180,
                        backgroundColor: "rgb(30, 33, 38)",
                        border: "1px solid rgba(255, 255, 255, 0.10)",
                        borderRadius: 10,
                        padding: "6px 0",
                        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      <DropdownMenuItem
                        onClick={() => {
                          setMenuOpen(false);
                          setIsCreateNewProjectPopupOpen(true);
                        }}
                      >
                        New Project
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setMenuOpen(false);
                          setIsLoadProjectPopupOpen(true);
                        }}
                      >
                        Load
                      </DropdownMenuItem>
                      {!isDemoProject() && editingProject ? (
                        <DropdownMenuItem
                          onClick={() => {
                            setMenuOpen(false);
                            saveProject();
                          }}
                        >
                          Save
                        </DropdownMenuItem>
                      ) : null}
                      {editingProject ? (
                        <DropdownMenuItem
                          onClick={() => {
                            setMenuOpen(false);
                            setShowResetConfirm(true);
                          }}
                        >
                          Reset Project
                        </DropdownMenuItem>
                      ) : null}
                      <div
                        style={{
                          height: 1,
                          backgroundColor: "rgba(255, 255, 255, 0.06)",
                          margin: "4px 0",
                        }}
                      />
                      <DropdownMenuItem
                        onClick={() => {
                          setMenuOpen(false);
                          window.open("https://github.com/jtCodes/lyrictor");
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <img src={githubIcon} height={16} width={16} />
                          Support
                        </span>
                      </DropdownMenuItem>
                      <div
                        style={{
                          height: 1,
                          backgroundColor: "rgba(255, 255, 255, 0.06)",
                          margin: "4px 0",
                        }}
                      />
                      {authUser ? (
                        <DropdownMenuItem
                          onClick={() => {
                            setMenuOpen(false);
                            auth.signOut();
                          }}
                        >
                          Sign out ({authUser.displayName ?? authUser.email})
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => {
                            setMenuOpen(false);
                            signInWithPopup(auth, googleProvider).catch(() => {});
                          }}
                        >
                          Sign in with Google
                        </DropdownMenuItem>
                      )}
                    </div>
                  </>
                )}
              </div>
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

function DropdownMenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        padding: "9px 14px",
        background: "none",
        border: "none",
        color: "rgba(255, 255, 255, 0.72)",
        fontSize: 13,
        textAlign: "left",
        cursor: "pointer",
        transition: "background-color 0.12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {children}
    </button>
  );
}
