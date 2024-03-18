import { Flex, View } from "@adobe/react-spectrum";
import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { useEffect, useMemo, useState } from "react";
import { usePreviousNumber } from "react-hooks-use-previous";
import { Group, Layer, Line, Rect, Stage } from "react-konva";
import { useAudioPlayer, useAudioPosition } from "react-use-audio-player";
import WaveformData from "waveform-data";
import { generateLyricTextId, useProjectStore } from "../../Project/store";
import {
  useKeyPress,
  useKeyPressCombination,
  useWindowSize,
} from "../../utils";
import {
  Coordinate,
  LyricText,
  ScrollDirection,
  TimelineInteractionState,
} from "../types";
import { pixelsToSeconds, scaleY, yToTimelineLevel } from "../utils";
import { TextBox } from "./TextBox";
import TimelineRuler from "./TimelineRuler";
import { ToolsView } from "./Tools/ToolsView";
import { getVisibleSongRange } from "./utils";
import debounce from "lodash.debounce";
import throttle from "lodash.throttle";
import { useEditorStore } from "../store";
import LyricTextCustomizationToolPanel, {
  CUSTOMIZATION_PANEL_WIDTH,
} from "./Tools/LyricTextCustomizationToolPanel";

interface AudioTimelineProps {
  width: number;
  height: number;
  url: string;
}

const GRAPH_HEIGHT = 90;

