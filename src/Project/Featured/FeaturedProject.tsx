import LyricPreview from "../../Editor/Lyrics/LyricPreview/LyricPreview";
import { View } from "@adobe/react-spectrum";
import { useProjectStore } from "../store";
import { Project, ProjectDetail } from "../types";
import { useState, useEffect } from "react";
import { useAudioPlayer } from "react-use-audio-player";

export default function FeaturedProject() {
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
    <div>
      <button onClick={() => togglePlayPause()}>Play</button>
      <View borderRadius={"medium"} overflow={"hidden"}>
        <LyricPreview maxHeight={281} maxWidth={500} />
      </View>
    </div>
  );
}
