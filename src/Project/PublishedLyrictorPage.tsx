import { useEffect, useState, useRef, useMemo } from "react";
import { View, Flex, Slider, ProgressCircle } from "@adobe/react-spectrum";
import { useNavigate, useParams } from "react-router-dom";
import { useAudioPlayer, useAudioPosition } from "react-use-audio-player";
import LyricPreview from "../Editor/Lyrics/LyricPreview/LyricPreview";
import { useProjectStore } from "./store";
import { Project, ProjectDetail } from "./types";
import { useWindowSize } from "../utils";
import PlayPauseButton from "../Editor/AudioTimeline/PlayBackControls";
import FullScreenButton from "../Editor/AudioTimeline/Tools/FullScreenButton";
import formatDuration from "format-duration";
import ProfileButton from "../Auth/ProfileButton";
import { Howler } from "howler";
import { loadPublishedProject } from "./firestoreProjectService";

const DEMO_PROJECTS_URL =
  "https://firebasestorage.googleapis.com/v0/b/angelic-phoenix-314404.appspot.com/o/demo_projects.json?alt=media";

export default function PublishedLyrictorPage() {
  const { publishedId } = useParams<{ publishedId: string }>();
  const navigate = useNavigate();
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setImageItems = useProjectStore((state) => state.setImages);
  const editingProject = useProjectStore((state) => state.editingProject);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [streamingUrl, setStreamingUrl] = useState("");

  const { togglePlayPause, ready, playing, player } = useAudioPlayer({
    src: streamingUrl,
    format: ["mp3"],
    autoplay: false,
  });

  const previewSize = useMemo(() => {
    const w = windowWidth ?? 1;
    const h = windowHeight ?? 1;
    // Use most of the viewport, capped at 16:9
    const maxH = h * 0.75;
    const maxW = (maxH * 16) / 9;
    if (maxW > w * 0.9) {
      const adjustedW = w * 0.9;
      return { width: adjustedW, height: (adjustedW * 9) / 16 };
    }
    return { width: maxW, height: maxH };
  }, [windowWidth, windowHeight]);

  useEffect(() => {
    if (!publishedId) return;

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
        setEditingProject(
          project.projectDetail as unknown as ProjectDetail
        );
        setLyricReference(project.lyricReference);
        setLyricTexts(project.lyricTexts);
        setImageItems(project.images ?? []);
        setStreamingUrl(project.projectDetail.audioFileUrl);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [publishedId]);

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
          gap: 0,
        }}
      >
        {loading ? (
          <ProgressCircle aria-label="Loading…" isIndeterminate />
        ) : editingProject ? (
          <View
            position="relative"
            width={previewSize.width}
            height={previewSize.height}
            overflow="hidden"
            UNSAFE_style={{
              borderRadius: 8,
              boxShadow:
                "inset 0 0 0 1px rgba(255, 255, 255, 0.08), rgba(100, 100, 111, 0.2) 0px 7px 29px 0px",
            }}
          >
            <View overflow="hidden" position="absolute">
              <LyricPreview
                maxHeight={previewSize.height}
                maxWidth={previewSize.width}
                isEditMode={false}
                editingMode={editingProject.editingMode}
              />
            </View>
            <PlayerOverlay
              width={previewSize.width}
              height={previewSize.height}
              playing={playing}
              togglePlayPause={togglePlayPause}
              projectName={editingProject.name}
            />
          </View>
        ) : null}
      </div>
    </View>
  );
}

function PlayerOverlay({
  width,
  height,
  playing,
  togglePlayPause,
  projectName,
}: {
  width: number;
  height: number;
  playing: boolean;
  togglePlayPause: () => void;
  projectName: string;
}) {
  const { percentComplete, duration, seek, position } = useAudioPosition({
    highRefreshRate: false,
  });
  const [seekerPosition, setSeekerPosition] = useState(0);
  const [isOverlayHidden, setIsOverlayHidden] = useState(false);
  const timer = useRef<any>(null);
  const DELAY = 2.5;
  const controlsVisible = !isOverlayHidden || !playing;

  useEffect(() => {
    setSeekerPosition((percentComplete / 100) * duration);
  }, [position, width]);

  useEffect(() => {
    return () => clearInterval(timer.current);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        height,
        width,
        cursor: isOverlayHidden ? "none" : undefined,
        zIndex: 20,
      }}
      onMouseLeave={() => {
        clearInterval(timer.current);
        setIsOverlayHidden(true);
      }}
      onMouseMove={() => {
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
          height,
          width,
          backgroundColor: "rgba(0,0,0,0.3)",
          opacity: controlsVisible ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
          pointerEvents: controlsVisible ? "auto" : "none",
        }}
      >
        <View
          UNSAFE_style={{
            position: "absolute",
            top: 5,
            right: 8,
            pointerEvents: "auto",
            zIndex: 5,
          }}
        >
          <FullScreenButton />
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
            bottom: 55,
            left: 20,
            right: 132,
            pointerEvents: "auto",
            fontSize: 14,
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
          {projectName}
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
            aria-label="Audio position"
            value={seekerPosition}
            maxValue={duration}
            showValueLabel={false}
            defaultValue={0}
            step={1}
            isFilled
            width={width - 40}
            onChangeEnd={(value) => seek(value)}
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
        transition: "color 0.15s",
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
