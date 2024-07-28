import LyricPreview from "../../Editor/Lyrics/LyricPreview/LyricPreview";
import { View, Flex, Slider, ProgressCircle } from "@adobe/react-spectrum";
import { useProjectStore } from "../store";
import { Project, ProjectDetail } from "../types";
import { useState, useEffect, useRef } from "react";
import { useAudioPlayer, useAudioPosition } from "react-use-audio-player";
import FullScreenButton from "../../Editor/AudioTimeline/Tools/FullScreenButton";
import PlayPauseButton from "../../Editor/AudioTimeline/PlayBackControls";
import formatDuration from "format-duration";
import EditProjectButton from "../EditProjectButton";

export default function FeaturedProject({
  maxWidth,
  maxHeight,
}: {
  maxWidth: number;
  maxHeight: number;
}) {
  const editingProject = useProjectStore((state) => state.editingProject);
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setImageItems = useProjectStore((state) => state.setImages);
  const [projectLoading, setProjectLoading] = useState<boolean>(true);
  const [streamingUrl, setStreamingUrl] = useState("");

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

  useEffect(() => {
    if (editingProject?.audioFileUrl) {
      setStreamingUrl(editingProject?.audioFileUrl);
    }
  }, [editingProject]);

  return (
    <View
      position={"relative"}
      height={maxHeight}
      width={maxWidth}
      borderWidth="thin"
      borderColor="gray-200"
      borderRadius="medium"
      overflow={"hidden"}
      UNSAFE_style={{
        boxShadow: "rgba(100, 100, 111, 0.2) 0px 7px 29px 0px",
      }}
    >
      {!projectLoading && editingProject ? (
        <>
          <View overflow={"hidden"} position={"absolute"}>
            <LyricPreview
              maxHeight={maxHeight}
              maxWidth={maxWidth}
              isEditMode={false}
            />
          </View>
          <PlaybackControlsOverlay
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            playing={playing}
            togglePlayPause={togglePlayPause}
            projectDetail={editingProject}
          />
        </>
      ) : (
        <View
          UNSAFE_style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "auto",
          }}
        >
          <ProgressCircle aria-label="Loading…" isIndeterminate />
        </View>
      )}
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
  const [seekerPosition, setSeekerPosition] = useState(0);
  const [isOverlayHidden, setIsOverlayHidden] = useState(false);
  const timer = useRef<any>();
  const DELAY = 2.5;

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
          height: maxHeight,
          width: maxWidth,
          backgroundColor: "rgba(0,0,0,0.3)",
          opacity: !isOverlayHidden || !playing ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
          pointerEvents: !isOverlayHidden || !playing ? "auto" : "none",
        }}
      >
        <View
          UNSAFE_style={{
            position: "absolute",
            top: 5,
            right: 45,
            pointerEvents: "auto",
          }}
        >
          <EditProjectButton />
        </View>
        <View
          UNSAFE_style={{
            position: "absolute",
            top: 5,
            right: 5,
            pointerEvents: "auto",
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
            pointerEvents: "auto",
            fontSize: 14,
            opacity: 0.9,
            fontWeight: "bold",
          }}
        >
          {projectDetail.name}
        </View>
        <View
          UNSAFE_style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            pointerEvents: "auto",
          }}
        >
          <Slider
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
