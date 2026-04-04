import { useEffect, useMemo, useRef, useState } from "react";
import { Flex, View } from "@adobe/react-spectrum";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useAudioPlayer } from "react-use-audio-player";
import { resolveEditingProjectAccess, useProjectStore } from "./store";
import { Project, ProjectDetail } from "./types";
import { isMobile, useIsFullscreen, useWindowSize } from "../utils";
import PlayPauseButton from "../Editor/AudioTimeline/PlayBackControls";
import FullScreenButton from "../Editor/AudioTimeline/Tools/FullScreenButton";
import { Howler } from "howler";
import { loadPublishedProject } from "./firestoreProjectService";
import { getProjectSourcePluginForProject } from "./sourcePlugins";
import { useResolvedProjectPlayback } from "./sourcePlugins/useResolvedProjectPlayback";
import ImmersiveLoadingIndicator from "../components/ImmersiveLoadingIndicator";
import PageNavbar from "../components/PageNavbar";
import { useAuthStore } from "../Auth/store";
import ProjectInfoSection from "./ProjectInfoSection";
import ProjectPreviewSurface from "./ProjectPreviewSurface";
import ProjectPlaybackControlsOverlay from "./ProjectPlaybackControlsOverlay";
import { useSupportedFontsReady } from "../Editor/Lyrics/LyricPreview/fontLoad";
import EditProjectButton from "./EditProjectButton";
import ImmersiveLyricPreview from "../components/ImmersiveLyricPreview";
import { loadProjectIntoEditor } from "./loadProjectIntoEditor";

const DEMO_PROJECTS_URL =
  "https://firebasestorage.googleapis.com/v0/b/angelic-phoenix-314404.appspot.com/o/demo_projects.json?alt=media";
const LOCAL_PREVIEW_ROUTE_ID = "local";
const PROJECT_INFO_LAYOUT_GAP = 40;
const PROJECT_INFO_LAYOUT_PADDING = 48;
const MOBILE_PREVIEW_SIDE_PADDING = 12;
const TOP_BAR_RESERVED_HEIGHT = 68;
const CONTENT_BOTTOM_PADDING = 28;
const MIN_PREVIEW_HEIGHT = 360;
const IMMERSIVE_BACKGROUND_PREVIEW_SCALE = 0.08;

