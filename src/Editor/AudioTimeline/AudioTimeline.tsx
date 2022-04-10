import { Flex, Slider, View } from "@adobe/react-spectrum";
import { useEffect, useState } from "react";
import WaveformData from "waveform-data";
import {
  useKeyPress,
  useKeyPressCombination,
  useWindowSize,
} from "../../utils";
import { getScrollDirection, scaleY, secondsToPixels } from "../utils";
import { usePreviousNumber } from "react-hooks-use-previous";
import PlayBackControls from "./PlayBackControls";
import { useAudioPlayer, useAudioPosition } from "react-use-audio-player";
import { Group, Layer, Line, Rect, Stage } from "react-konva";
import { Vector2d } from "konva/lib/types";
import formatDuration from "format-duration";
import { LyricText, ScrollDirection } from "../types";
import { KonvaEventObject } from "konva/lib/Node";
import { TextBox } from "./TextBox";
import { ToolsView } from "./ToolsView";
import { useProjectStore } from "../../Project/store";

interface AudioTimelineProps {
  width: number;
  height: number;
  url: string;
}

const graphHeight = 90;

export default function AudioTimeline(props: AudioTimelineProps) {
  const { height, url } = props;
  const zoomAmount: number = 100;
  const zoomStep: number = 0.01;

  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const isEditing = useProjectStore((state) => state.isEditing);
  const isProjectPopupOpen = useProjectStore((state) => state.isPopupOpen);

  const [stageHeight, setStageHeight] = useState<number>(height + 500);
  const [points, setPoints] = useState<number[]>([]);
  const [timelineLayerX, setTimelineLayerX] = useState<number>(0);
  const [timelineLayerY, setTimelineLayerY] = useState<number>(
    height - stageHeight
  );
  const [width, setWidth] = useState<number>(props.width);
  const [cursorX, setCursorX] = useState<number>(0);
  const [scrollbarX, setScrollbarX] = useState<number>(0);
  const [waveformData, setWaveformData] = useState<WaveformData>();
  const [selectedLyricText, setSelectedLyricText] =
    useState<LyricText | undefined>();

  const deletePressed = useKeyPress("Delete");
  const backspacePressed = useKeyPress("Backspace");
  const plusPressed = useKeyPress("=");
  const minusPressed = useKeyPress("-");
  const oPressed = useKeyPress("o");
  const spacePress = useKeyPress(" ");
  const copyPressed = useKeyPressCombination("c");
  const pastePressed = useKeyPressCombination("v");
  const prevWidth = usePreviousNumber(width);
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  const { togglePlayPause, ready, loading, playing, pause, player, load } =
    useAudioPlayer({
      src: url,
      format: ["mp3"],
      autoplay: false,
      onloaderror: (id, error) => {
        console.log(" load error", error);
      },
      onload: () => {
        console.log("on load");
      },
      onend: () => console.log("sound has ended!"),
    });

  const { percentComplete, duration, seek, position } = useAudioPosition({
    highRefreshRate: true,
  });

  useEffect(() => {
    if (isProjectPopupOpen) {
      pause();
    }
  }, [isProjectPopupOpen]);

  useEffect(() => {
    const audioCtx = new AudioContext();
    generateWaveformDataThrougHttp(audioCtx).then((waveform) => {
      console.log(waveform);
      console.log(`Waveform has ${waveform.channels} channels`);
      console.log(`Waveform has length ${waveform.length} points`);
      setWaveformData(waveform);
      generateWaveformLinePoints(waveform);
    });
  }, [editingProject]);

  useEffect(() => {
    if (!isEditing && !isProjectPopupOpen) {
      if (plusPressed && windowWidth) {
        setWidth(width + zoomAmount);
      }

      if (minusPressed && windowWidth) {
        setWidth(width - zoomAmount);
      }

      if (backspacePressed || deletePressed) {
        if (selectedLyricText) {
          setLyricTexts(
            lyricTexts.filter(
              (lyricText) => lyricText.id !== selectedLyricText.id
            )
          );
        }
      }
    }
  }, [plusPressed, minusPressed, oPressed, deletePressed, backspacePressed]);

  useEffect(() => {
    if (!isEditing && !isProjectPopupOpen) {
      if (copyPressed) {
        console.log("copy");
      }

      if (pastePressed) {
        console.log("paste");
      }
    }
  }, [copyPressed, pastePressed]);

  useEffect(() => {
    if (!isEditing && !isProjectPopupOpen) {
      if (spacePress) {
        togglePlayPause();
      }
    }
  }, [spacePress]);

  useEffect(() => {
    if (waveformData) {
      generateWaveformLinePoints(waveformData);
    }

    const newCursorX = (percentComplete / 100) * width;

    setCursorX(newCursorX);
    if (windowWidth) {
      const newLayerX = timelineLayerX - (newCursorX - cursorX);

      if (
        prevWidth > width &&
        width - props.width < props.width * (zoomStep * 0.1) &&
        width - props.width < Math.abs(timelineLayerX)
      ) {
        // TODO: smoother
        setTimelineLayerX(0);
        setScrollbarX(0);
      } else if (newLayerX > 0) {
        setTimelineLayerX(0);
        setScrollbarX(0);
      } else {
        setTimelineLayerX(newLayerX);
        setScrollbarX((-newLayerX / width) * windowWidth);
      }
    }
  }, [width]);

  useEffect(() => {
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

  // https://stackoverflow.com/questions/24278063/wheel-event-and-deltay-value-for-mousewheel
  function handleTimelineOnWheel(e: KonvaEventObject<WheelEvent>) {
    // prevent parent scrolling
    e.evt.preventDefault();

    let dx = e.evt.deltaX;
    let dy = e.evt.deltaY;

    if (Math.abs(dy) >= 120) {
      dy = ((1 / 40) * dy) * 4;
    }
    
    // console.log(dx, dy, (-1 / 40) * dy, timelineLayerY, e.evt);
    const scrollDirection: ScrollDirection =
      Math.abs(dx) > Math.abs(dy)
        ? ScrollDirection.horizontal
        : ScrollDirection.vertical;

    if (scrollDirection === ScrollDirection.horizontal) {
      const newLayerX = timelineLayerX - dx;

      if (newLayerX <= 0 && Math.abs(newLayerX) <= width - windowWidth!) {
        setTimelineLayerX(timelineLayerX - dx);
        setScrollbarX((-newLayerX / width) * windowWidth!);
      }
    } else {
      const newLayerY = timelineLayerY - dy;
      if (newLayerY <= 0 && Math.abs(newLayerY) <= stageHeight - height) {
        setTimelineLayerY(newLayerY);
      }
    }
  }

  const horizontalScrollbar = (
    <Rect
      x={scrollbarX}
      y={0}
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
        console.log(x, newLayerX);
        setTimelineLayerX(newLayerX);
        setScrollbarX(x);

        return { x, y: 0 };
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

  const verticalScrollbar = (
    <Rect
      x={0}
      y={0}
      width={10}
      height={100}
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
        console.log(x, newLayerX);
        setTimelineLayerX(newLayerX);
        setScrollbarX(x);

        return { x, y: 0 };
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
      <ToolsView
        playing={playing}
        togglePlayPause={togglePlayPause}
        percentComplete={percentComplete}
        duration={duration}
        position={position}
        zoomStep={zoomStep}
        zoomAmount={zoomAmount}
        initWidth={props.width}
        currentWidth={width}
        windowWidth={windowWidth}
        calculateScrollbarLength={calculateScrollbarLength}
        setWidth={setWidth}
      />
      <View height={height} position={"relative"} overflow={"hidden"}>
        <View position={"absolute"} height={height}>
          <Stage
            width={windowWidth}
            height={height}
            onClick={(e: any) => {
              seek(
                ((e.evt.layerX + Math.abs(timelineLayerX)) / width) * duration
              );

              const emptySpace = e.target === e.target.getStage();
              if (emptySpace) {
                setSelectedLyricText(undefined);
              }
            }}
            onWheel={handleTimelineOnWheel}
          >
            <Layer x={timelineLayerX} y={timelineLayerY}>
              <Group>
                {/* waveform plot */}
                <Line
                  points={points}
                  fill={"#2680eb"}
                  closed={true}
                  y={stageHeight - graphHeight}
                />
                {lyricTexts.map((lyricText, index) => {
                  return (
                    <TextBox
                      lyricText={lyricText}
                      index={index}
                      width={width}
                      windowWidth={windowWidth}
                      layerX={timelineLayerX}
                      duration={duration}
                      lyricTexts={lyricTexts}
                      setLyricTexts={setLyricTexts}
                      setSelectedLyricText={setSelectedLyricText}
                      isSelected={selectedLyricText?.id === lyricText.id}
                      timelineY={stageHeight - graphHeight}
                      timelineLayerY={timelineLayerY}
                    />
                  );
                })}
                {/* cursor */}
                <Rect
                  x={cursorX}
                  y={0}
                  width={1}
                  height={stageHeight}
                  fill="#eaeaea"
                />
              </Group>
            </Layer>
          </Stage>
        </View>
        <View position={"absolute"} bottom={0} zIndex={1}>
          <Stage height={10} width={windowWidth}>
            <Layer>{horizontalScrollbar}</Layer>
          </Stage>
        </View>
        <View position={"absolute"} right={2.5} zIndex={1}>
          <Stage height={height} width={10}>
            <Layer>{verticalScrollbar}</Layer>
          </Stage>
        </View>
      </View>
    </Flex>
  );
}
