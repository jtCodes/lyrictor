import { Grid, View } from "@adobe/react-spectrum";
import { useAudioPlayer } from "react-use-audio-player";
import AudioTimeline from "./AudioTimeline/AudioTimeline";

export default function LyricEditor() {
  const url: string =
    "https://firebasestorage.googleapis.com/v0/b/music-f.appspot.com/o/The%20Gazette%20-%20QUIET%20(%20instrumental).mp3?alt=media&token=1eea4e0d-9539-4cd8-a7d2-cdb94234f0ee";
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
      <View backgroundColor="purple-600" gridArea="content" />
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