export default function PublishedLyrictorPage() {
  const { publishedId } = useParams<{ publishedId: string }>();
  const navigate = useNavigate();
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isFullscreen = useIsFullscreen();

  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const existingProjects = useProjectStore((state) => state.existingProjects);
  const previewProject = useProjectStore((state) => state.previewProject);
  const editingProject = useProjectStore((state) => state.editingProject);
  const projectActionMessage = useProjectStore((state) => state.projectActionMessage);
  const authUser = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [streamingUrl, setStreamingUrl] = useState("");
  const [viewProject, setViewProject] = useState<Project | undefined>();
  const [isContentScrolled, setIsContentScrolled] = useState(false);
  const playerRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const fontsReady = useSupportedFontsReady();
  const { resolvedProjectDetail, playbackUrl, handlePlaybackLoadError } =
    useResolvedProjectPlayback(editingProject, setEditingProject);
  const projectToRender = resolvedProjectDetail ?? editingProject;
  const sourcePlugin = projectToRender
    ? getProjectSourcePluginForProject(projectToRender)
    : undefined;
  const isYouTubeProject = sourcePlugin?.id === "youtube";
  const sourceLoadingMessage =
    projectToRender && isYouTubeProject && !playbackUrl
      ? projectActionMessage ?? "Loading audio..."
      : undefined;
  const isLocalPreview = publishedId === LOCAL_PREVIEW_ROUTE_ID;
  const currentProject = useMemo(() => {
    if (!viewProject) {
      return undefined;
    }

    return (
      existingProjects.find((project) => project.id === viewProject.id) ??
      existingProjects.find(
        (project) => project.projectDetail.name === viewProject.projectDetail.name
      )
    );
  }, [existingProjects, viewProject]);
  const shouldShowEditButton = Boolean(isLocalPreview || currentProject || viewProject);
  const shouldShowProjectInfo = Boolean(
    !isFullscreen &&
      resolvedProjectDetail &&
      viewProject
  );
  const shouldUseDesktopProjectInfoLayout = Boolean(
    shouldShowProjectInfo && !isMobile
  );

  const { togglePlayPause, ready, loading: audioLoading, playing, player } = useAudioPlayer({
    src: streamingUrl,
    format: ["mp3"],
    autoplay: false,
    onloaderror: async () => {
      await handlePlaybackLoadError();
    },
    onend: () => {
      playerRef.current?.seek(0);
      playerRef.current?.play();
    },
  });

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const previewLoadingMessage = !fontsReady
    ? "Loading fonts..."
    : audioLoading && !ready
      ? "Loading audio..."
      : sourceLoadingMessage;
  const isPreviewLoading = !fontsReady || (audioLoading && !ready) || Boolean(sourceLoadingMessage);

  const previewSize = useMemo(() => {
    const w = windowWidth ?? 1;
    const h = windowHeight ?? 1;

    if (isFullscreen) {
      return { width: w, height: h };
    }

    const availableHeight = Math.max(
      1,
      h - TOP_BAR_RESERVED_HEIGHT - CONTENT_BOTTOM_PADDING
    );

    const availableWidth = shouldUseDesktopProjectInfoLayout
      ? w - PROJECT_INFO_LAYOUT_PADDING * 2
      : w - MOBILE_PREVIEW_SIDE_PADDING * 2;
    const minPreviewWidth = isMobile ? 0 : (MIN_PREVIEW_HEIGHT * 16) / 9;
    const minPreviewHeight = isMobile ? 0 : MIN_PREVIEW_HEIGHT;

    const preferredHeight = Math.max(minPreviewHeight, availableHeight * 0.78);
    const preferredWidth = (preferredHeight * 16) / 9;
    const width = Math.min(availableWidth, Math.max(minPreviewWidth, preferredWidth));

    return {
      width,
      height: (width * 9) / 16,
    };
  }, [isFullscreen, shouldUseDesktopProjectInfoLayout, windowWidth, windowHeight]);

  useEffect(() => {
    const isLocalPreviewRoute = publishedId === LOCAL_PREVIEW_ROUTE_ID;

    const syncProjectState = async () => {
      if (isLocalPreviewRoute) {
        if (!previewProject) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setLoading(false);
        setNotFound(false);
        Howler.stop();
        setViewProject(previewProject);
        await loadProjectIntoEditor(previewProject, {
          projectDetail: previewProject.projectDetail as unknown as ProjectDetail,
          requestAutoPlay: false,
        });
        return;
      }

      if (!publishedId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setNotFound(false);

      try {
        // Try demo projects first
        const response = await fetch(DEMO_PROJECTS_URL);
        const projects: Project[] = await response.json();
        let project = projects.find((p) => p.id === publishedId);

        // Fall back to Firestore published collection
        if (!project) {
          project = (await loadPublishedProject(publishedId)) ?? undefined;
        }

        if (!project) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        Howler.stop();
        setViewProject(project);
        await loadProjectIntoEditor(project, {
          projectDetail: project.projectDetail as unknown as ProjectDetail,
          requestAutoPlay: false,
        });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    void syncProjectState();
  }, [previewProject, publishedId, setEditingProject]);

  useEffect(() => {
    if (playbackUrl) {
      Howler.stop();
      setStreamingUrl(playbackUrl);
    }
  }, [playbackUrl]);

  useEffect(() => {
    if (isFullscreen) {
      setIsContentScrolled(false);
      return;
    }

    const scrollNode = scrollContainerRef.current;
    if (!scrollNode) {
      return;
    }

    setIsContentScrolled(scrollNode.scrollTop > 4);
  }, [isFullscreen, loading, previewSize.height, shouldUseDesktopProjectInfoLayout, windowWidth, windowHeight]);

  function handleBackNavigation() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  }

  if (notFound) {
    return (
      <View backgroundColor="gray-50" height="100vh">
        <PageNavbar onBack={handleBackNavigation} showProfile={false} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "rgba(255, 255, 255, 0.4)",
            fontSize: 15,
          }}
        >
          Lyrictor not found
        </div>
      </View>
    );
  }

  return (
    <View
      backgroundColor="gray-50"
      height="100vh"
      overflow="hidden"
      position="relative"
    >
      {/* Immersive background */}
      <ImmersiveBackground
        width={Math.max(windowWidth ?? 0, 1)}
        height={Math.max(windowHeight ?? 0, 1)}
        resolution={projectToRender?.resolution}
        editingMode={projectToRender?.editingMode}
      />

      {/* Top bar */}
      {!isFullscreen ? (
        <>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 52,
              pointerEvents: "none",
              zIndex: 9,
              opacity: isContentScrolled ? 1 : 0,
              transition: "opacity 0.18s ease-out",
              background:
                "linear-gradient(to bottom, rgba(15, 17, 20, 0.78) 0%, rgba(15, 17, 20, 0.56) 22%, rgba(15, 17, 20, 0.3) 46%, rgba(15, 17, 20, 0.14) 68%, rgba(15, 17, 20, 0.05) 84%, rgba(15, 17, 20, 0.015) 94%, rgba(15, 17, 20, 0) 100%)",
            }}
          />
          <PageNavbar onBack={handleBackNavigation} />
        </>
      ) : null}

      {/* Main content */}
      <div
        ref={scrollContainerRef}
        onScroll={(event) => {
          setIsContentScrolled(event.currentTarget.scrollTop > 4);
        }}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          overflowY: isFullscreen ? "hidden" : "auto",
          overflowX: isFullscreen ? "hidden" : "auto",
          paddingTop: isFullscreen ? 0 : TOP_BAR_RESERVED_HEIGHT,
          paddingBottom: isFullscreen ? 0 : CONTENT_BOTTOM_PADDING,
          paddingLeft: shouldUseDesktopProjectInfoLayout ? PROJECT_INFO_LAYOUT_PADDING : 0,
          paddingRight: shouldUseDesktopProjectInfoLayout ? PROJECT_INFO_LAYOUT_PADDING : 0,
          boxSizing: "border-box",
          WebkitMaskImage:
            !isFullscreen && isContentScrolled
              ? "linear-gradient(to bottom, transparent 0px, rgba(0, 0, 0, 0.12) 10px, rgba(0, 0, 0, 0.28) 20px, rgba(0, 0, 0, 0.55) 30px, rgba(0, 0, 0, 0.82) 40px, black 52px, black 100%)"
              : undefined,
          maskImage:
            !isFullscreen && isContentScrolled
              ? "linear-gradient(to bottom, transparent 0px, rgba(0, 0, 0, 0.12) 10px, rgba(0, 0, 0, 0.28) 20px, rgba(0, 0, 0, 0.55) 30px, rgba(0, 0, 0, 0.82) 40px, black 52px, black 100%)"
              : undefined,
        }}
      >
        <div
          style={{
            minHeight: isFullscreen
              ? "100%"
              : `calc(100vh - ${TOP_BAR_RESERVED_HEIGHT + CONTENT_BOTTOM_PADDING}px)`,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: isFullscreen ? "center" : "flex-start",
          }}
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="published-loading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <ImmersiveLoadingIndicator
                  overlay={false}
                  title="Preparing Preview"
                  message="Loading project..."
                />
              </motion.div>
            ) : resolvedProjectDetail ? (
              <motion.div
                key="published-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: shouldShowProjectInfo
                    ? isMobile
                      ? 18
                      : PROJECT_INFO_LAYOUT_GAP
                    : 0,
                  width: "100%",
                  maxWidth: previewSize.width,
                }}
              >
                <ProjectPreviewSurface
                  width={previewSize.width}
                  height={previewSize.height}
                  editingMode={resolvedProjectDetail.editingMode}
                  resolution={resolvedProjectDetail.resolution}
                  isFullscreen={isFullscreen}
                >
                  <AnimatePresence>
                    {previewLoadingMessage ? (
                      <ImmersiveLoadingIndicator
                        title="Preparing Preview"
                        message={previewLoadingMessage}
                      />
                    ) : null}
                  </AnimatePresence>
                  <PlayerOverlay
                    width={previewSize.width}
                    height={previewSize.height}
                    isFullscreen={isFullscreen}
                    showEditButton={shouldShowEditButton}
                    loading={isPreviewLoading}
                    playing={playing}
                    togglePlayPause={() => {
                      if (isPreviewLoading) {
                        return;
                      }

                      togglePlayPause();
                    }}
                  />
                </ProjectPreviewSurface>
                {shouldShowProjectInfo && resolvedProjectDetail && viewProject ? (
                  <ProjectInfoSection
                    project={viewProject}
                    projectDetail={resolvedProjectDetail}
                    isLocalPreview={isLocalPreview}
                    compact={true}
                    width={previewSize.width}
                  />
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </View>
  );
}

