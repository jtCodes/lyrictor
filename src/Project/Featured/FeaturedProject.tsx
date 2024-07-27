import LyricPreview from "../../Editor/Lyrics/LyricPreview/LyricPreview";
import { View, Flex } from "@adobe/react-spectrum";
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

  if (projectLoading) {
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
      />
    </View>
  );
}

function PlaybackControlsOverlay({
  maxHeight,
  maxWidth,
  playing,
  togglePlayPause,
}: {
  maxHeight: number;
  maxWidth: number;
  playing: boolean;
  togglePlayPause: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{ position: "relative", height: maxHeight, width: maxWidth }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {(isHovered || !playing) && (
        <View
          position={"absolute"}
          height={maxHeight}
          width={maxWidth}
          UNSAFE_style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        >
          <View
            position={"absolute"}
            left={"calc(50% - 16px)"}
            top={"calc(50% - 16px)"}
          >
            <PlayPauseButton
              isPlaying={playing}
              onPlayPauseClicked={() => togglePlayPause()}
            />
          </View>
          <View position={"absolute"} bottom={5} right={5}>
            <FullScreenButton />
          </View>
        </View>
      )}
    </div>
  );
}
