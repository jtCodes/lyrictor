import { Grid, View } from "@adobe/react-spectrum";
import { useAudioPlayer } from "react-use-audio-player";
import AudioTimeline from "./AudioTimeline/AudioTimeline";
import LyricPreview from "./LyricPreview";

export default function LyricEditor() {
  const url: string =
    "https://firebasestorage.googleapis.com/v0/b/anigo-67b0c.appspot.com/o/Dying%20Wish%20-%20Until%20Mourning%20Comes%20(Official%20Music%20Video).mp3?alt=media&token=1573cc50-6b33-4aea-b46c-9732497e9725";
  const width = 2500;
  const height = 180;

  const { togglePlayPause, ready, loading, playing, pause } = useAudioPlayer({
    src: url,
    format: [],
    autoplay: false,
    onend: () => console.log("sound has ended!"),
  });

  return (
    <Grid
      areas={["header  header", "sidebar content", "footer  footer"]}
      columns={["1fr", "3fr"]}
      rows={["size-1000", "1fr", "auto"]}
      minHeight={"100vh"}
      minWidth={"100vw"}
      gap="size-100"
    >
      <View backgroundColor="celery-600" gridArea="header" />
      <View backgroundColor="blue-600" gridArea="sidebar" />
      <View backgroundColor="purple-600" gridArea="content">
        <LyricPreview />
      </View>
      <View gridArea="footer">
        <AudioTimeline
          width={width}
          height={height}
          url={url}
          togglePlayPause={togglePlayPause}
          playing={playing}
        />
      </View>
    </Grid>
  );
}
