import LyricPreview from "../../Editor/Lyrics/LyricPreview/LyricPreview";
import { View, Flex, Slider, ProgressCircle, ActionButton, Text } from "@adobe/react-spectrum";
import { useProjectStore } from "../store";
import { Project, ProjectDetail } from "../types";
import { useState, useEffect, useRef } from "react";
import { useAudioPlayer, useAudioPosition } from "react-use-audio-player";
import FullScreenButton from "../../Editor/AudioTimeline/Tools/FullScreenButton";
import PlayPauseButton from "../../Editor/AudioTimeline/PlayBackControls";
import formatDuration from "format-duration";
import EditProjectButton from "../EditProjectButton";
import { isMobile } from "../../utils";
import { useNavigate } from "react-router-dom";
import { publishedProjectPath } from "../utils";
import { Howler } from "howler";
import { useAuthStore } from "../../Auth/store";
import Visibility from "@spectrum-icons/workflow/Visibility";
import { motion, AnimatePresence } from "framer-motion";
import ImmersiveLoadingIndicator from "../../components/ImmersiveLoadingIndicator";
import {
  getProjectPlaybackUrl,
  getProjectSourcePluginForProject,
} from "../sourcePlugins";
import { useResolvedProjectPlayback } from "../sourcePlugins/useResolvedProjectPlayback";
import { usePlaybackOverlayVisibility } from "../usePlaybackOverlayVisibility";

function getProjectSelectionKey(projectDetail?: ProjectDetail) {
  if (!projectDetail) {
    return "";
  }

  return `${projectDetail.name}:${projectDetail.audioFileUrl}`;
}

