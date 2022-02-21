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

interface AudioTimelineProps {
  width: number;
  height: number;
  url: string;
}

export default function AudioTimeline(props: AudioTimelineProps) {
  const { height, url } = props;
  const zoomAmount: number = 100;
  const zoomScale: number = 0.1;
  const lyricTextBoxHandleWidth: number = 2.5;

  const { togglePlayPause, ready, loading, playing } = useAudioPlayer({
    src: url,
    format: ["mp3"],
    autoplay: false,
    onend: () => console.log("sound has ended!"),
  });

  const [points, setPoints] = useState<number[]>([]);
  const [layerX, setLayerX] = useState<number>(0);
  const [width, setWidth] = useState<number>(props.width);
  const [cursorX, setCursorX] = useState<number>(0);
  const [waveformData, setWaveformData] = useState<WaveformData>();
  const [lyricTexts, setLyricTexts] = useState<LyricText[]>([
    { start: 10, end: 30, text: "text 2" },
    { start: 50, end: 70, text: "hello" },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
      const canvasCtx = canvasRef?.current?.getContext("2d");
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
      generateWaveformLinePoints(waveformData);
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

  useEffect(() => {
    setCursorX((percentComplete / 100) * width);
  }, [position, width]);

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

        <View alignSelf={"center"}>
          <Slider
            width={100}
            aria-label="slider"
            maxValue={1.2}
            formatOptions={{ style: "percent" }}
            defaultValue={0}
            step={0.01}
            onChange={(value) => {
              setWidth(props.width + width * value);
            }}
            isFilled
          />
        </View>
      </Flex>
    </View>
  );

  const konvaScrollBar = (
    <Rect
      x={0}
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

        setLayerX(-(x / windowWidth!) * width);

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

  function handleTextBoxDrag(
    startX: number,
    textBoxWidth: number,
    windowWidth: number | undefined,
    index: number,
    fullKonvaWidth: number,
    audioDuration: number,
    textDuration: number
  ) {
    return (pos: Vector2d) => {
      // default prevent left over drag
      let x = pos.x;

      // if (pos.x >= 0 && Math.abs(pos.x) + textBoxWidth <= windowWidth!) {
      //   x = pos.x;
      // }

      // // prevent right over drag
      // if (Math.abs(pos.x) + textBoxWidth > windowWidth!) {
      //   x = windowWidth! - textBoxWidth;
      // }

      // detect collision with prev
      const prevLyricText: LyricText | undefined = lyricTexts[index - 1];
      let isOverlapPrevLyricText: boolean = false;
      let newPrevEnd: number;
      if (prevLyricText) {
        const prevLyricTextEndX: number = secondsToPixels(
          prevLyricText.end,
          audioDuration,
          fullKonvaWidth
        );

        if (x <= prevLyricTextEndX) {
          // disable auto shrinking overlap for now
          // isOverlapPrevLyricText = true;
          // newPrevEnd = pixelsToSeconds(x, fullKonvaWidth, audioDuration);
          x = prevLyricTextEndX;
        }
      }

      // detect collision with next
      const nextLyricText: LyricText | undefined = lyricTexts[index + 1];
      let isOverlapNextLyricText: boolean = false;
      let newNextStart: number;
      if (nextLyricText) {
        const nextLyricTextStartX: number = secondsToPixels(
          nextLyricText.start,
          audioDuration,
          fullKonvaWidth
        );

        if (x + textBoxWidth >= nextLyricTextStartX) {
          // disable auto shrinking overlap for now
          // isOverlapPrevLyricText = true;
          // newPrevEnd = pixelsToSeconds(x, fullKonvaWidth, audioDuration);
          x = nextLyricTextStartX - textBoxWidth;
        }
      }

      const updateLyricTexts = lyricTexts.map(
        (lyricText: LyricText, updatedIndex: number) => {
          if (newPrevEnd && updatedIndex === index - 1) {
            return {
              ...prevLyricText,
              end: newPrevEnd,
            };
          }

          if (updatedIndex === index) {
            return {
              ...lyricTexts[index],
              start: pixelsToSeconds(x, fullKonvaWidth, audioDuration),
              end:
                pixelsToSeconds(x, fullKonvaWidth, audioDuration) +
                textDuration,
            };
          }

          return lyricText;
        }
      );

      setLyricTexts(updateLyricTexts);

      return { x, y: 0 };
    };
  }

  const textBox = (lyricText: LyricText, index: number) => {
    const textDuration: number = lyricText.end - lyricText.start;
    const startX: number = secondsToPixels(lyricText.start, duration, width);
    const endX: number = secondsToPixels(lyricText.end, duration, width);
    const containerWidth: number = endX - startX;

    if (Number.isNaN(containerWidth)) {
      return null;
    }

    return (
      <Group
        key={index}
        width={containerWidth}
        height={20}
        y={0}
        x={startX}
        draggable={true}
        dragBoundFunc={handleTextBoxDrag(
          startX,
          containerWidth,
          windowWidth,
          index,
          width,
          duration,
          textDuration
        )}
      >
        <Line points={[0, 0, 0, 45]} stroke={"#8282F6"} strokeWidth={1} />
        <Rect width={containerWidth} height={20} fill="#8282F6" />
        <KonvaText
          fontSize={12}
          text={lyricText.text}
          wrap="none"
          align="center"
          ellipsis={true}
          width={containerWidth - 10}
          x={5}
          y={5}
          fill={"white"}
        />
        {/* left resize handle */}
        <Rect
          width={lyricTextBoxHandleWidth}
          height={20}
          fill="white"
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
        {/* right resize handle */}
        <Rect
          x={containerWidth - lyricTextBoxHandleWidth}
          width={lyricTextBoxHandleWidth}
          height={20}
          fill="white"
          draggable={true}
          dragBoundFunc={(pos: Vector2d) => {
            console.log(pos.x, startX, endX);
            // default prevent left over drag
            let x = startX;

            if (pos.x >= startX) {
              x = pos.x;
            }

            const updateLyricTexts = lyricTexts.map(
              (lyricText: LyricText, updatedIndex: number) => {
                if (updatedIndex === index) {
                  return {
                    ...lyricTexts[index],
                    end: pixelsToSeconds(
                      x + lyricTextBoxHandleWidth,
                      width,
                      duration
                    ),
                  };
                }

                return lyricText;
              }
            );
            setLyricTexts(updateLyricTexts);

            return { x, y: 0 };
          }}
          onMouseEnter={(e) => {
            // style stage container:
            if (e.target.getStage()?.container()) {
              const container = e.target.getStage()?.container();
              container!.style.cursor = "ew-resize";
            }
          }}
          onMouseLeave={(e) => {
            if (e.target.getStage()?.container()) {
              const container = e.target.getStage()?.container();
              container!.style.cursor = "default";
            }
          }}
        />
      </Group>
    );
  };

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
      >
        <Layer x={layerX}>
          <Group>
            {/* waveform plot */}
            <Line points={points} fill={"#2680eb"} closed={true} y={35} />
            {lyricTexts.map((lyricText, index) => {
              return textBox(lyricText, index);
            })}
            {/* cursor */}
            <Rect x={cursorX} y={0} width={1} height={height} fill="#eaeaea" />
          </Group>
          {konvaScrollBar}
        </Layer>
      </Stage>
    </Flex>
  );
}
