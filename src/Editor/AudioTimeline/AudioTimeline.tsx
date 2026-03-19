import { Flex, View } from "@adobe/react-spectrum";
import { KonvaEventObject } from "konva/lib/Node";
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
import TimelineScrollbars from "./TimelineScrollbars";
import {
  calculateHorizontalScrollbarLength as calculateHorizontalScrollbarLengthForTimeline,
  getNextZoomInWidth,
  getNextZoomOutWidth,
} from "./zoom";

interface AudioTimelineProps {
  width: number;
  height: number;
  url: string;
}

const GRAPH_HEIGHT = 90;
const RULER_HEIGHT = 15;
const SCROLLBAR_SIZE = 10;
const WAVEFORM_DIVIDER_COLOR = "rgba(255, 255, 255, 0.11)";

export default function AudioTimeline(props: AudioTimelineProps) {
  const { height, url } = props;
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

  const canHorizontalScroll = timelineWidth > getTimelineWindowWidth();
  const horizontalScrollbarWidth = calculateHorizontalScrollbarLength();
  const verticalScrollbarTopOffset = RULER_HEIGHT;
  const verticalScrollbarBottomOffset = canHorizontalScroll ? SCROLLBAR_SIZE : 0;
  const verticalScrollbarTrackHeight = Math.max(
    0,
    height - verticalScrollbarTopOffset - verticalScrollbarBottomOffset
  );
  const verticalScrollbarHeight = calculateVerticalScrollbarLength();
  const timelineBottomInset = canHorizontalScroll ? SCROLLBAR_SIZE : 0;
  const timelineStartY =
    stageHeight - GRAPH_HEIGHT / 2 - timelineBottomInset;

  const [horizontalScrollbarX, setHorizontalScrollbarX] = useState<number>(0);
  const [verticalScrollbarY, setVerticalScrollbarY] = useState<number>(
    verticalScrollbarTopOffset +
      Math.max(0, verticalScrollbarTrackHeight - verticalScrollbarHeight)
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
    if (!canHorizontalScroll) {
      setHorizontalScrollbarX(0);
      if (timelineLayerX !== 0) {
        setTimelineInteractionState({
          ...timelineInteractionState,
          layerX: 0,
        });
      }
    }
  }, [canHorizontalScroll, timelineLayerX, timelineInteractionState]);

  useEffect(() => {
    const maxThumbTravel = Math.max(
      0,
      verticalScrollbarTrackHeight - verticalScrollbarHeight
    );
    const minY = verticalScrollbarTopOffset;
    const maxY = verticalScrollbarTopOffset + maxThumbTravel;

    setVerticalScrollbarY((prev) => Math.min(maxY, Math.max(minY, prev)));
  }, [
    verticalScrollbarTopOffset,
    verticalScrollbarTrackHeight,
    verticalScrollbarHeight,
  ]);

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
          if (getTimelineWindowWidth()) {
            const nextWidth = getNextZoomInWidth(timelineWidth, props.width);
            onWidthChanged(nextWidth);
          }
        },
      },
      {
        key: "-",
        action: () => {
          if (getTimelineWindowWidth()) {
            const nextWidth = getNextZoomOutWidth(timelineWidth, props.width);
            onWidthChanged(nextWidth);
          }
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

  function calculateHorizontalScrollbarLength(): number {
    const windowWidth = getTimelineWindowWidth();
    return calculateHorizontalScrollbarLengthForTimeline(windowWidth, timelineWidth);
  }

  function calculateVerticalScrollbarLength(): number {
    if (verticalScrollbarTrackHeight <= 0) return 0;

    const proportional = (height / stageHeight) * verticalScrollbarTrackHeight;
    const length = Math.max(20, proportional);
    return Math.min(length, verticalScrollbarTrackHeight);
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
      if (!canHorizontalScroll) {
        setHorizontalScrollbarX(0);
        setTimelineInteractionState({
          ...timelineInteractionState,
          layerX: 0,
        });
        return;
      }

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
      const maxVerticalLayerOffset = Math.max(0, stageHeight - height);
      const maxThumbTravel = Math.max(
        0,
        verticalScrollbarTrackHeight - verticalScrollbarHeight
      );

      if (newLayerY < 0 && Math.abs(newLayerY) < stageHeight - height) {
        setTimelineLayerY(newLayerY);
        const ratio =
          maxVerticalLayerOffset > 0
            ? Math.min(1, Math.max(0, -newLayerY / maxVerticalLayerOffset))
            : 0;
        setVerticalScrollbarY(verticalScrollbarTopOffset + ratio * maxThumbTravel);
      } else if (newLayerY >= 0) {
        setTimelineLayerY(0);
        setVerticalScrollbarY(verticalScrollbarTopOffset);
      } else {
        setTimelineLayerY(-(stageHeight - height));
        setVerticalScrollbarY(verticalScrollbarTopOffset + maxThumbTravel);
      }
    }
  }

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
        initWidth={props.width}
        currentWidth={timelineWidth}
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
                  <Line
                    points={[0, 0, timelineWidth, 0]}
                    x={0}
                    y={timelineStartY}
                    stroke={WAVEFORM_DIVIDER_COLOR}
                    strokeWidth={1}
                  />
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
          <TimelineScrollbars
            windowWidth={getTimelineWindowWidth()}
            canHorizontalScroll={canHorizontalScroll}
            height={height}
            timelineWidth={timelineWidth}
            stageHeight={stageHeight}
            verticalScrollbarTopOffset={verticalScrollbarTopOffset}
            verticalScrollbarTrackHeight={verticalScrollbarTrackHeight}
            horizontalScrollbarWidth={horizontalScrollbarWidth}
            verticalScrollbarHeight={verticalScrollbarHeight}
            horizontalScrollbarX={horizontalScrollbarX}
            verticalScrollbarY={verticalScrollbarY}
            onHorizontalThumbXChange={setHorizontalScrollbarX}
            onHorizontalLayerXChange={(layerX) => {
              setTimelineInteractionState({
                ...timelineInteractionState,
                layerX,
              });
            }}
            onVerticalThumbYChange={setVerticalScrollbarY}
            onVerticalLayerYChange={setTimelineLayerY}
          />
        </View>
      </Flex>
    </Flex>
  );
}