function PlayerOverlay({
  width,
  height,
  isFullscreen,
  showEditButton,
  loading,
  playing,
  togglePlayPause,
}: {
  width: number;
  height: number;
  isFullscreen: boolean;
  showEditButton: boolean;
  loading: boolean;
  playing: boolean;
  togglePlayPause: () => void;
}) {
  return (
    <ProjectPlaybackControlsOverlay
      width={width}
      height={height}
      loading={loading}
      playing={playing}
      togglePlayPause={togglePlayPause}
      topRightContent={
        showEditButton || !isMobile ? (
          <Flex direction="row" alignItems="center" gap="size-50" UNSAFE_style={{ transform: "scale(0.85)" }}>
            {showEditButton ? <EditProjectButton /> : null}
            {!isMobile ? <FullScreenButton /> : null}
          </Flex>
        ) : null
      }
      overlayOptions={
        isFullscreen
          ? {
              hideByDefault: true,
              revealWhenPaused: true,
            }
          : undefined
      }
    />
  );
}

function ImmersiveBackground({
  width,
  height,
  resolution,
  editingMode,
}: {
  width: number;
  height: number;
  resolution?: ProjectDetail["resolution"];
  editingMode?: ProjectDetail["editingMode"];
}) {
  const previewWidth = Math.max(1, width * IMMERSIVE_BACKGROUND_PREVIEW_SCALE);
  const previewHeight = Math.max(1, height * IMMERSIVE_BACKGROUND_PREVIEW_SCALE);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width,
          height,
          transform: "translate(-50%, -50%) scale(2.5)",
          transformOrigin: "center center",
          opacity: 0.35,
          filter: "blur(80px) saturate(1.1)",
          willChange: "transform, opacity",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.3) 70%, transparent 100%)",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.3) 70%, transparent 100%)",
        }}
      >
        <div
          style={{
            width: previewWidth,
            height: previewHeight,
            transform: `scale(${1 / IMMERSIVE_BACKGROUND_PREVIEW_SCALE})`,
            transformOrigin: "top left",
          }}
        >
          <ImmersiveLyricPreview
            maxWidth={previewWidth}
            maxHeight={previewHeight}
            resolution={resolution}
            editingMode={editingMode}
          />
        </div>
      </div>
    </div>
  );
}
