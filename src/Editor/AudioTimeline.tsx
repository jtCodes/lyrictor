import { Flex, View } from "@adobe/react-spectrum";
import { useEffect, useRef } from "react";
import WaveformData from "waveform-data";
import AudioTimelineCursor from "./AudioTimelineCursor";
import { scaleY } from "./utils";

interface AudioTimelineProps {
  width: number;
  height: number;
  url: string;
}

export default function AudioTimeline(props: AudioTimelineProps) {
  const { width, height, url } = props;
  const canvas = useRef<HTMLCanvasElement | null>(null);

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
      scale: 10000,
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
      const xOffset = width / waveform.length

      // Loop forwards, drawing the upper half of the waveform
      for (let x = 0; x < waveform.length; x++) {
        const val = channel.max_sample(x);

        ctx.lineTo(x * xOffset, scaleY(val, height) + 0.5);
      }

      // Loop backwards, drawing the lower half of the waveform
      for (let x = waveform.length - 1; x >= 0; x--) {
        const val = channel.min_sample(x);

        ctx.lineTo(x * xOffset, scaleY(val, height) + 0.5);
      }

      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    }
  }

  return (
    <View
      backgroundColor={"gray-200"}
      overflow={"auto hidden"}
      position={"relative"}
      height={props.height}
    >
      <View position={"absolute"}>
        <Flex direction="row" gap="size-100">
          <canvas
            ref={canvas}
            width={width}
            height={height}
            onClick={() => {}}
          />
        </Flex>
      </View>
      <View position={"absolute"}>
        <AudioTimelineCursor width={width} height={height} />
      </View>
    </View>
  );
}
