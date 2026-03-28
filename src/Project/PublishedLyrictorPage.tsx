import { useEffect, useState, useMemo } from "react";
import { Flex, View } from "@adobe/react-spectrum";
import { useNavigate, useParams } from "react-router-dom";
import { useAudioPlayer } from "react-use-audio-player";
import LyricPreview from "../Editor/Lyrics/LyricPreview/LyricPreview";
import { useProjectStore } from "./store";
import { Project, ProjectDetail } from "./types";
import { isMobile, useIsFullscreen, useWindowSize } from "../utils";
import PlayPauseButton from "../Editor/AudioTimeline/PlayBackControls";
import FullScreenButton from "../Editor/AudioTimeline/Tools/FullScreenButton";
import ProfileButton from "../Auth/ProfileButton";
import { Howler } from "howler";
import { loadPublishedProject } from "./firestoreProjectService";
import { getProjectSourcePluginForProject } from "./sourcePlugins";
import { useResolvedProjectPlayback } from "./sourcePlugins/useResolvedProjectPlayback";
import ImmersiveLoadingIndicator from "../components/ImmersiveLoadingIndicator";
import ProjectPreviewSurface from "./ProjectPreviewSurface";
import ProjectPlaybackControlsOverlay from "./ProjectPlaybackControlsOverlay";

const DEMO_PROJECTS_URL =
  "https://firebasestorage.googleapis.com/v0/b/angelic-phoenix-314404.appspot.com/o/demo_projects.json?alt=media";
const LOCAL_PREVIEW_ROUTE_ID = "local";
const PROJECT_INFO_SIDEBAR_WIDTH = 320;
const PROJECT_INFO_LAYOUT_GAP = 40;
const PROJECT_INFO_LAYOUT_PADDING = 48;

