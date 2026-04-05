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
import { getElementType, pixelsToSeconds, yToTimelineLevel } from "../utils";
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
  widthFromZoomSliderValue,
} from "./zoom";

interface AudioTimelineProps {
  width: number;
  height: number;
  url: string;
  onPlaybackLoadError?: () => void | Promise<void>;
}

const GRAPH_HEIGHT = 72;
const RULER_HEIGHT = 15;
const SCROLLBAR_SIZE = 10;
const WAVEFORM_DIVIDER_COLOR = "rgba(255, 255, 255, 0.11)";
const PLAYHEAD_LINE_COLOR = "rgba(255, 183, 154, 0.98)";
const PLAYHEAD_GLOW_COLOR = "rgba(255, 167, 131, 0.24)";
const PLAYHEAD_MARKER_FILL_COLOR = "rgba(255, 214, 196, 0.92)";
const PLAYHEAD_MARKER_STROKE_COLOR = "rgba(255, 241, 233, 0.52)";
const HOVER_CURSOR_LINE_COLOR = "rgba(255, 255, 255, 0.34)";
const HOVER_CURSOR_GLOW_COLOR = "rgba(255, 255, 255, 0.08)";
const PLAYHEAD_MARKER_HALF_WIDTH = 3.5;
const MIN_LOOP_DURATION_SECONDS = 0.1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampLoopRange(start: number, end: number, duration: number) {
  if (duration <= 0) {
    return { start: 0, end: 0 };
  }

  const minimumLoopDuration = Math.min(MIN_LOOP_DURATION_SECONDS, duration);
  const clampedStart = clamp(start, 0, Math.max(0, duration - minimumLoopDuration));
  const clampedEnd = clamp(end, clampedStart + minimumLoopDuration, duration);

  return {
    start: clampedStart,
    end: clampedEnd,
  };
}

