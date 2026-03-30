import { View, Flex, ActionButton, Text } from "@adobe/react-spectrum";
import { useProjectStore } from "../store";
import { EditingMode, Project, ProjectDetail } from "../types";
import { useState, useEffect, useRef } from "react";
import { useAudioPlayer } from "react-use-audio-player";
import FullScreenButton from "../../Editor/AudioTimeline/Tools/FullScreenButton";
import EditProjectButton from "../EditProjectButton";
import { isMobile } from "../../utils";
import { useNavigate } from "react-router-dom";
import { localPreviewProjectPath, publishedProjectPath } from "../utils";
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
import ProjectPreviewSurface from "../ProjectPreviewSurface";
import ProjectPlaybackControlsOverlay from "../ProjectPlaybackControlsOverlay";

function getProjectSelectionKey(projectDetail?: ProjectDetail) {
  if (!projectDetail) {
    return "";
  }

  return `${projectDetail.name}:${projectDetail.audioFileUrl}`;
}

export default function FeaturedProject({
  maxWidth,
  maxHeight,
  initialProject,
}: {
  maxWidth: number;
  maxHeight: number;
  initialProject?: Project;
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
    if (editingProject) {
      setProjectLoading(false);
      return;
    }

    if (!initialProject) {
      return;
    }

    setEditingProject(initialProject.projectDetail as unknown as ProjectDetail);
    setLyricReference(initialProject.lyricReference);
    setLyricTexts(initialProject.lyricTexts);
    setImageItems(initialProject.images ?? []);
    markAsSaved();
    setProjectLoading(false);
  }, [editingProject, initialProject, markAsSaved, setEditingProject, setImageItems, setLyricReference, setLyricTexts]);
  const sourceLoadingMessage = shouldWaitForYouTubeSource
    ? projectActionMessage ?? "Loading audio..."
    : undefined;

  return (
    <ProjectPreviewSurface
      width={maxWidth}
      height={maxHeight}
      editingMode={
        projectToRender?.editingMode ??
        editingProject?.editingMode ??
        EditingMode.free
      }
      resolution={projectToRender?.resolution ?? editingProject?.resolution}
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
            <AnimatePresence>
              {sourceLoadingMessage ? (
                <ImmersiveLoadingIndicator
                  title="Preparing Preview"
                  message={sourceLoadingMessage}
                />
              ) : null}
            </AnimatePresence>
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
    </ProjectPreviewSurface>
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
      <AnimatePresence>
        {playerOverlayMessage ? (
          <ImmersiveLoadingIndicator
            title="Preparing Preview"
            message={playerOverlayMessage}
          />
        ) : null}
      </AnimatePresence>
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
  const existingProjects = useProjectStore((state) => state.existingProjects);
  const setPreviewProject = useProjectStore((state) => state.setPreviewProject);
  const authUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const currentProject = existingProjects.find(
    (p) => p.projectDetail.name === projectDetail.name
  );
  const isOtherUsersPublished =
    currentProject &&
    (currentProject as any).uid &&
    (!authUser || (currentProject as any).uid !== authUser.uid);
  const isPublished = Boolean((currentProject as any)?.publishedAt);
  const hasDemoInName = projectDetail.name.includes("(Demo)");
  const isOwnUnpublishedProject = Boolean(
    currentProject &&
      authUser &&
      ((currentProject as any).uid === authUser.uid ||
        (!isPublished && !hasDemoInName && currentProject.source !== "demo"))
  );

  function navigateToProjectView() {
    if (!currentProject) {
      return;
    }

    if (isOwnUnpublishedProject) {
      setPreviewProject(currentProject);
      navigate(localPreviewProjectPath());
      return;
    }

    navigate(publishedProjectPath(currentProject.id));
  }

  return (
    <ProjectPlaybackControlsOverlay
      width={maxWidth}
      height={maxHeight}
      loading={loading}
      playing={playing}
      togglePlayPause={togglePlayPause}
      projectName={projectDetail.name}
      titleOnClick={() => {
        navigateToProjectView();
      }}
      overlayOptions={{
        hideByDefault: true,
        revealWhenPaused: true,
        suppressRevealWhileLoading: true,
      }}
      topRightContent={
        <Flex direction="row" alignItems="center" gap="size-50" UNSAFE_style={{ transform: "scale(0.85)" }}>
          {currentProject ? (
            <ActionButton
              aria-label="View"
              isQuiet
              onPress={() => navigateToProjectView()}
            >
              <Visibility />
              <Text>View</Text>
            </ActionButton>
          ) : null}
          {!isOtherUsersPublished ? <EditProjectButton /> : null}
          {!isMobile ? <FullScreenButton /> : null}
        </Flex>
      }
    />
  );
}