export default function PublishedLyrictorPage() {
  const { publishedId } = useParams<{ publishedId: string }>();
  const navigate = useNavigate();
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isFullscreen = useIsFullscreen();

  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setImageItems = useProjectStore((state) => state.setImages);
  const previewProject = useProjectStore((state) => state.previewProject);
  const editingProject = useProjectStore((state) => state.editingProject);
  const projectActionMessage = useProjectStore((state) => state.projectActionMessage);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [streamingUrl, setStreamingUrl] = useState("");
  const [viewProject, setViewProject] = useState<Project | undefined>();
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
  const shouldShowProjectInfo = Boolean(
    !isMobile &&
      !isFullscreen &&
      resolvedProjectDetail &&
      viewProject
  );

  const { togglePlayPause, ready, playing, player } = useAudioPlayer({
    src: streamingUrl,
    format: ["mp3"],
    autoplay: false,
    onloaderror: async () => {
      await handlePlaybackLoadError();
    },
  });

  const previewSize = useMemo(() => {
    const w = windowWidth ?? 1;
    const h = windowHeight ?? 1;

    if (isFullscreen) {
      return { width: w, height: h };
    }

    const availableWidth = shouldShowProjectInfo
      ? Math.max(
          1,
          w -
            PROJECT_INFO_LAYOUT_PADDING * 2 -
            PROJECT_INFO_LAYOUT_GAP -
            PROJECT_INFO_SIDEBAR_WIDTH
        )
      : w * 0.9;

    // Use most of the viewport, capped at 16:9
    const maxH = h * 0.75;
    const maxW = (maxH * 16) / 9;
    if (maxW > availableWidth) {
      const adjustedW = availableWidth;
      return { width: adjustedW, height: (adjustedW * 9) / 16 };
    }
    return { width: maxW, height: maxH };
  }, [isFullscreen, shouldShowProjectInfo, windowWidth, windowHeight]);

  useEffect(() => {
    const isLocalPreviewRoute = publishedId === LOCAL_PREVIEW_ROUTE_ID;

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
      setEditingProject(previewProject.projectDetail as unknown as ProjectDetail);
      setLyricReference(previewProject.lyricReference);
      setLyricTexts(previewProject.lyricTexts);
      setImageItems(previewProject.images ?? []);
      return;
    }

    if (!publishedId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const fetchProject = async () => {
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
        setEditingProject(
          project.projectDetail as unknown as ProjectDetail
        );
        setLyricReference(project.lyricReference);
        setLyricTexts(project.lyricTexts);
        setImageItems(project.images ?? []);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [previewProject, publishedId, setEditingProject, setImageItems, setLyricReference, setLyricTexts]);

  useEffect(() => {
    if (playbackUrl) {
      Howler.stop();
      setStreamingUrl(playbackUrl);
    }
  }, [playbackUrl]);

  if (notFound) {
    return (
      <View backgroundColor="gray-50" height="100vh">
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 16,
            zIndex: 10,
          }}
        >
          <BackButton onClick={() => navigate("/")} />
        </div>
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
      />

      {/* Top bar */}
      {!isFullscreen ? (
        <>
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 16,
              zIndex: 10,
            }}
          >
            <BackButton onClick={() => navigate("/")} />
          </div>
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 16,
              zIndex: 10,
            }}
          >
            <ProfileButton />
          </div>
        </>
      ) : null}

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          padding: shouldShowProjectInfo
            ? `0 ${PROJECT_INFO_LAYOUT_PADDING}px`
            : undefined,
          boxSizing: "border-box",
        }}
      >
        {loading ? (
          <ImmersiveLoadingIndicator
            overlay={false}
            title="Preparing Preview"
            message="Loading project..."
          />
        ) : resolvedProjectDetail ? (
          <div
            style={{
              display: "flex",
              flexDirection: shouldShowProjectInfo ? "row" : "column",
              alignItems: shouldShowProjectInfo ? "flex-start" : "center",
              justifyContent: "center",
              gap: shouldShowProjectInfo ? PROJECT_INFO_LAYOUT_GAP : 0,
            }}
          >
            <ProjectPreviewSurface
              width={previewSize.width}
              height={previewSize.height}
              editingMode={resolvedProjectDetail.editingMode}
              isFullscreen={isFullscreen}
            >
              {sourceLoadingMessage ? (
                <ImmersiveLoadingIndicator
                  title="Preparing Preview"
                  message={sourceLoadingMessage}
                />
              ) : null}
              <PlayerOverlay
                width={previewSize.width}
                height={previewSize.height}
                isFullscreen={isFullscreen}
                playing={playing}
                togglePlayPause={togglePlayPause}
              />
            </ProjectPreviewSurface>
            {shouldShowProjectInfo && resolvedProjectDetail && viewProject ? (
              <ProjectInfoSidebar
                project={viewProject}
                projectDetail={resolvedProjectDetail}
                isLocalPreview={isLocalPreview}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </View>
  );
}

function PlayerOverlay({
  width,
  height,
  isFullscreen,
  playing,
  togglePlayPause,
}: {
  width: number;
  height: number;
  isFullscreen: boolean;
  playing: boolean;
  togglePlayPause: () => void;
}) {
  return (
    <ProjectPlaybackControlsOverlay
      width={width}
      height={height}
      playing={playing}
      togglePlayPause={togglePlayPause}
      topRightContent={!isMobile ? <FullScreenButton /> : null}
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

function ProjectInfoSidebar({
  project,
  projectDetail,
  isLocalPreview,
}: {
  project: Project;
  projectDetail: ProjectDetail;
  isLocalPreview: boolean;
}) {
  const extendedProject = project as Project & {
    username?: string;
    publishedAt?: string;
  };
  const subtitle = [projectDetail.songName, projectDetail.artistName]
    .filter(Boolean)
    .join(" • ");
  const sourceLabel = projectDetail.youtubeSourceUrl
    ? "YouTube"
    : projectDetail.appleMusicTrackId
      ? "Apple Music"
      : projectDetail.isLocalUrl
        ? "Local file"
        : "Uploaded audio";
  const updatedLabel = new Date(
    projectDetail.updatedDate ?? projectDetail.createdDate
  ).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      style={{
        width: PROJECT_INFO_SIDEBAR_WIDTH,
        maxWidth: "min(320px, 30vw)",
        minWidth: 260,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        gap: 24,
        textAlign: "left",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.42)",
          }}
        >
          {isLocalPreview
            ? "Local preview"
            : extendedProject.username
              ? `Published by @${extendedProject.username}`
              : "Published preview"}
        </div>
        <div
          style={{
            fontSize: 36,
            lineHeight: 0.95,
            fontWeight: 800,
            color: "rgba(255, 255, 255, 0.94)",
            textWrap: "balance",
            maxWidth: "100%",
          }}
        >
          {projectDetail.name}
        </div>
        {subtitle ? (
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: "rgba(255, 255, 255, 0.68)",
              maxWidth: "100%",
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "84px minmax(0, 1fr)",
          columnGap: 18,
          rowGap: 12,
          alignItems: "baseline",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <div style={{ color: "rgba(255, 255, 255, 0.36)" }}>Source</div>
        <div style={{ color: "rgba(255, 255, 255, 0.82)", textAlign: "left" }}>{sourceLabel}</div>
        <div style={{ color: "rgba(255, 255, 255, 0.36)" }}>Updated</div>
        <div style={{ color: "rgba(255, 255, 255, 0.82)", textAlign: "left" }}>{updatedLabel}</div>
        {projectDetail.youtubeDurationSeconds ? (
          <>
            <div style={{ color: "rgba(255, 255, 255, 0.36)" }}>Length</div>
            <div style={{ color: "rgba(255, 255, 255, 0.82)", textAlign: "left" }}>
              {Math.floor(projectDetail.youtubeDurationSeconds / 60)}:
              {String(projectDetail.youtubeDurationSeconds % 60).padStart(2, "0")}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ImmersiveBackground({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
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
        <LyricPreview maxWidth={width} maxHeight={height} isEditMode={false} />
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        color: "rgba(255, 255, 255, 0.55)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 4px",
        transition: "color 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)";
      }}
    >
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
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Home
    </button>
  );
}