export default function AudioTimeline(props: AudioTimelineProps) {
  const { height, url } = props;
  const zoomAmount: number = 100;
  const zoomStep: number = 0.01;

  const { width: windowWidth, height: windowHeight } = useWindowSize();

  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const isEditing = useProjectStore((state) => state.isEditing);
  const isProjectPopupOpen = useProjectStore((state) => state.isPopupOpen);
  const undoLyricTextsHistory = useProjectStore(
    (state) => state.undoLyricTextEdit
  );
  const redoLyricTextUndo = useProjectStore((state) => state.redoLyricTextUndo);

  const timelineLayerY = useEditorStore((state) => state.timelineLayerY);
  const setTimelineLayerY = useEditorStore((state) => state.setTimelineLayerY);
  const isCustomizationPanelOpen = useEditorStore(
    (state) => state.isCustomizationPanelOpen
  );
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );
  const setSelectedLyricTextIds = useEditorStore(
    (state) => state.setSelectedLyricTextIds
  );

  const toggleCustomizationPanelState = useEditorStore(
    (state) => state.toggleCustomizationPanelOpenState
  );

  // const [width, setWidth] = useState<number>(props.width);
  const [stageHeight, setStageHeight] = useState<number>(height + 900);
  // const [points, setPoints] = useState<number[]>([]);
  const [throttledTimelineLayerX, setThrottledTimelineLayerX] =
    useState<number>(0);
  const [throttledTimelineLayerY, setThrottledTimelineLayerY] =
    useState<number>(height - stageHeight);

  const [timelineInteractionState, setTimelineInteractionState] =
    useState<TimelineInteractionState>({
      width: props.width,
      layerX: 0,
      cursorX: 0,
      points: [],
    });

  const verticalScrollbarHeight = calculateVerticalScrollbarLength();
  const horizontalScrollbarWidth = calculateHorizontalScrollbarLength();
  const timelineStartY = stageHeight - GRAPH_HEIGHT / 2.2;

  const [horizontalScrollbarX, setHorizontalScrollbarX] = useState<number>(0);
  const [verticalScrollbarY, setVerticalScrollbarY] = useState<number>(
    height - verticalScrollbarHeight
  );

  const [waveformData, setWaveformData] = useState<WaveformData>();

  const [copiedLyricTexts, setCopiedLyricTexts] = useState<LyricText[]>([]);

  const [isTimelineMouseDown, setIsTimelineMouseDown] =
    useState<boolean>(false);
  const [multiSelectDragStartCoord, setMultiSelectDragStartCoord] =
    useState<Coordinate>();
  const [multiSelectDragEndCoord, setMultiSelectDragEndCoord] =
    useState<Coordinate>();

  const deletePressed = useKeyPress("Delete");
  const backspacePressed = useKeyPress("Backspace");
  const plusPressed = useKeyPress("=");
  const minusPressed = useKeyPress("-");
  const oPressed = useKeyPress("o");
  const spacePress = useKeyPress(" ");
  const copyPressed = useKeyPressCombination("c");
  const pastePressed = useKeyPressCombination("v");
  const undoPressed = useKeyPressCombination("z");
  const redoPressed = useKeyPressCombination("z", true);
  const prevWidth = usePreviousNumber(timelineInteractionState.width);

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

  const lyricTextComponents = useMemo(() => {
    const visibleTimeRange = getVisibleSongRange({
      width: timelineInteractionState.width,
      windowWidth: getTimelineWindowWidth(),
      duration,
      scrollXOffSet: timelineInteractionState.layerX,
    });
    return lyricTexts
      .filter(
        (lyricText) =>
          lyricText.end >= visibleTimeRange[0] &&
          lyricText.start <= visibleTimeRange[1]
      )
      .map((lyricText, index) => {
        return (
          <TextBox
            key={lyricText + "" + index}
            lyricText={lyricText}
            index={index}
            width={timelineInteractionState.width}
            windowWidth={getTimelineWindowWidth()}
            duration={duration}
            lyricTexts={lyricTexts}
            setLyricTexts={setLyricTexts}
            setSelectedLyricText={(lyricText: LyricText) => {
              setSelectedLyricTextIds(new Set([lyricText.id]));
              toggleCustomizationPanelState(true);
            }}
            isSelected={selectedLyricTextIds.has(lyricText.id)}
            timelineY={timelineStartY}
            selectedTexts={selectedLyricTextIds}
          />
        );
      });
  }, [
    lyricTexts,
    timelineInteractionState.points,
    selectedLyricTextIds,
    throttledTimelineLayerX,
    throttledTimelineLayerY,
    timelineInteractionState.width,
  ]);

  const throttleUpdateTimelineLayerX = useMemo(
    () => throttle(setThrottledTimelineLayerX, 250),
    []
  );

  const throttleUpdateTimelineLayerY = useMemo(
    () => throttle(setThrottledTimelineLayerY, 250),
    []
  );

  const waveformPlot = useMemo(
    () => (
      <Line
        points={timelineInteractionState.points}
        fill={"#2680eb"}
        closed={true}
        y={timelineStartY}
      />
    ),
    [timelineInteractionState.points]
  );

  useEffect(() => {
    setTimelineLayerY(height - stageHeight);
  }, []);

  useEffect(() => {
    throttleUpdateTimelineLayerX(timelineInteractionState.layerX);
  }, [timelineInteractionState.layerX]);

  useEffect(() => {
    throttleUpdateTimelineLayerY(timelineLayerY);
  }, [timelineLayerY]);

  useEffect(() => {
    if (isProjectPopupOpen) {
      pause();
    }
  }, [isProjectPopupOpen]);

  useEffect(() => {
    const audioCtx = new AudioContext();
    generateWaveformDataThroughHttp(audioCtx).then((waveform) => {
      console.log(waveform);
      console.log(`Waveform has ${waveform.channels} channels`);
      console.log(`Waveform has length ${waveform.length} points`);
      setWaveformData(waveform);
      generateWaveformLinePoints(waveform, timelineInteractionState.width);
    });
  }, [editingProject]);

  useEffect(() => {
    if (!isEditing && !isProjectPopupOpen) {
      if (plusPressed && getTimelineWindowWidth()) {
        onWidthChanged(timelineInteractionState.width + zoomAmount);
      }

      if (minusPressed && getTimelineWindowWidth()) {
        onWidthChanged(timelineInteractionState.width - zoomAmount);
      }

      if (backspacePressed || deletePressed) {
        setLyricTexts(
          lyricTexts.filter(
            (lyricText) => !selectedLyricTextIds.has(lyricText.id)
          )
        );
      }
    }
  }, [plusPressed, minusPressed, oPressed, deletePressed, backspacePressed]);

  useEffect(() => {
    if (!isEditing && !isProjectPopupOpen) {
      if (copyPressed) {
        const selectedLyricTexts = lyricTexts.filter((lyricText: LyricText) =>
          selectedLyricTextIds.has(lyricText.id)
        );
        setCopiedLyricTexts(selectedLyricTexts);
        console.log("copy", selectedLyricTextIds);
      }

      if (pastePressed) {
        // take the difference between start time of
        // first selected item and the cursor time
        // shift the start and end time of all the selected items
        // insert into the array based on the start time of the first selected item
        // pasted lyricTexts will be the new selected texts
        if (copiedLyricTexts.length > 0) {
          const timeDifferenceFromCursor =
            pixelsToSeconds(
              timelineInteractionState.cursorX,
              timelineInteractionState.width,
              duration
            ) - copiedLyricTexts[0].start;
          const shiftedLyricTexts = copiedLyricTexts.map((lyricText, index) => {
            const start = lyricText.start + timeDifferenceFromCursor;
            const end = lyricText.end + timeDifferenceFromCursor;
            return {
              ...lyricText,
              id: generateLyricTextId() + index,
              start,
              end,
            };
          });
          setSelectedLyricTextIds(new Set(shiftedLyricTexts.map((l) => l.id)));
          setLyricTexts([...lyricTexts, ...shiftedLyricTexts]);
          console.log(
            "paste",
            timeDifferenceFromCursor,
            copiedLyricTexts,
            shiftedLyricTexts
          );
        }
      }
    }
  }, [copyPressed, pastePressed]);

  useEffect(() => {
    if (undoPressed) {
      undoLyricTextsHistory();
    }
  }, [undoPressed]);

  useEffect(() => {
    if (redoPressed) {
      redoLyricTextUndo();
    }
  }, [redoPressed]);

  useEffect(() => {
    if (!isEditing && !isProjectPopupOpen) {
      if (spacePress) {
        togglePlayPause();
      }
    }
  }, [spacePress]);

  useEffect(() => {
    setTimelineInteractionState({
      ...timelineInteractionState,
      cursorX: (percentComplete / 100) * timelineInteractionState.width,
    });
  }, [position]);

  useEffect(() => {
    if (multiSelectDragStartCoord && multiSelectDragEndCoord) {
      const dragStartTimelineLevel = yToTimelineLevel(
        multiSelectDragStartCoord.y,
        timelineStartY
      );

      const dragEndTimelineLevel = yToTimelineLevel(
        multiSelectDragEndCoord.y,
        timelineStartY
      );

      const dragStartTime = pixelsToSeconds(
        multiSelectDragStartCoord.x,
        timelineInteractionState.width,
        duration
      );

      const dragEndTime = pixelsToSeconds(
        multiSelectDragEndCoord.x,
        timelineInteractionState.width,
        duration
      );

      const minDragTimelineLevel = Math.min(
        dragStartTimelineLevel,
        dragEndTimelineLevel
      );
      const maxDragTimelineLevel = Math.max(
        dragStartTimelineLevel,
        dragEndTimelineLevel
      );

      const minDragTime = Math.min(dragStartTime, dragEndTime);
      const maxDragTime = Math.max(dragStartTime, dragEndTime);

      let newSelectedLyricTexts = new Set<number>();

      lyricTexts.forEach((lyricText) => {
        if (
          lyricText.textBoxTimelineLevel >= minDragTimelineLevel &&
          lyricText.textBoxTimelineLevel <= maxDragTimelineLevel &&
          ((lyricText.end >= minDragTime && lyricText.end <= maxDragTime) ||
            (lyricText.start >= minDragTime &&
              lyricText.start <= maxDragTime) ||
            (lyricText.start <= minDragTime && lyricText.end >= maxDragTime))
        ) {
          newSelectedLyricTexts.add(lyricText.id);
        }
      });

      setSelectedLyricTextIds(newSelectedLyricTexts);
    }
  }, [multiSelectDragEndCoord]);

  async function generateWaveformDataThroughHttp(audioContext: AudioContext) {
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

  function generateWaveformLinePoints(
    waveform: WaveformData,
    width: number
  ): number[] {
    let points: number[] = [];
    const yPadding = 30;

    const channel = waveform.channel(0);
    const xOffset = width / waveform.length;

    // Loop forwards, drawing the upper half of the waveform
    for (let x = 0; x < waveform.length; x++) {
      const val = channel.max_sample(x);
      points.push(
        x * xOffset,
        scaleY(val, GRAPH_HEIGHT - yPadding) + yPadding / 4
      );
    }

    // Loop backwards, drawing the lower half of the waveform
    for (let x = waveform.length - 1; x >= 0; x--) {
      const val = channel.min_sample(x);

      points.push(
        x * xOffset,
        scaleY(val, GRAPH_HEIGHT - yPadding) + yPadding / 4
      );
    }

    return points;
  }

  function onWidthChanged(width: number) {
    let newPoints = [];
    if (waveformData) {
      newPoints = generateWaveformLinePoints(waveformData, width);
    } else {
      newPoints = timelineInteractionState.points;
    }

    const newCursorX = (percentComplete / 100) * width;

    if (getTimelineWindowWidth()) {
      let newLayerX =
        timelineInteractionState.layerX -
        (newCursorX - timelineInteractionState.cursorX);
      let newScrollBarX = 0;

      if (
        prevWidth > width &&
        width - props.width < props.width * (zoomStep * 0.1) &&
        width - props.width < Math.abs(timelineInteractionState.layerX)
      ) {
        newLayerX = 0;
      } else if (newLayerX > 0) {
        newLayerX = 0;
      } else {
        newScrollBarX = (-newLayerX / width) * getTimelineWindowWidth();
      }

      setTimelineInteractionState({
        width,
        cursorX: newCursorX,
        layerX: newLayerX,
        points: newPoints,
      });
      setHorizontalScrollbarX(newScrollBarX);
    }
  }

  /**
   * E.g. if the visible area is 99% of the full area, the scrollbar is 99% of the height.
   * Likewise if the visible is 50% of the full area, the scrollbar is 50% of the height.
   * Just be sure to make the minimum size something reasonable (e.g. at least 18-20px)
   */
  function calculateHorizontalScrollbarLength(): number {
    let length: number = 20;
    const windowWidth = getTimelineWindowWidth();
    if (windowWidth) {
      if (windowWidth < timelineInteractionState.width) {
        if ((windowWidth / timelineInteractionState.width) * windowWidth > 20) {
          length = (windowWidth / timelineInteractionState.width) * windowWidth;
        }
      }
    }

    return length;
  }

  function calculateVerticalScrollbarLength(): number {
    let length: number = 20;

    if ((height / stageHeight) * height > 20) {
      length = (height / stageHeight) * height;
    }

    return length;
  }

  const debouncedHandleTimelineOnWheel = useMemo(
    () => debounce(handleTimelineOnWheel, 3),
    [
      timelineInteractionState.layerX,
      timelineLayerY,
      timelineInteractionState.cursorX,
    ]
  );

  function getTimelineWindowWidth() {
    return (
      (windowWidth ?? 0) -
      (isCustomizationPanelOpen ? CUSTOMIZATION_PANEL_WIDTH : 0)
    );
  }

  // https://stackoverflow.com/questions/24278063/wheel-event-and-deltay-value-for-mousewheel
  function handleTimelineOnWheel(e: KonvaEventObject<WheelEvent>) {
    // prevent parent scrolling
    e.evt.preventDefault();

    let dx = e.evt.deltaX;
    let dy = e.evt.deltaY;

    if (Math.abs(dy) >= 120) {
      dy = (1 / 40) * dy * 6;
    }

    const windowWidth = getTimelineWindowWidth();

    const scrollDirection: ScrollDirection =
      Math.abs(dx) > Math.abs(dy)
        ? ScrollDirection.horizontal
        : ScrollDirection.vertical;

    if (scrollDirection === ScrollDirection.horizontal) {
      let newLayerX = timelineInteractionState.layerX - dx;

      if (
        newLayerX < 0 &&
        Math.abs(newLayerX) < timelineInteractionState.width - windowWidth!
      ) {
        newLayerX = timelineInteractionState.layerX - dx;
        setHorizontalScrollbarX(
          (-newLayerX / timelineInteractionState.width) * windowWidth!
        );
      } else if (newLayerX >= 0) {
        newLayerX = 0;
        setHorizontalScrollbarX(0);
      } else {
        newLayerX = -(timelineInteractionState.width - windowWidth!);
        setHorizontalScrollbarX(windowWidth! - horizontalScrollbarWidth);
      }

      setTimelineInteractionState({
        ...timelineInteractionState,
        layerX: newLayerX,
      });
    } else {
      const newLayerY = timelineLayerY - dy;
      if (newLayerY < 0 && Math.abs(newLayerY) < stageHeight - height) {
        setTimelineLayerY(newLayerY);
        setVerticalScrollbarY((-newLayerY / stageHeight) * height);
      } else if (newLayerY >= 0) {
        setTimelineLayerY(0);
        setVerticalScrollbarY(0);
      } else {
        setTimelineLayerY(-(stageHeight - height));
        setVerticalScrollbarY(height - verticalScrollbarHeight);
      }
    }
  }

  const horizontalScrollbar = (
    <Rect
      x={horizontalScrollbarX}
      y={0}
      width={horizontalScrollbarWidth}
      height={10}
      fill="#A2A2A2"
      cornerRadius={3}
      draggable={true}
      dragBoundFunc={(pos: Vector2d) => {
        const windowWidth = getTimelineWindowWidth();
        const scrollbarLength = horizontalScrollbarWidth;
        // default prevent left over drag
        let x = 0;

        if (pos.x >= 0 && Math.abs(pos.x) + scrollbarLength <= windowWidth!) {
          x = pos.x;
        }

        // prevent right over drag
        if (Math.abs(pos.x) + scrollbarLength > windowWidth!) {
          x = windowWidth! - scrollbarLength;
        }

        const newLayerX = -(x / windowWidth!) * timelineInteractionState.width;

        setHorizontalScrollbarX(x);
        setTimelineInteractionState({
          ...timelineInteractionState,
          layerX: newLayerX,
        });

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
      y={verticalScrollbarY}
      width={10}
      height={verticalScrollbarHeight}
      fill="#A2A2A2"
      cornerRadius={3}
      draggable={true}
      dragBoundFunc={(pos: Vector2d) => {
        const scrollbarLength = verticalScrollbarHeight;
        // default prevent left over drag
        let y = 0;

        if (pos.y >= 0 && Math.abs(pos.y) + scrollbarLength <= height) {
          y = pos.y;
        }

        // prevent right over drag
        if (Math.abs(pos.y) + scrollbarLength > height) {
          y = height - scrollbarLength;
        }

        const newLayerY = -(y / height) * stageHeight;

        setTimelineLayerY(newLayerY);
        setVerticalScrollbarY(y);

        return { x: 0, y };
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
    <Flex direction="column" gap="size-50">
      <ToolsView
        playing={playing}
        togglePlayPause={togglePlayPause}
        percentComplete={percentComplete}
        duration={duration}
        position={position}
        zoomStep={zoomStep}
        zoomAmount={zoomAmount}
        initWidth={props.width}
        currentWidth={timelineInteractionState.width}
        windowWidth={windowWidth}
        calculateScrollbarLength={calculateHorizontalScrollbarLength}
        setWidth={(width: number) => {
          onWidthChanged(width);
        }}
      />
      <Flex direction="row" width={windowWidth}>
        <View
          width={getTimelineWindowWidth()}
          height={height}
          position={"relative"}
          overflow={"hidden"}
        >
          <View position={"absolute"} height={height}>
            <Stage
              width={getTimelineWindowWidth()}
              height={height}
              onClick={(e: any) => {
                seek(
                  ((e.evt.layerX + Math.abs(timelineInteractionState.layerX)) /
                    timelineInteractionState.width) *
                    duration
                );

                const emptySpace = e.target === e.target.getStage();
                // check for multiselectdragend because mouseup after dragging from left to right
                // triggers an onClick
                if (emptySpace && !multiSelectDragEndCoord) {
                  setSelectedLyricTextIds(new Set([]));
                }
              }}
              onWheel={(e: any) => {
                e.evt.preventDefault();
                debouncedHandleTimelineOnWheel(e);
              }}
              onMouseDown={(e: any) => {
                const emptySpace = e.target === e.target.getStage();
                if (emptySpace) {
                  setIsTimelineMouseDown(true);
                  setMultiSelectDragStartCoord({
                    x: e.evt.layerX - timelineInteractionState.layerX,
                    y: e.evt.layerY - timelineLayerY,
                  });
                }
              }}
              onMouseMove={(e: any) => {
                if (isTimelineMouseDown) {
                  setMultiSelectDragEndCoord({
                    x: e.evt.layerX - timelineInteractionState.layerX,
                    y: e.evt.layerY - timelineLayerY,
                  });
                }
              }}
              onMouseUp={() => {
                setIsTimelineMouseDown(false);
                setMultiSelectDragStartCoord(undefined);
                setMultiSelectDragEndCoord(undefined);
              }}
            >
              <Layer x={timelineInteractionState.layerX} y={timelineLayerY}>
                <Group>
                  {/* drag box */}
                  {multiSelectDragStartCoord && multiSelectDragEndCoord ? (
                    <Rect
                      x={multiSelectDragStartCoord.x}
                      y={multiSelectDragStartCoord.y}
                      width={Math.abs(
                        multiSelectDragStartCoord.x - multiSelectDragEndCoord.x
                      )}
                      height={Math.abs(
                        multiSelectDragStartCoord.y - multiSelectDragEndCoord.y
                      )}
                      fill="rgba(206, 81, 81, .1)"
                      scaleX={
                        multiSelectDragStartCoord.x > multiSelectDragEndCoord.x
                          ? -1
                          : 1
                      }
                      scaleY={
                        multiSelectDragStartCoord.y > multiSelectDragEndCoord.y
                          ? -1
                          : 1
                      }
                    />
                  ) : null}
                  {/* waveform plot */}
                  {waveformPlot}
                  {/* lyric texts */}
                </Group>
              </Layer>
              <Layer x={timelineInteractionState.layerX} y={timelineLayerY}>
                {lyricTextComponents}
              </Layer>
              <TimelineRuler
                width={timelineInteractionState.width}
                windowWidth={getTimelineWindowWidth()}
                scrollXOffset={timelineInteractionState.layerX}
                duration={duration}
              />
              {/* cursor */}
              <Layer x={timelineInteractionState.layerX}>
                <Rect
                  x={timelineInteractionState.cursorX}
                  y={0}
                  width={1}
                  height={stageHeight}
                  fill="#eaeaea"
                />
              </Layer>
            </Stage>
          </View>
          <View position={"absolute"} bottom={0} zIndex={1}>
            <Stage height={10} width={getTimelineWindowWidth()}>
              <Layer>{horizontalScrollbar}</Layer>
            </Stage>
          </View>
          {verticalScrollbarHeight !== height ? (
            <View position={"absolute"} right={2.5} zIndex={1}>
              <Stage height={height} width={10}>
                <Layer>{verticalScrollbar}</Layer>
              </Stage>
            </View>
          ) : null}
        </View>
        {isCustomizationPanelOpen ? (
          <View width={CUSTOMIZATION_PANEL_WIDTH}>
            <LyricTextCustomizationToolPanel height={height} />
          </View>
        ) : null}
      </Flex>
    </Flex>
  );
}