export default function FeaturedProject({
  maxWidth,
  maxHeight,
}: {
  maxWidth: number;
  maxHeight: number;
}) {
  const editingProject = useProjectStore((state) => state.editingProject);
  const projectActionMessage = useProjectStore(
    (state) => state.projectActionMessage
  );
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setImageItems = useProjectStore((state) => state.setImages);
  const markAsSaved = useProjectStore((state) => state.markAsSaved);
  const autoPlayRequested = useProjectStore((state) => state.autoPlayRequested);
  const setAutoPlayRequested = useProjectStore((state) => state.setAutoPlayRequested);
  const [projectLoading, setProjectLoading] = useState<boolean>(true);
  const pendingAutoPlayProjectKeyRef = useRef<string | null>(null);
  const activeProjectSelectionKeyRef = useRef("");
  const { resolvedProjectDetail, playbackUrl, handlePlaybackLoadError } = useResolvedProjectPlayback(
    editingProject,
    setEditingProject
  );
  const projectToRender = resolvedProjectDetail ?? editingProject;
  const projectSelectionKey = getProjectSelectionKey(projectToRender);
  const sourcePlugin = projectToRender
    ? getProjectSourcePluginForProject(projectToRender)
    : undefined;
  const isYouTubeProject = sourcePlugin?.id === "youtube";
  const shouldWaitForYouTubeSource = Boolean(projectToRender && isYouTubeProject && !playbackUrl);
  const shouldAutoPlayCurrentProject =
    Boolean(projectSelectionKey) &&
    pendingAutoPlayProjectKeyRef.current === projectSelectionKey;

  useEffect(() => {
    if (!projectSelectionKey) {
      activeProjectSelectionKeyRef.current = "";
      return;
    }

    if (activeProjectSelectionKeyRef.current === projectSelectionKey) {
      return;
    }

    activeProjectSelectionKeyRef.current = projectSelectionKey;
    Howler.stop();
  }, [projectSelectionKey]);

  useEffect(() => {
    if (!projectSelectionKey) {
      pendingAutoPlayProjectKeyRef.current = null;
      return;
    }

    if (autoPlayRequested) {
      pendingAutoPlayProjectKeyRef.current = projectSelectionKey;
    }
  }, [autoPlayRequested, projectSelectionKey]);

  useEffect(() => {
    if (!editingProject) {
      const fetchData = async () => {
        try {
          const response = await fetch(
            "https://firebasestorage.googleapis.com/v0/b/angelic-phoenix-314404.appspot.com/o/featured.json?alt=media"
          );
          const project: Project = await response.json();
          setEditingProject(project.projectDetail as unknown as ProjectDetail);
          setLyricReference(project.lyricReference);
          setLyricTexts(project.lyricTexts);
          setImageItems(project.images ?? []);
          markAsSaved();
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setProjectLoading(false);
        }
      };

      fetchData();
    } else {
      setProjectLoading(false);
    }
  }, [editingProject]);
  const sourceLoadingMessage = shouldWaitForYouTubeSource
    ? projectActionMessage ?? "Loading audio..."
    : undefined;

  return (
    <View
      position={"relative"}
      height={maxHeight}
      width={maxWidth}
      overflow={"hidden"}
      UNSAFE_style={{
        borderRadius: 8,
        boxShadow:
          "inset 0 0 0 1px rgba(255, 255, 255, 0.08), rgba(100, 100, 111, 0.2) 0px 7px 29px 0px",
      }}
    >
      <AnimatePresence mode="wait">
        {!projectLoading && projectToRender ? (
          <motion.div
            key={projectSelectionKey || "player"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            style={{ width: "100%", height: "100%" }}
          >
            <View overflow={"hidden"} position={"absolute"}>
              <LyricPreview
                maxHeight={maxHeight}
                maxWidth={maxWidth}
                isEditMode={false}
                editingMode={projectToRender.editingMode}
              />
            </View>
            {!shouldWaitForYouTubeSource && playbackUrl ? (
              <PreviewPlayer
                key={`${projectSelectionKey}:${playbackUrl}`}
                maxWidth={maxWidth}
                maxHeight={maxHeight}
                playbackUrl={playbackUrl}
                projectDetail={projectToRender}
                shouldAutoPlay={shouldAutoPlayCurrentProject}
                onPlaybackLoadError={handlePlaybackLoadError}
                onAutoPlayConsumed={() => {
                  pendingAutoPlayProjectKeyRef.current = null;
                  setAutoPlayRequested(false);
                }}
              />
            ) : null}
            {sourceLoadingMessage ? (
              <ImmersiveLoadingIndicator
                title="Preparing Preview"
                message={sourceLoadingMessage}
              />
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.06, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "auto",
            }}
          >
            <ImmersiveLoadingIndicator
              overlay={false}
              title="Preparing Preview"
              message="Loading project..."
            />
          </motion.div>
        )}
      </AnimatePresence>
    </View>
  );
}

function PreviewPlayer({
  maxHeight,
  maxWidth,
  playbackUrl,
  projectDetail,
  shouldAutoPlay,
  onPlaybackLoadError,
  onAutoPlayConsumed,
}: {
  maxHeight: number;
  maxWidth: number;
  playbackUrl: string;
  projectDetail: ProjectDetail;
  shouldAutoPlay: boolean;
  onPlaybackLoadError: () => void | Promise<void>;
  onAutoPlayConsumed: () => void;
}) {
  const playerRef = useRef<any>(null);
  const autoPlayOnLoadRef = useRef(shouldAutoPlay);
  const shouldUseHtml5Playback =
    /(^https?:\/\/.*googlevideo\.com\/)|(^https?:\/\/.*youtube\.com\/)/i.test(playbackUrl);

  useEffect(() => {
    autoPlayOnLoadRef.current = shouldAutoPlay;
  }, [shouldAutoPlay]);

  const { togglePlayPause, ready, loading, playing, player } = useAudioPlayer({
    src: playbackUrl,
    format: ["webm", "m4a", "mp3", "wav", "ogg"],
    html5: shouldUseHtml5Playback,
    autoplay: false,
    onloaderror: async (_id, error) => {
      console.log(" load error", error);
      await onPlaybackLoadError();
    },
    onload: () => {
      if (autoPlayOnLoadRef.current) {
        autoPlayOnLoadRef.current = false;
        onAutoPlayConsumed();
        requestAnimationFrame(() => {
          playerRef.current?.play();
        });
      }
    },
    onend: () => console.log("sound has ended!"),
  });

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const playerOverlayMessage = loading && !ready ? "Loading audio..." : undefined;

  return (
    <>
      {playerOverlayMessage ? (
        <ImmersiveLoadingIndicator
          title="Preparing Preview"
          message={playerOverlayMessage}
        />
      ) : null}
      <PlaybackControlsOverlay
        maxWidth={maxWidth}
        maxHeight={maxHeight}
        loading={loading}
        playing={playing}
        togglePlayPause={togglePlayPause}
        projectDetail={projectDetail}
      />
    </>
  );
}

function PlaybackControlsOverlay({
  maxHeight,
  maxWidth,
  loading,
  playing,
  togglePlayPause,
  projectDetail,
}: {
  maxHeight: number;
  maxWidth: number;
  loading: boolean;
  playing: boolean;
  togglePlayPause: () => void;
  projectDetail: ProjectDetail;
}) {
  const { percentComplete, duration, seek, position } = useAudioPosition({
    highRefreshRate: false,
  });
  const existingProjects = useProjectStore((state) => state.existingProjects);
  const authUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const currentProject = existingProjects.find(
    (p) => p.projectDetail.name === projectDetail.name
  );
  const isOtherUsersPublished =
    currentProject &&
    (currentProject as any).uid &&
    (!authUser || (currentProject as any).uid !== authUser.uid);
  const [seekerPosition, setSeekerPosition] = useState(0);
  const {
    controlsVisible,
    isOverlayHidden,
    showControls,
    handleMouseLeave,
    handleMouseMove,
    handleBackgroundTouchEnd,
    handleBackgroundClick,
  } = usePlaybackOverlayVisibility(playing, {
    hideByDefault: true,
    revealWhenPaused: true,
    suppressRevealWhileLoading: true,
    loading,
  });

  useEffect(() => {
    setSeekerPosition((percentComplete / 100) * duration);
  }, [position, maxWidth]);

  return (
    <div
      style={{
        position: "relative",
        height: maxHeight,
        width: maxWidth,
        cursor: isOverlayHidden ? "none" : undefined,
        zIndex: 20,
        touchAction: "manipulation",
      }}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "auto",
        }}
        onTouchEnd={handleBackgroundTouchEnd}
        onClick={handleBackgroundClick}
      />
      <View
        UNSAFE_style={{
          position: "absolute",
          height: maxHeight,
          width: maxWidth,
          backgroundColor: "rgba(0,0,0,0.3)",
          opacity: controlsVisible ? 1 : 0,
          transition: "opacity 0.2s ease-in-out",
          pointerEvents: "none",
        }}
      >
        <View
          UNSAFE_style={{
            position: "absolute",
            top: isMobile ? 8 : 5,
            right: 8,
            pointerEvents: controlsVisible ? "auto" : "none",
            zIndex: 5,
          }}
        >
          <Flex direction="row" alignItems="center" gap="size-50" UNSAFE_style={{ transform: "scale(0.85)" }}>
            {currentProject && (
              <ActionButton
                aria-label="View"
                isQuiet
                onPress={() => navigate(publishedProjectPath(currentProject.id))}
              >
                <Visibility />
                <Text>View</Text>
              </ActionButton>
            )}
            {!isOtherUsersPublished && <EditProjectButton />}
            {!isMobile ? <FullScreenButton /> : null}
          </Flex>
        </View>
        <View
          UNSAFE_style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: controlsVisible ? "auto" : "none",
            zIndex: 4,
          }}
        >
          <PlayPauseButton
            isPlaying={playing}
            onPlayPauseClicked={() => togglePlayPause()}
          />
        </View>
        <View
          UNSAFE_style={{
            position: "absolute",
            bottom: isMobile ? 68 : 55,
            left: 20,
            right: isMobile ? 20 : 132,
            pointerEvents: controlsVisible ? "auto" : "none",
            fontSize: isMobile ? 12 : 14,
            opacity: 0.9,
            fontWeight: "bold",
            lineHeight: 1.2,
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.6)",
            textAlign: "left",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <span
            onClick={() => {
              const project = existingProjects.find(
                (p) => p.projectDetail.name === projectDetail.name
              );
              if (project) navigate(publishedProjectPath(project.id));
              showControls();
            }}
            style={{ cursor: "pointer" }}
          >
            {projectDetail.name}
          </span>
        </View>
        <View
          UNSAFE_style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            pointerEvents: controlsVisible ? "auto" : "none",
            zIndex: 3,
          }}
        >
          <Slider
            aria-label="Audio preview position"
            value={seekerPosition}
            maxValue={duration}
            showValueLabel={false}
            defaultValue={0}
            step={1}
            isFilled
            width={maxWidth - 40}
            onChangeEnd={(value) => {
              seek(value);
              showControls();
            }}
          />
        </View>
        <View
          UNSAFE_style={{
            position: "absolute",
            bottom: 15,
            left: 20,
            pointerEvents: controlsVisible ? "auto" : "none",
            fontSize: 10,
            opacity: 0.9,
          }}
        >
          {formatDuration((percentComplete / 100) * duration * 1000)}
        </View>
        <View
          UNSAFE_style={{
            position: "absolute",
            bottom: 15,
            right: 20,
            pointerEvents: controlsVisible ? "auto" : "none",
            fontSize: 10,
            opacity: 0.9,
          }}
        >
          -{formatDuration((1 - percentComplete / 100) * duration * 1000)}
        </View>
      </View>
    </div>
  );
}