export default function AudioTimeline(props: AudioTimelineProps) {
  const { height, url, onPlaybackLoadError } = props;
  const zoomStep: number = 0.01;
  const timelineViewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number>(height);
  const isYouTubePlaybackUrl = /(^https?:\/\/.*googlevideo\.com\/)|(^https?:\/\/.*youtube\.com\/)|(^lyrictor-media:\/\/youtube-cache\/)/i.test(url);

  // ---------------------------------------------------------------------------
  // Store selectors
  // ---------------------------------------------------------------------------
  const { width: windowWidth } = useWindowSize();
  const timelineWindowWidth = Math.max(1, windowWidth ?? 0);

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
  const activeTimelineTool = useEditorStore((state) => state.activeTimelineTool);
  const setSelectedLyricTextIds = useEditorStore(
    (state) => state.setSelectedLyricTextIds
  );
  const setActiveTimelineTool = useEditorStore(
    (state) => state.setActiveTimelineTool
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
  const stageHeight = viewportHeight + 900;
  const [points, setPoints] = useState<number[]>([]);
  const [throttledTimelineLayerX, setThrottledTimelineLayerX] =
    useState<number>(0);
  const [throttledTimelineLayerY, setThrottledTimelineLayerY] =
    useState<number>(viewportHeight - stageHeight);

  const timelineInteractionState = useEditorStore((state) => state.timelineInteractionState);
  const timelineLoopEnabled = useEditorStore((state) => state.timelineLoopEnabled);
  const setTimelineLoopEnabled = useEditorStore(
    (state) => state.setTimelineLoopEnabled
  );
  const timelineLoopRange = useEditorStore((state) => state.timelineLoopRange);
  const setTimelineLoopRange = useEditorStore(
    (state) => state.setTimelineLoopRange
  );
  const verticalScrollbarTopOffset = RULER_HEIGHT;
  const verticalScrollbarBottomOffset = SCROLLBAR_SIZE;
  const verticalScrollbarTrackHeight = Math.max(
    0,
    viewportHeight - verticalScrollbarTopOffset - verticalScrollbarBottomOffset
  );
  const verticalScrollbarHeight = calculateVerticalScrollbarLength();
  const hasVerticalScrollbar =
    verticalScrollbarTrackHeight > 0 &&
    verticalScrollbarHeight < verticalScrollbarTrackHeight;
  const timelineViewportWidth = Math.max(
    1,
    timelineWindowWidth - (hasVerticalScrollbar ? SCROLLBAR_SIZE : 0)
  );
  const timelineWidth = timelineInteractionState.width > 0
    ? timelineInteractionState.width
    : timelineViewportWidth;
  const timelineLayerX = timelineInteractionState.layerX;
  const setTimelineInteractionState = useEditorStore(
    (state) => state.setTimelineInteractionState
  );

  const canHorizontalScroll = timelineWidth > timelineViewportWidth;
  const horizontalScrollbarWidth = calculateHorizontalScrollbarLength();
  const timelineBottomInset = SCROLLBAR_SIZE;
  const timelineStartY =
    stageHeight - GRAPH_HEIGHT / 2 - timelineBottomInset;

  const [horizontalScrollbarX, setHorizontalScrollbarX] = useState<number>(0);
  const [verticalScrollbarY, setVerticalScrollbarY] = useState<number>(
    verticalScrollbarTopOffset +
      Math.max(0, verticalScrollbarTrackHeight - verticalScrollbarHeight)
  );

  const [waveformData, setWaveformData] = useState<WaveformData>();
  const stageRef = useRef<any>(null);
  const playheadDragStageRectRef = useRef<DOMRect | null>(null);
  const isTrackingTimelinePointerRef = useRef(false);
  const isPointerDownInTimelineRef = useRef(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState<boolean>(false);

  const [isTimelineMouseDown, setIsTimelineMouseDown] =
    useState<boolean>(false);
  const [hoverCursorX, setHoverCursorX] = useState<number | null>(null);
  const [isTrackingTimelinePointer, setIsTrackingTimelinePointer] =
    useState<boolean>(false);
  const [multiSelectDragStartCoord, setMultiSelectDragStartCoord] =
    useState<Coordinate>();
  const [multiSelectDragEndCoord, setMultiSelectDragEndCoord] =
    useState<Coordinate>();

  const prevWidth = usePreviousNumber(timelineWidth);
  const prevMinTimelineWidth = usePreviousNumber(timelineViewportWidth);

  // ---------------------------------------------------------------------------
  // Audio player
  // ---------------------------------------------------------------------------
  const shouldUseHtml5Playback =
    /(^https?:\/\/.*googlevideo\.com\/)|(^https?:\/\/.*youtube\.com\/)/i.test(url);

  const { togglePlayPause, ready, playing, pause } =
    useAudioPlayer({
      src: url,
      format: ["webm", "m4a", "mp3", "wav", "ogg"],
      html5: shouldUseHtml5Playback,
      autoplay: false,
      onloaderror: async (id, error) => {
        console.log(" load error", error);
        await onPlaybackLoadError?.();
      },
      onload: () => {
        console.log("on load");
      },
      onend: () => console.log("sound has ended!"),
    });

  const { percentComplete, duration, seek, position } = useAudioPosition({
    highRefreshRate: true,
  });

  const { copiedLyricTexts, onCopy, onCut, onPaste, onDelete, handleOnEditMenuItemClick } =
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

              if (getElementType(lyricText) !== undefined) {
                setCustomizationPanelTabId("element_settings");
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
    duration,
    timelineStartY,
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
    () => {
      const half = Math.floor(points.length / 2);
      const upperPoints = points.slice(0, half);

      if (upperPoints.length < 4) {
        return null;
      }

      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      for (let i = 1; i < upperPoints.length; i += 2) {
        minY = Math.min(minY, upperPoints[i]);
        maxY = Math.max(maxY, upperPoints[i]);
      }

      const waveformBandHeight = GRAPH_HEIGHT / 2;
      const range = Math.max(1, maxY - minY);
      const normalizedUpperPoints: number[] = [];
      for (let i = 0; i < upperPoints.length; i += 2) {
        const normalizedY = ((upperPoints[i + 1] - minY) / range) * waveformBandHeight;
        normalizedUpperPoints.push(upperPoints[i], normalizedY);
      }

      const baselineY = waveformBandHeight;
      const firstX = normalizedUpperPoints[0];
      const lastX = normalizedUpperPoints[normalizedUpperPoints.length - 2];

      const topHalfWaveformAreaPoints = [
        ...normalizedUpperPoints,
        lastX,
        baselineY,
        firstX,
        baselineY,
      ];

      return (
        <Line
          points={topHalfWaveformAreaPoints}
          fill={"#2680eb"}
          closed={true}
          y={timelineStartY}
        />
      );
    },
    [points, timelineStartY]
  );

  // ---------------------------------------------------------------------------
  // Side effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setTimelineLayerY(viewportHeight - stageHeight);
  }, [viewportHeight, stageHeight, setTimelineLayerY]);

  useEffect(() => {
    const viewportElement = timelineViewportRef.current;
    if (!viewportElement) {
      return;
    }

    const updateViewportHeight = () => {
      setViewportHeight(Math.max(1, viewportElement.clientHeight));
    };

    updateViewportHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateViewportHeight();
    });

    resizeObserver.observe(viewportElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    throttleUpdateTimelineLayerX(timelineLayerX);
  }, [timelineLayerX]);

  useEffect(() => {
    throttleUpdateTimelineLayerY(timelineLayerY);
  }, [timelineLayerY]);

  useEffect(() => {
    const previousMinTimelineWidth = prevMinTimelineWidth ?? timelineViewportWidth;
    const shouldStickToMinimumZoom =
      timelineInteractionState.width === 0 ||
      timelineWidth <= previousMinTimelineWidth + 1;

    if (!shouldStickToMinimumZoom && timelineWidth >= timelineViewportWidth) {
      return;
    }

    onWidthChanged(shouldStickToMinimumZoom ? timelineViewportWidth : timelineWidth);
  }, [timelineInteractionState.width, timelineViewportWidth, timelineWidth, prevMinTimelineWidth]);

  useEffect(() => {
    if (duration <= 0) {
      return;
    }

    onWidthChanged(timelineWidth);
  }, [duration]);

  useEffect(() => {
    if (duration <= 0) {
      return;
    }

    const nextLoopRange = clampLoopRange(
      timelineLoopRange.start,
      timelineLoopRange.end > timelineLoopRange.start
        ? timelineLoopRange.end
        : duration,
      duration
    );

    if (
      nextLoopRange.start !== timelineLoopRange.start ||
      nextLoopRange.end !== timelineLoopRange.end
    ) {
      setTimelineLoopRange(nextLoopRange);
    }
  }, [duration, setTimelineLoopRange, timelineLoopRange.end, timelineLoopRange.start]);

  useEffect(() => {
    if (!timelineLoopEnabled || !playing || duration <= 0) {
      return;
    }

    const nextLoopRange = clampLoopRange(
      timelineLoopRange.start,
      timelineLoopRange.end,
      duration
    );

    if (
      nextLoopRange.start !== timelineLoopRange.start ||
      nextLoopRange.end !== timelineLoopRange.end
    ) {
      setTimelineLoopRange(nextLoopRange);
      return;
    }

    if (position < nextLoopRange.start) {
      seek(nextLoopRange.start);
      return;
    }

    if (position >= nextLoopRange.end - 0.01) {
      seek(nextLoopRange.start);
    }
  }, [
    duration,
    playing,
    position,
    seek,
    setTimelineLoopRange,
    timelineLoopEnabled,
    timelineLoopRange.end,
    timelineLoopRange.start,
  ]);

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

  useEffect(() => {
    const stageContainer = stageRef.current?.container();
    if (!stageContainer) {
      return;
    }

    stageContainer.style.cursor = activeTimelineTool === "cut" ? "crosshair" : "default";

    return () => {
      stageContainer.style.cursor = "default";
    };
  }, [activeTimelineTool]);

  useEffect(() => {
    isTrackingTimelinePointerRef.current = isTrackingTimelinePointer;
  }, [isTrackingTimelinePointer]);

  function setTimelineContainerCursor(cursor: string) {
    const stageContainer = stageRef.current?.container();
    if (stageContainer) {
      stageContainer.style.cursor = cursor;
    }
  }

  function resetTimelineContainerCursor() {
    setTimelineContainerCursor(
      activeTimelineTool === "cut" ? "crosshair" : "default"
    );
  }

  useEffect(() => {
    function updateHoverCursorFromPointer(clientX: number, clientY: number) {
      const stageContainer = stageRef.current?.container();
      if (!stageContainer) {
        return false;
      }

      const rect = stageContainer.getBoundingClientRect();
      const isWithinHorizontalBounds = clientX >= rect.left && clientX <= rect.right;
      const isWithinVerticalBounds = clientY >= rect.top && clientY <= rect.bottom;
      const isWithinBounds = isWithinHorizontalBounds && isWithinVerticalBounds;

      if (!isWithinBounds) {
        setHoverCursorX((prev) => (prev === null ? prev : null));
        return false;
      }

      const localX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const nextHoverCursorX = getTimelinePointerX(localX);
      setHoverCursorX((prev) =>
        prev !== null && Math.abs(prev - nextHoverCursorX) < 0.25
          ? prev
          : nextHoverCursorX
      );
      return true;
    }

    if (!isTrackingTimelinePointer) {
      return;
    }

    function handleWindowMouseMove(event: MouseEvent) {
      updateHoverCursorFromPointer(event.clientX, event.clientY);
    }

    function handleWindowMouseUp(event: MouseEvent) {
      isPointerDownInTimelineRef.current = false;
      const isWithinBounds = updateHoverCursorFromPointer(event.clientX, event.clientY);
      if (!isWithinBounds) {
        setIsTrackingTimelinePointer(false);
      }
    }

    function handleWindowMouseLeave() {
      isPointerDownInTimelineRef.current = false;
      setHoverCursorX((prev) => (prev === null ? prev : null));
      setIsTrackingTimelinePointer(false);
    }

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    document.addEventListener("mouseleave", handleWindowMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      document.removeEventListener("mouseleave", handleWindowMouseLeave);
    };
  }, [isTrackingTimelinePointer, timelineLayerX, timelineWidth]);

  useEffect(() => {
    if (!isDraggingPlayhead) {
      return;
    }

    function updatePlayheadFromPointer(clientX: number) {
      const rect = playheadDragStageRectRef.current;
      if (!rect) {
        return;
      }

      const localX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      seekToTimelineX(getTimelinePointerX(localX));
    }

    function handleWindowMouseMove(event: MouseEvent) {
      updatePlayheadFromPointer(event.clientX);
    }

    function handleWindowMouseUp(event: MouseEvent) {
      updatePlayheadFromPointer(event.clientX);
      playheadDragStageRectRef.current = null;
      setIsDraggingPlayhead(false);
      resetTimelineContainerCursor();
    }

    function handleWindowBlur() {
      playheadDragStageRectRef.current = null;
      setIsDraggingPlayhead(false);
      resetTimelineContainerCursor();
    }

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      playheadDragStageRectRef.current = null;
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isDraggingPlayhead, timelineLayerX, timelineWidth, duration, activeTimelineTool]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------
  useKeyboardActions(
    [
      {
        key: "=",
        action: () => {
          if (getTimelineWindowWidth()) {
            const nextWidth = getNextZoomInWidth(
              timelineWidth,
              timelineViewportWidth,
              duration
            );
            onWidthChanged(nextWidth);
          }
        },
      },
      {
        key: "-",
        action: () => {
          if (getTimelineWindowWidth()) {
            const nextWidth = getNextZoomOutWidth(
              timelineWidth,
              timelineViewportWidth
            );
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
      {
        key: "Escape",
        action: () => setActiveTimelineTool("default"),
      },
      { key: "c", combo: true, action: () => onCopy() },
      { key: "x", action: () => onCut() },
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
    const maxTimelineWidth = widthFromZoomSliderValue(
      timelineViewportWidth,
      1,
      duration
    );
    width = Math.min(maxTimelineWidth, Math.max(width, timelineViewportWidth));

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
        width - timelineViewportWidth < timelineViewportWidth * (zoomStep * 0.1) &&
        width - timelineViewportWidth < Math.abs(timelineLayerX)
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

    const proportional = (viewportHeight / stageHeight) * verticalScrollbarTrackHeight;
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
    return timelineViewportWidth;
  }

  function getTimelinePointerX(layerX: number) {
    return Math.max(0, Math.min(timelineWidth, layerX - timelineLayerX));
  }

  function handleLoopToggle() {
    if (duration <= 0) {
      return;
    }

    if (!timelineLoopEnabled) {
      const nextLoopRange = clampLoopRange(
        timelineLoopRange.start,
        timelineLoopRange.end > timelineLoopRange.start
          ? timelineLoopRange.end
          : duration,
        duration
      );

      setTimelineLoopRange(nextLoopRange);
      setTimelineLoopEnabled(true);

      if (position < nextLoopRange.start || position > nextLoopRange.end) {
        seek(nextLoopRange.start);
      }

      return;
    }

    setTimelineLoopEnabled(false);
  }

  function handleLoopRangeChange(start: number, end: number) {
    if (duration <= 0) {
      return;
    }

    setTimelineLoopRange(clampLoopRange(start, end, duration));
  }

  function handleTogglePlayPause() {
    if (!playing && timelineLoopEnabled && duration > 0) {
      const nextLoopRange = clampLoopRange(
        timelineLoopRange.start,
        timelineLoopRange.end,
        duration
      );

      if (position < nextLoopRange.start || position >= nextLoopRange.end) {
        seek(nextLoopRange.start);
      }
    }

    togglePlayPause();
  }

  function seekToTimelineX(timelineX: number) {
    if (duration <= 0) {
      return;
    }

    const clampedTimelineX = Math.max(0, Math.min(timelineWidth, timelineX));
    seek((clampedTimelineX / timelineWidth) * duration);
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
      const maxVerticalLayerOffset = Math.max(0, stageHeight - viewportHeight);
      const maxThumbTravel = Math.max(
        0,
        verticalScrollbarTrackHeight - verticalScrollbarHeight
      );

      if (newLayerY < 0 && Math.abs(newLayerY) < stageHeight - viewportHeight) {
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
        setTimelineLayerY(-(stageHeight - viewportHeight));
        setVerticalScrollbarY(verticalScrollbarTopOffset + maxThumbTravel);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ToolsView
        playing={playing}
        togglePlayPause={handleTogglePlayPause}
        percentComplete={percentComplete}
        duration={duration}
        position={position}
        initWidth={timelineViewportWidth}
        currentWidth={timelineWidth}
        setWidth={(width: number) => {
          onWidthChanged(width);
        }}
        onItemClick={handleOnEditMenuItemClick}
        seek={seek}
        loopEnabled={timelineLoopEnabled}
        onLoopToggle={handleLoopToggle}
      />
      <div
        ref={timelineViewportRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
        }}
      >
        <Flex direction="row" width={windowWidth} height="100%">
        <View
          width={timelineWindowWidth}
          height={viewportHeight}
          position={"relative"}
          overflow={"hidden"}
          UNSAFE_style={{ backgroundColor: "#131418" }}
        >
          <View position={"absolute"} height={viewportHeight} width={getTimelineWindowWidth()}>
            <Stage
              ref={stageRef}
              width={getTimelineWindowWidth()}
              height={viewportHeight}
              onClick={(e: any) => {
                const timelinePointerX = getTimelinePointerX(e.evt.layerX);
                seekToTimelineX(timelinePointerX);

                const emptySpace = e.target === e.target.getStage();
                // check for multiselectdragend because mouseup after dragging from left to right
                // triggers an onClick
                if (emptySpace && !multiSelectDragEndCoord) {
                  if (activeTimelineTool === "cut") {
                    setActiveTimelineTool("default");
                  }
                  setSelectedLyricTextIds(new Set([]));
                }
              }}
              onWheel={(e: any) => {
                e.evt.preventDefault();
                debouncedHandleTimelineOnWheel(e);
              }}
              onMouseDown={(e: any) => {
                isPointerDownInTimelineRef.current = true;
                if (!isTrackingTimelinePointerRef.current) {
                  setIsTrackingTimelinePointer(true);
                }

                const emptySpace = e.target === e.target.getStage();
                if (emptySpace) {
                  setIsTimelineMouseDown(true);
                  setHoverCursorX((prev) => (prev === null ? prev : null));
                  setMultiSelectDragStartCoord({
                    x: getTimelinePointerX(e.evt.layerX),
                    y: e.evt.layerY - timelineLayerY,
                  });
                }
              }}
              onMouseMove={(e: any) => {
                if (!isTrackingTimelinePointerRef.current) {
                  setIsTrackingTimelinePointer(true);
                }

                if (isTimelineMouseDown) {
                  setMultiSelectDragEndCoord({
                    x: getTimelinePointerX(e.evt.layerX),
                    y: e.evt.layerY - timelineLayerY,
                  });
                  return;
                }

                const nextHoverCursorX = getTimelinePointerX(e.evt.layerX);
                setHoverCursorX((prev) =>
                  prev !== null && Math.abs(prev - nextHoverCursorX) < 0.25
                    ? prev
                    : nextHoverCursorX
                );
              }}
              onMouseUp={(e: any) => {
                isPointerDownInTimelineRef.current = false;
                setIsTimelineMouseDown(false);
                setMultiSelectDragStartCoord(undefined);
                setMultiSelectDragEndCoord(undefined);
                const nextHoverCursorX = getTimelinePointerX(e.evt.layerX);
                setHoverCursorX((prev) =>
                  prev !== null && Math.abs(prev - nextHoverCursorX) < 0.25
                    ? prev
                    : nextHoverCursorX
                );
              }}
              onMouseEnter={() => {
                if (!isTrackingTimelinePointerRef.current) {
                  setIsTrackingTimelinePointer(true);
                }
              }}
              onMouseLeave={() => {
                if (!isPointerDownInTimelineRef.current) {
                  setHoverCursorX((prev) => (prev === null ? prev : null));
                  setIsTrackingTimelinePointer(false);
                }
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
                loopEnabled={timelineLoopEnabled}
                loopRange={timelineLoopRange}
                onLoopRangeChange={({ start, end }) => {
                  handleLoopRangeChange(start, end);
                }}
              />
              {/* cursor */}
              <Layer x={timelineLayerX} listening={false}>
                {hoverCursorX !== null ? (
                  <>
                    <Rect
                      x={hoverCursorX - 1.5}
                      y={0}
                      width={3}
                      height={stageHeight}
                      fill={HOVER_CURSOR_GLOW_COLOR}
                    />
                    <Rect
                      x={hoverCursorX}
                      y={0}
                      width={1}
                      height={stageHeight}
                      fill={HOVER_CURSOR_LINE_COLOR}
                    />
                  </>
                ) : null}
                <Rect
                  x={cursorX - 1}
                  y={RULER_HEIGHT - 2}
                  width={2}
                  height={stageHeight - (RULER_HEIGHT - 2)}
                  fill={PLAYHEAD_GLOW_COLOR}
                />
                <Rect
                  x={cursorX - 0.5}
                  y={RULER_HEIGHT - 2}
                  width={1}
                  height={stageHeight - (RULER_HEIGHT - 2)}
                  fill={PLAYHEAD_LINE_COLOR}
                />
              </Layer>
              <Layer x={timelineLayerX}>
                <Line
                  points={[
                    -PLAYHEAD_MARKER_HALF_WIDTH,
                    2,
                    PLAYHEAD_MARKER_HALF_WIDTH,
                    2,
                    0,
                    RULER_HEIGHT - 2,
                  ]}
                  x={cursorX}
                  closed
                  fill={PLAYHEAD_MARKER_FILL_COLOR}
                  stroke={PLAYHEAD_MARKER_STROKE_COLOR}
                  strokeWidth={1}
                  lineJoin="round"
                  onMouseDown={(event) => {
                    event.cancelBubble = true;
                    event.evt.preventDefault();
                    const stageContainer = stageRef.current?.container();
                    playheadDragStageRectRef.current =
                      stageContainer?.getBoundingClientRect() ?? null;
                    isPointerDownInTimelineRef.current = false;
                    setIsTimelineMouseDown(false);
                    setMultiSelectDragStartCoord(undefined);
                    setMultiSelectDragEndCoord(undefined);
                    setIsDraggingPlayhead(true);
                    setTimelineContainerCursor("grabbing");
                    seekToTimelineX(cursorX);
                  }}
                  onClick={(event) => {
                    event.cancelBubble = true;
                  }}
                  onMouseEnter={() => {
                    if (!isDraggingPlayhead) {
                      setTimelineContainerCursor("grab");
                    }
                  }}
                  onMouseLeave={() => {
                    if (!isDraggingPlayhead) {
                      resetTimelineContainerCursor();
                    }
                  }}
                />
              </Layer>
            </Stage>
          </View>
          <TimelineScrollbars
            windowWidth={getTimelineWindowWidth()}
            canHorizontalScroll={canHorizontalScroll}
            height={viewportHeight}
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
      </div>
    </div>
  );
}
