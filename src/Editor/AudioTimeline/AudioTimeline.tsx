import { Flex, View } from "@adobe/react-spectrum";
import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePreviousNumber } from "react-hooks-use-previous";
import { Group, Layer, Line, Rect, Stage } from "react-konva";
import { useAudioPlayer, useAudioPosition } from "react-use-audio-player";
import WaveformData from "waveform-data";
import { useProjectStore } from "../../Project/store";
import {
  useKeyboardActions,
  useWindowSize,
} from "../../utils";
import { Coordinate, LyricText, ScrollDirection } from "../types";
import { pixelsToSeconds, yToTimelineLevel } from "../utils";
import { TextBox } from "./TextBox";
import TimelineRuler from "./TimelineRuler";
import { ToolsView } from "./Tools/ToolsView";
import {
  generateWaveformData,
  generateWaveformLinePoints,
  getVisibleSongRange,
} from "./utils";
import debounce from "lodash.debounce";
import throttle from "lodash.throttle";
import { useEditorStore } from "../store";
import { useEditActions } from "./useEditActions";
import { ToastQueue } from "@react-spectrum/toast";
import { Howler } from "howler";

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

  // ---------------------------------------------------------------------------
  // Store selectors
  // ---------------------------------------------------------------------------
  const { width: windowWidth } = useWindowSize();

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
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );
  const setSelectedLyricTextIds = useEditorStore(
    (state) => state.setSelectedLyricTextIds
  );

  const toggleCustomizationPanelState = useEditorStore(
    (state) => state.toggleCustomizationPanelOpenState
  );
  const setCustomizationPanelTabId = useEditorStore(
    (state) => state.setCustomizationPanelTabId
  );

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------
  const stageHeight = height + 900;
  const [points, setPoints] = useState<number[]>([]);
  const [throttledTimelineLayerX, setThrottledTimelineLayerX] =
    useState<number>(0);
  const [throttledTimelineLayerY, setThrottledTimelineLayerY] =
    useState<number>(height - stageHeight);

  const timelineInteractionState = useEditorStore((state) => state.timelineInteractionState);
  const timelineWidth = timelineInteractionState.width > 0
    ? timelineInteractionState.width
    : props.width;
  const timelineLayerX = timelineInteractionState.layerX;
  const setTimelineInteractionState = useEditorStore(
    (state) => state.setTimelineInteractionState
  );

  const verticalScrollbarHeight = calculateVerticalScrollbarLength();
  const horizontalScrollbarWidth = calculateHorizontalScrollbarLength();
  const timelineStartY = stageHeight - GRAPH_HEIGHT / 2;

  const [horizontalScrollbarX, setHorizontalScrollbarX] = useState<number>(0);
  const [verticalScrollbarY, setVerticalScrollbarY] = useState<number>(
    height - verticalScrollbarHeight
  );

  const [waveformData, setWaveformData] = useState<WaveformData>();

  const [isTimelineMouseDown, setIsTimelineMouseDown] =
    useState<boolean>(false);
  const [multiSelectDragStartCoord, setMultiSelectDragStartCoord] =
    useState<Coordinate>();
  const [multiSelectDragEndCoord, setMultiSelectDragEndCoord] =
    useState<Coordinate>();

  const prevWidth = usePreviousNumber(timelineWidth);

  // ---------------------------------------------------------------------------
  // Audio player
  // ---------------------------------------------------------------------------
  const { togglePlayPause, ready, playing, pause } =
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

  const { copiedLyricTexts, onCopy, onPaste, onDelete, handleOnEditMenuItemClick } =
    useEditActions({ timelineWidth, duration });

  // ---------------------------------------------------------------------------
  // Memoized values
  // ---------------------------------------------------------------------------
  const lyricTextComponents = useMemo(() => {
    const visibleTimeRange = getVisibleSongRange({
      width: timelineWidth,
      windowWidth: getTimelineWindowWidth(),
      duration,
      scrollXOffSet: timelineLayerX,
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
            width={timelineWidth}
            windowWidth={getTimelineWindowWidth()}
            duration={duration}
            lyricTexts={lyricTexts}
            setLyricTexts={setLyricTexts}
            setSelectedLyricText={(lyricText: LyricText) => {
              setSelectedLyricTextIds(new Set([lyricText.id]));
              toggleCustomizationPanelState(true);

              if (lyricText.isVisualizer) {
                setCustomizationPanelTabId("visualizer_settings");
              } else if (lyricText.isImage) {
                setCustomizationPanelTabId("image_settings");
              } else {
                setCustomizationPanelTabId("text_settings");
              }
            }}
            isSelected={selectedLyricTextIds.has(lyricText.id)}
            timelineY={timelineStartY}
            selectedTexts={selectedLyricTextIds}
          />
        );
      });
  }, [
    lyricTexts,
    points,
    selectedLyricTextIds,
    throttledTimelineLayerX,
    throttledTimelineLayerY,
    timelineWidth,
    timelineLayerX,
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
      <Line points={points} fill={"#2680eb"} closed={true} y={timelineStartY} />
    ),
    [points]
  );

  // ---------------------------------------------------------------------------
  // Side effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setTimelineLayerY(height - stageHeight);
  }, []);

  useEffect(() => {
    throttleUpdateTimelineLayerX(timelineLayerX);
  }, [timelineLayerX]);

  useEffect(() => {
    throttleUpdateTimelineLayerY(timelineLayerY);
  }, [timelineLayerY]);

  useEffect(() => {
    if (isProjectPopupOpen) {
      pause();
    }
  }, [isProjectPopupOpen]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    generateWaveformData(url, Howler.ctx).then((waveform) => {
      if (cancelled) return;
      setWaveformData(waveform);
      setPoints(generateWaveformLinePoints(waveform, timelineWidth));
    }).catch((err) => {
      if (cancelled) return;
      ToastQueue.negative(`Failed to load audio waveform: ${err.message}`, { timeout: 5000 });
    });
    return () => { cancelled = true; };
  }, [editingProject, ready, url]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------
  useKeyboardActions(
    [
      {
        key: "=",
        action: () => {
          if (getTimelineWindowWidth())
            onWidthChanged(timelineWidth + zoomAmount);
        },
      },
      {
        key: "-",
        action: () => {
          if (getTimelineWindowWidth())
            onWidthChanged(timelineWidth - zoomAmount);
        },
      },
      {
        key: "Delete",
        action: () => onDelete(),
      },
      {
        key: "Backspace",
        action: () => onDelete(),
      },
      { key: " ", action: () => togglePlayPause() },
      { key: "c", combo: true, action: () => onCopy() },
      { key: "v", combo: true, action: () => onPaste() },
      { key: "z", combo: true, action: () => undoLyricTextsHistory(), always: true },
      { key: "z", combo: true, shift: true, action: () => redoLyricTextUndo(), always: true },
    ],
    [
      timelineInteractionState,
      lyricTexts,
      selectedLyricTextIds,
      copiedLyricTexts,
      duration,
      togglePlayPause,
    ],
    { isEditing, isPopupOpen: isProjectPopupOpen }
  );

  const cursorX = (percentComplete / 100) * timelineWidth;

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
        timelineWidth,
        duration
      );

      const dragEndTime = pixelsToSeconds(
        multiSelectDragEndCoord.x,
        timelineWidth,
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

  // ---------------------------------------------------------------------------
  // Zoom & scroll
  // ---------------------------------------------------------------------------
  function onWidthChanged(width: number) {
    if (waveformData) {
      setPoints(generateWaveformLinePoints(waveformData, width));
    }

    const newCursorX = (percentComplete / 100) * width;

    if (getTimelineWindowWidth()) {
      let newLayerX =
        timelineLayerX -
        (newCursorX - cursorX);
      let newScrollBarX = 0;

      if (
        prevWidth > width &&
        width - props.width < props.width * (zoomStep * 0.1) &&
        width - props.width < Math.abs(timelineLayerX)
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
      if (windowWidth < timelineWidth) {
        if ((windowWidth / timelineWidth) * windowWidth > 20) {
          length = (windowWidth / timelineWidth) * windowWidth;
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

  const handleTimelineOnWheelRef = useRef(handleTimelineOnWheel);
  handleTimelineOnWheelRef.current = handleTimelineOnWheel;

  const debouncedHandleTimelineOnWheel = useMemo(
    () => debounce((e: KonvaEventObject<WheelEvent>) => handleTimelineOnWheelRef.current(e), 3),
    []
  );

  function getTimelineWindowWidth() {
    return windowWidth ?? 0;
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
      let newLayerX = timelineLayerX - dx;

      if (
        newLayerX < 0 &&
        Math.abs(newLayerX) < timelineWidth - windowWidth!
      ) {
        newLayerX = timelineLayerX - dx;
        setHorizontalScrollbarX(
          (-newLayerX / timelineWidth) * windowWidth!
        );
      } else if (newLayerX >= 0) {
        newLayerX = 0;
        setHorizontalScrollbarX(0);
      } else {
        newLayerX = -(timelineWidth - windowWidth!);
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

  // ---------------------------------------------------------------------------
  // Scrollbar elements (Konva Rects)
  // ---------------------------------------------------------------------------
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

        const newLayerX = -(x / windowWidth!) * timelineWidth;

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Flex direction="column" gap="size-40" height={"100%"}>
      <ToolsView
        playing={playing}
        togglePlayPause={togglePlayPause}
        percentComplete={percentComplete}
        duration={duration}
        position={position}
        zoomStep={zoomStep}
        zoomAmount={zoomAmount}
        initWidth={props.width}
        currentWidth={timelineWidth}
        windowWidth={windowWidth}
        calculateScrollbarLength={calculateHorizontalScrollbarLength}
        setWidth={(width: number) => {
          onWidthChanged(width);
        }}
        onItemClick={handleOnEditMenuItemClick}
        seek={seek}
        play={() => { if (!playing) togglePlayPause(); }}
        pause={pause}
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
                  ((e.evt.layerX + Math.abs(timelineLayerX)) /
                    timelineWidth) *
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
                    x: e.evt.layerX - timelineLayerX,
                    y: e.evt.layerY - timelineLayerY,
                  });
                }
              }}
              onMouseMove={(e: any) => {
                if (isTimelineMouseDown) {
                  setMultiSelectDragEndCoord({
                    x: e.evt.layerX - timelineLayerX,
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
              <Layer x={timelineLayerX} y={timelineLayerY}>
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
              <Layer x={timelineLayerX} y={timelineLayerY}>
                {lyricTextComponents}
              </Layer>
              <TimelineRuler
                width={timelineWidth}
                windowWidth={getTimelineWindowWidth()}
                scrollXOffset={timelineLayerX}
                duration={duration}
              />
              {/* cursor */}
              <Layer x={timelineLayerX}>
                <Rect
                  x={cursorX}
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
      </Flex>
    </Flex>
  );
}
