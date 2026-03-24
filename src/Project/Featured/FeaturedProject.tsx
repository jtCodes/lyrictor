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
  const [streamingUrl, setStreamingUrl] = useState("");
  const autoPlayRef = useRef(false);
  const previousStreamingUrlRef = useRef("");

  const {
    togglePlayPause,
    ready,
    loading,
    playing,
    pause,
    player,
    load,
    volume,
  } = useAudioPlayer({
    src: streamingUrl,
    format: ["mp3"],
    autoplay: false,
    onloaderror: (id, error) => {
      console.log(" load error", error);
    },
    onload: () => {
      console.log("on load");
    },
    onend: () => console.log("sound has ended!"),
  });

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
          setStreamingUrl(project.projectDetail.audioFileUrl);
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

  // When editingProject changes (e.g. card click), stop all audio first, then update the URL
  useEffect(() => {
    if (editingProject?.audioFileUrl) {
      Howler.stop();
      previousStreamingUrlRef.current = streamingUrl;
      if (autoPlayRequested) {
        setAutoPlayRequested(false);
        const sameUrl = streamingUrl === editingProject.audioFileUrl;
        if (sameUrl && ready) {
          // Same audio URL already loaded — play immediately
          player?.play();
        } else {
          autoPlayRef.current = true;
          setStreamingUrl(editingProject.audioFileUrl);
        }
      } else {
        setStreamingUrl(editingProject.audioFileUrl);
      }
    }
  }, [editingProject?.audioFileUrl, editingProject?.name]);

  // Autoplay after the new audio is loaded and ready
  useEffect(() => {
    if (ready && autoPlayRef.current) {
      autoPlayRef.current = false;
      player?.play();
    }
  }, [ready, player]);

  const showAudioLoadingOverlay =
    !projectLoading &&
    Boolean(editingProject?.audioFileUrl) &&
    (loading || (streamingUrl !== previousStreamingUrlRef.current && !ready));
  const playerOverlayMessage = projectActionMessage ?? (showAudioLoadingOverlay ? "Loading audio..." : undefined);

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
        {!projectLoading && editingProject ? (
          <motion.div
            key="player"
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
                editingMode={editingProject.editingMode}
              />
            </View>
            <AnimatePresence>
              {playerOverlayMessage ? (
                <motion.div
                  key={projectActionMessage ? "project-action" : "audio-loading"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.08, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "radial-gradient(circle at center, rgba(5, 5, 7, 0.08) 0%, rgba(5, 5, 7, 0.28) 68%, rgba(5, 5, 7, 0.42) 100%)",
                    pointerEvents: "none",
                    zIndex: 3,
                  }}
                >
                  <Flex direction="column" alignItems="center" gap="size-150">
                    <ProgressCircle aria-label={playerOverlayMessage} isIndeterminate size="M" />
                    <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.82)", fontSize: 12 }}>
                      {playerOverlayMessage}
                    </Text>
                  </Flex>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <PlaybackControlsOverlay
              maxWidth={maxWidth}
              maxHeight={maxHeight}
              playing={playing}
              togglePlayPause={togglePlayPause}
              projectDetail={editingProject}
            />
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
            <ProgressCircle aria-label="Loading…" isIndeterminate />
          </motion.div>
        )}
      </AnimatePresence>
    </View>
  );
}

function PlaybackControlsOverlay({
  maxHeight,
  maxWidth,
  playing,
  togglePlayPause,
  projectDetail,
}: {
  maxHeight: number;
  maxWidth: number;
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
  const [isOverlayHidden, setIsOverlayHidden] = useState(false);
  const timer = useRef<any>(null);
  const DELAY = 2.5;
  const controlsVisible = isMobile ? true : !isOverlayHidden || !playing;

  useEffect(() => {
    setSeekerPosition((percentComplete / 100) * duration);
  }, [position, maxWidth]);

  useEffect(() => {
    return () => {
      clearInterval(timer.current);
    };
  }, []);

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
      onMouseLeave={() => {
        if (isMobile) {
          return;
        }
        clearInterval(timer.current);
        setIsOverlayHidden(true);
      }}
      onMouseMove={() => {
        if (isMobile) {
          return;
        }
        setIsOverlayHidden(false);
        clearInterval(timer.current);
        timer.current = setInterval(() => {
          setIsOverlayHidden(true);
        }, DELAY * 1000);
      }}
    >
      <View
        UNSAFE_style={{
          position: "absolute",
          height: maxHeight,
          width: maxWidth,
          backgroundColor: "rgba(0,0,0,0.3)",
          opacity: controlsVisible ? 1 : 0,
          transition: "opacity 0.2s ease-in-out",
          pointerEvents: controlsVisible ? "auto" : "none",
        }}
      >
        <View
          UNSAFE_style={{
            position: "absolute",
            top: isMobile ? 8 : 5,
            right: 8,
            pointerEvents: "auto",
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
            pointerEvents: "auto",
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
            pointerEvents: "auto",
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
            pointerEvents: "auto",
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
            }}
          />
        </View>
        <View
          UNSAFE_style={{
            position: "absolute",
            bottom: 15,
            left: 20,
            pointerEvents: "auto",
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
            pointerEvents: "auto",
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
