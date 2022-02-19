import { useEffect, useRef, useState } from "react";
import WaveformData from "waveform-data";
import { scaleY } from "./utils";
import { Howl } from "howler";
import PlayBackControls from "./PlayBackControls";
import { Flex, Grid, View } from "@adobe/react-spectrum";
import { useAudioPlayer } from "react-use-audio-player";

export default function LyricEditor() {
  const url: string =
    "https://firebasestorage.googleapis.com/v0/b/music-f.appspot.com/o/The%20Gazette%20-%20QUIET%20(%20instrumental).mp3?alt=media&token=1eea4e0d-9539-4cd8-a7d2-cdb94234f0ee";
  const width = 1200;
  const height = 100;
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const { togglePlayPause, ready, loading, playing } = useAudioPlayer({
    src: url,
    format: ["mp3"],
    autoplay: false,
    onend: () => console.log("sound has ended!"),
  });

  useEffect(() => {
    const canvasCtx = canvas?.current?.getContext("2d");
    const audioCtx = new AudioContext();

    generateWaveformDataThrougHttp(audioCtx).then((waveform) => {
      console.log(waveform);
      console.log(`Waveform has ${waveform.channels} channels`);
      console.log(`Waveform has length ${waveform.length} points`);

      drawWaveForm(canvasCtx, waveform);
    });
  }, []);

  async function generateWaveformDataThrougHttp(audioContext: AudioContext) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const options = {
      audio_context: audioContext,
      array_buffer: buffer,
      scale: 1000,
    };
    return await new Promise<WaveformData>((resolve, reject) => {
      WaveformData.createFromAudio(options, (err, waveform) => {
        if (err) {
          reject(err);
        } else {
          resolve(waveform);
        }
      });
    });
  }

  function drawWaveForm(
    ctx: CanvasRenderingContext2D | null | undefined,
    waveform: WaveformData
  ) {
    if (ctx) {
      ctx.beginPath();
      ctx.fillStyle = "#4B9CF5";
      ctx.strokeStyle = "#4B9CF5";

      const channel = waveform.channel(0);

      // Loop forwards, drawing the upper half of the waveform
      for (let x = 0; x < waveform.length; x++) {
        const val = channel.max_sample(x);

        ctx.lineTo(x + 0.5, scaleY(val, height) + 0.5);
      }

      // Loop backwards, drawing the lower half of the waveform
      for (let x = waveform.length - 1; x >= 0; x--) {
        const val = channel.min_sample(x);

        ctx.lineTo(x + 0.5, scaleY(val, height) + 0.5);
      }

      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    }
  }

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
        <Flex direction="column" gap="size-100">
          <PlayBackControls
            isPlaying={playing}
            onPlayPauseClicked={() => {
              togglePlayPause();
            }}
          />
          <View backgroundColor={"gray-200"} overflow={"auto auto"}>
            <Flex direction="row" gap="size-100">
              <canvas
                ref={canvas}
                width={width}
                height={height}
                onClick={() => {}}
              />
            </Flex>
          </View>
        </Flex>
      </View>
    </Grid>
  );
}
