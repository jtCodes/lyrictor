import LyricPreview from "../../Editor/Lyrics/LyricPreview/LyricPreview";
import { View, Flex, Slider } from "@adobe/react-spectrum";
import { useProjectStore } from "../store";
import { Project, ProjectDetail } from "../types";
import { useState, useEffect } from "react";
import { useAudioPlayer } from "react-use-audio-player";
import FullScreenButton from "../../Editor/AudioTimeline/Tools/FullScreenButton";
import PlayPauseButton from "../../Editor/AudioTimeline/PlayBackControls";

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

  const { togglePlayPause, ready, loading, playing, pause, player, load } =
    useAudioPlayer({
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
  }, []);

  if (projectLoading || !editingProject) {
    return <div>Loading...</div>;
  }

  return (
    <View position={"relative"} height={maxHeight} width={maxWidth}>
      <View borderRadius={"medium"} overflow={"hidden"} position={"absolute"}>
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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{ position: "relative", height: maxHeight, width: maxWidth }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <View
        UNSAFE_style={{
          position: "absolute",
          height: maxHeight,
          width: maxWidth,
          backgroundColor: "rgba(0,0,0,0.3)",
          opacity: isHovered || !playing ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
          pointerEvents: isHovered || !playing ? "auto" : "none",
        }}
      >
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
            bottom: 10,
            left: 20,
            right: 20,
            pointerEvents: "auto",
          }}
        >
          <Slider
            label={projectDetail.name}
            maxValue={1}
            showValueLabel={false}
            defaultValue={0.9}
            step={0.01}
            isFilled
            width={maxWidth - 40}
          />
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
      </View>
    </div>
  );
}
