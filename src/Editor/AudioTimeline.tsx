import { Flex, Slider, View } from "@adobe/react-spectrum";
import { useEffect, useRef, useState } from "react";
import WaveformData from "waveform-data";
import { useKeyPress, useWindowSize } from "../utils";
import AudioTimelineCursor from "./AudioTimelineCursor";
import { scaleY } from "./utils";
import { usePreviousNumber } from "react-hooks-use-previous";
import PlayBackControls from "./PlayBackControls";
import { useAudioPlayer } from "react-use-audio-player";

interface AudioTimelineProps {
  width: number;
  height: number;
  url: string;
}

export default function AudioTimeline(props: AudioTimelineProps) {
  const { height, url } = props;
  const { togglePlayPause, ready, loading, playing } = useAudioPlayer({
    src: url,
    format: ["mp3"],
    autoplay: false,
    onend: () => console.log("sound has ended!"),
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const plusPressed = useKeyPress("=");
  const minusPressed = useKeyPress("-");
  const oPressed = useKeyPress("o");
  const spacePress = useKeyPress(" ");
  const [width, setWidth] = useState<number>(props.width);
  const prevWidth = usePreviousNumber(width);
  const [waveformData, setWaveformData] = useState<WaveformData>();
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const zoomAmount: number = 100;
  const zoomScale: number = 0.1;

  useEffect(() => {
    const audioCtx = new AudioContext();

    generateWaveformDataThrougHttp(audioCtx).then((waveform) => {
      console.log(waveform);
      console.log(`Waveform has ${waveform.channels} channels`);
      console.log(`Waveform has length ${waveform.length} points`);
      setWaveformData(waveform);
      const canvasCtx = canvasRef?.current?.getContext("2d");
      drawWaveForm(canvasCtx, waveform);
    });
  }, []);

  useEffect(() => {
    if (plusPressed && windowWidth) {
      setWidth(width + zoomAmount);
    }

    if (minusPressed && windowWidth) {
      setWidth(width - zoomAmount);
    }

    if (oPressed) {
      const pageElement = document.getElementById("timeline-container");
      console.log(
        "pageElement?.scrollLeft: %s, windowWidth: %s, prevWidth: %s, width: %s, width - windowWidth: %s",
        pageElement?.scrollLeft,
        windowWidth,
        prevWidth,
        width,
        width - windowWidth!
      );
    }
  }, [plusPressed, minusPressed, oPressed]);

  useEffect(() => {
    if (spacePress) {
      togglePlayPause();
    }
  }, [spacePress]);

  useEffect(() => {
    if (waveformData) {
      const canvasCtx = canvasRef?.current?.getContext("2d");
      drawWaveForm(canvasCtx, waveformData);
    }

    // scroll offset after zoom/unzoom
    const pageElement = document.getElementById("timeline-container");
    console.log(
      "pageElement?.scrollLeft: %s, windowWidth: %s, prevWidth: %s, width: %s, width - windowWidth: %s",
      pageElement?.scrollLeft,
      windowWidth,
      prevWidth,
      width,
      width - windowWidth!
    );
    if (pageElement && windowWidth && prevWidth && width) {
      if (width > prevWidth) {
        // pageElement.scrollLeft += 13.5;
      } else if (width < prevWidth) {
        // pageElement.scrollLeft -= 20;
      }
    }
  }, [width]);

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
      const tempCanvas = document.createElement("canvas"); // Create a new canvas as cache canvas
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.beginPath();
        ctx.fillStyle = "#4B9CF5";
        ctx.strokeStyle = "#4B9CF5";

        const channel = waveform.channel(0);
        const xOffset = width / waveform.length;

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
  }

  return (
    <Flex direction="column" gap="size-100">
      <Flex
        direction="row"
        gap="size-100"
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <View></View>
        <PlayBackControls
          isPlaying={playing}
          onPlayPauseClicked={() => {
            togglePlayPause();
          }}
        />
        <Slider
          aria-label="slider"
          maxValue={1}
          formatOptions={{ style: "percent" }}
          defaultValue={0}
          step={0.1}
          onChange={(value) => {
            setWidth(props.width + width * value);
            console.log(value, width + props.width * value);
          }}
          isFilled
        />
      </Flex>
      <View
        id="timeline-container"
        backgroundColor={"gray-200"}
        overflow={"scroll hidden"}
        position={"relative"}
        height={props.height}
      >
        <View position={"absolute"}>
          <Flex direction="row" gap="size-100">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              onClick={() => {}}
            />
          </Flex>
        </View>
        <View position={"absolute"}>
          <AudioTimelineCursor width={width} height={height} />
        </View>
      </View>{" "}
    </Flex>
  );
}
