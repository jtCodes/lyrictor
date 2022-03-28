import { Flex, Slider, View } from "@adobe/react-spectrum";
import { useEffect, useRef, useState } from "react";
import WaveformData from "waveform-data";
import { useKeyPress, useWindowSize } from "../utils";
import { pixelsToSeconds, scaleY, secondsToPixels } from "./utils";
import { usePreviousNumber } from "react-hooks-use-previous";
import PlayBackControls from "./PlayBackControls";
import { useAudioPlayer, useAudioPosition } from "react-use-audio-player";
import {
  Group,
  Layer,
  Line,
  Rect,
  Stage,
  Text as KonvaText,
} from "react-konva";
import { Vector2d } from "konva/lib/types";
import formatDuration from "format-duration";
import { LyricText } from "./types";
import { KonvaEventObject } from "konva/lib/Node";
import { TextBox } from "./TextBox";

interface AudioTimelineProps {
  width: number;
  height: number;
  url: string;
}

export default function AudioTimeline(props: AudioTimelineProps) {
  const { height, url } = props;
  const zoomAmount: number = 100;
  const zoomStep: number = 0.01;
  const lyricTextBoxHandleWidth: number = 2.5;

  const { togglePlayPause, ready, loading, playing, pause } = useAudioPlayer({
    src: url,
    format: [],
    autoplay: false,
    onend: () => console.log("sound has ended!"),
  });

  const [points, setPoints] = useState<number[]>([]);
  const [layerX, setLayerX] = useState<number>(0);
  const [width, setWidth] = useState<number>(props.width);
  const [cursorX, setCursorX] = useState<number>(0);
  const [scrollbarX, setScrollbarX] = useState<number>(0);
  const [waveformData, setWaveformData] = useState<WaveformData>();
  const [lyricTexts, setLyricTexts] = useState<LyricText[]>([
    { start: 10, end: 30, text: "text 2" },
    { start: 50, end: 70, text: "hello" },
  ]);

  const plusPressed = useKeyPress("=");
  const minusPressed = useKeyPress("-");
  const oPressed = useKeyPress("o");
  const spacePress = useKeyPress(" ");
  const prevWidth = usePreviousNumber(width);
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  const { percentComplete, duration, seek, position } = useAudioPosition({
    highRefreshRate: true,
  });

  useEffect(() => {
    const audioCtx = new AudioContext();
    generateWaveformDataThrougHttp(audioCtx).then((waveform) => {
      console.log(waveform);
      console.log(`Waveform has ${waveform.channels} channels`);
      console.log(`Waveform has length ${waveform.length} points`);
      setWaveformData(waveform);
      generateWaveformLinePoints(waveform);
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
      console.log(
        "scrollbar x: %s, layer x: %s, windowWidth: %s, prevWidth: %s, width: %s, width - windowWidth: %s scrollbar width: %s",
        scrollbarX,
        layerX,
        windowWidth,
        prevWidth,
        width,
        width - windowWidth!,
        calculateScrollbarLength(),
        lyricTexts,
        secondsToPixels(lyricTexts[1].start, duration, width)
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
      generateWaveformLinePoints(waveformData);
    }

    const newCursorX = (percentComplete / 100) * width;

    setCursorX(newCursorX);
    if (windowWidth) {
      const newLayerX = layerX - (newCursorX - cursorX);

      if (
        prevWidth > width &&
        width - props.width < props.width * (zoomStep * 0.1) &&
        width - props.width < Math.abs(layerX)
      ) {
        // TODO: smoother
        setLayerX(0);
        setScrollbarX(0);
      } else if (newLayerX > 0) {
        setLayerX(0);
        setScrollbarX(0);
      } else {
        setLayerX(newLayerX);
        setScrollbarX((-newLayerX / width) * windowWidth);
      }
    }
  }, [width]);

  useEffect(() => {
    console.log("haha", (percentComplete / 100) * width);
    setCursorX((percentComplete / 100) * width);
  }, [position]);

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

  function generateWaveformLinePoints(waveform: WaveformData) {
    let points: number[] = [];
    const graphHeight = 90;
    const yPadding = 30;

    const channel = waveform.channel(0);
    const xOffset = width / waveform.length;

    // Loop forwards, drawing the upper half of the waveform
    for (let x = 0; x < waveform.length; x++) {
      const val = channel.max_sample(x);
      points.push(
        x * xOffset,
        scaleY(val, graphHeight - yPadding) + yPadding / 4
      );
    }

    // Loop backwards, drawing the lower half of the waveform
    for (let x = waveform.length - 1; x >= 0; x--) {
      const val = channel.min_sample(x);

      points.push(
        x * xOffset,
        scaleY(val, graphHeight - yPadding) + yPadding / 4
      );
    }

    setPoints(points);
  }

  /**
   * E.g. if the visible area is 99% of the full area, the scrollbar is 99% of the height.
   * Likewise if the visible is 50% of the full area, the scrollbar is 50% of the height.
   * Just be sure to make the minimum size something reasonable (e.g. at least 18-20px)
   */
  function calculateScrollbarLength(): number {
    let length: number = 20;

    if (windowWidth) {
      if (windowWidth < width) {
        if ((windowWidth / width) * windowWidth > 20) {
          length = (windowWidth / width) * windowWidth;
        }
      }
    }

    return length;
  }

  const toolsView = (
    <View padding={2.5} backgroundColor={"gray-200"}>
      <Flex
        direction="row"
        gap="size-100"
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <View></View>

        <View>
          <Flex
            direction="row"
            gap="size-100"
            alignItems={"center"}
            justifyContent={"space-between"}
          >
            <PlayBackControls
              isPlaying={playing}
              onPlayPauseClicked={() => {
                togglePlayPause();
              }}
            />
            <View backgroundColor={"gray-100"} borderRadius={"regular"}>
              <Flex
                direction="row"
                gap="size-100"
                alignItems={"center"}
                justifyContent={"space-between"}
              >
                <View width={50} padding={5}>
                  {formatDuration((percentComplete / 100) * duration * 1000)}
                </View>
                /
                <View width={50} padding={5}>
                  {formatDuration(duration * 1000)}{" "}
                </View>
              </Flex>
            </View>
          </Flex>
        </View>

        <View alignSelf={"center"} marginEnd={10}>
          <Slider
            width={100}
            aria-label="slider"
            minValue={0}
            maxValue={5}
            formatOptions={{ style: "percent" }}
            defaultValue={0}
            step={zoomStep}
            onChange={(value) => {
              const newWidth: number = props.width + props.width * value;
              const scrollableArea: number =
                windowWidth! - calculateScrollbarLength();
              const isZoomIn: boolean = newWidth > width;
              let velocity: number;

              setWidth(newWidth);
            }}
            isFilled
          />
        </View>
      </Flex>
    </View>
  );

  const konvaScrollBar = (
    <Rect
      x={scrollbarX}
      y={height - 11}
      width={calculateScrollbarLength()}
      height={10}
      fill="#A2A2A2"
      cornerRadius={3}
      draggable={true}
      dragBoundFunc={(pos: Vector2d) => {
        const scrollbarLength = calculateScrollbarLength();
        // default prevent left over drag
        let x = 0;

        if (pos.x >= 0 && Math.abs(pos.x) + scrollbarLength <= windowWidth!) {
          x = pos.x;
        }

        // prevent right over drag
        if (Math.abs(pos.x) + scrollbarLength > windowWidth!) {
          x = windowWidth! - scrollbarLength;
        }

        const newLayerX = -(x / windowWidth!) * width;
        setLayerX(newLayerX);
        setScrollbarX(x);

        return { x, y: height - 11 };
      }}
      onMouseEnter={(e) => {
        // style stage container:
        if (e.target.getStage()?.container()) {
          const container = e.target.getStage()?.container();
          container!.style.cursor = "pointer";
        }
      }}
      onMouseLeave={(e) => {
        if (e.target.getStage()?.container()) {
          const container = e.target.getStage()?.container();
          container!.style.cursor = "default";
        }
      }}
    />
  );

  return (
    <Flex direction="column" gap="size-100">
      {toolsView}
      <Stage
        width={windowWidth}
        height={height}
        onClick={(e: any) => {
          seek(((e.evt.layerX + Math.abs(layerX)) / width) * duration);
          console.log(e.evt.layerX, layerX);
        }}
        // draggable={true}
        dragBoundFunc={(pos: Vector2d) => {
          // default prevent left over drag
          let x = 0;

          if (pos.x <= 0 && Math.abs(pos.x) <= width - windowWidth!) {
            x = pos.x;
          }

          // prevent right over drag
          if (Math.abs(pos.x) > width - windowWidth!) {
            x = -(width - windowWidth!);
          }

          return { x, y: 0 };
        }}
        onWheel={(e: KonvaEventObject<WheelEvent>) => {
          // prevent parent scrolling
          e.evt.preventDefault();
          const dx = e.evt.deltaX;
          const dy = e.evt.deltaY;

          const newLayerX = layerX - dx;
          if (newLayerX <= 0 && Math.abs(newLayerX) <= width - windowWidth!) {
            setLayerX(layerX - dx);
            setScrollbarX((-newLayerX / width) * windowWidth!);
          }
        }}
      >
        <Layer x={layerX}>
          <Group>
            {/* waveform plot */}
            <Line points={points} fill={"#2680eb"} closed={true} y={35} />
            {lyricTexts.map((lyricText, index) => {
              return (
                <TextBox
                  lyricText={lyricText}
                  index={index}
                  width={width}
                  windowWidth={windowWidth}
                  layerX={layerX}
                  duration={duration}
                  lyricTexts={lyricTexts}
                  setLyricTexts={setLyricTexts}
                />
              );
            })}
            {/* cursor */}
            <Rect x={cursorX} y={0} width={1} height={height} fill="#eaeaea" />
          </Group>
        </Layer>
        <Layer>{konvaScrollBar}</Layer>
      </Stage>
    </Flex>
  );
}
