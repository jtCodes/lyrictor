import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import usePrevious from "react-hooks-use-previous";
import { Group, Line, Rect, Text as KonvaText } from "react-konva";
import { KonvaImage } from "../../KonvaImage";
import { useEditorStore } from "../store";
import { LyricText } from "../types";
import {
  pixelsToSeconds,
  secondsToPixels,
  timelineLevelToY,
  yToTimelineLevel,
} from "../utils";
import { pushCollidingItemsUpFromLevel } from "./utils";
import { generateLyricTextId, useProjectStore } from "../../Project/store";

const TEXT_BOX_COLOR: string = "rgb(104, 109, 244)";
const IMAGE_BOX_COLOR: string = "rgb(204, 164, 253)";
const VISUALIZER_BOX_COLOR: string = "#008c87";
const LYRIC_TEXT_BOX_HANDLE_WIDTH: number = 2.5;
const TEXT_BOX_HEIGHT: number = 20;

export function TextBox({
  lyricText,
  index,
  width,
  windowWidth,
  duration,
  lyricTexts,
  setLyricTexts,
  setSelectedLyricText,
  isSelected,
  timelineY,
  selectedTexts,
}: {
  lyricText: LyricText;
  index: number;
  width: number;
  windowWidth: number | undefined;
  duration: number;
  lyricTexts: LyricText[];
  setLyricTexts: any;
  setSelectedLyricText: any;
  isSelected: boolean;
  timelineY: number;
  selectedTexts: Set<number>;
}) {
  const textBoxPointerY: number = 35;
  const textDuration: number = lyricText.end - lyricText.start;
  const [startX, setStartX] = useState(
    secondsToPixels(lyricText.start, duration, width)
  );
  const [endX, setEndX] = useState(
    secondsToPixels(lyricText.end, duration, width)
  );
  const [y, setY] = useState(
    timelineLevelToY(lyricText.textBoxTimelineLevel, timelineY)
  );
  // for when multidragging
  const [lyricTextY, setLyricTextY] = useState<number>(
    timelineLevelToY(lyricText.textBoxTimelineLevel, timelineY)
  );
  const [containerWidth, setContainerWidth] = useState(endX - startX);
  const prevLyricTexts = usePrevious(lyricTexts, []);

  const draggingLyricTextProgress = useEditorStore(
    (state) => state.draggingLyricTextProgress
  );
  const setDraggingLyricTextProgress = useEditorStore(
    (state) => state.setDraggingLyricTextProgress
  );
  const draggingLyricTextPreviewLevels = useEditorStore(
    (state) => state.draggingLyricTextPreviewLevels
  );
  const setDraggingLyricTextPreviewLevels = useEditorStore(
    (state) => state.setDraggingLyricTextPreviewLevels
  );
  const activeTimelineTool = useEditorStore((state) => state.activeTimelineTool);
  const setActiveTimelineTool = useEditorStore(
    (state) => state.setActiveTimelineTool
  );
  const setSelectedLyricTextIds = useEditorStore(
    (state) => state.setSelectedLyricTextIds
  );

  const layerX = useEditorStore(
    (state) => state.timelineInteractionState.layerX
  );
  const timelineLayerY = useEditorStore((state) => state.timelineLayerY);

  const leftHandleRef = useRef<any>(null);
  const rightHandleRef = useRef<any>(null);
  const containerRectRef = useRef<any>(null);

  // useEffect(() => {
  //   if (leftHandleRef.current) {
  //     leftHandleRef.current.cache();
  //   }
  // }, [leftHandleRef]);

  // useEffect(() => {
  //   if (rightHandleRef.current) {
  //     rightHandleRef.current.cache();
  //   }
  // }, [rightHandleRef]);

  // useEffect(() => {
  //   if (containerRectRef.current) {
  //     containerRectRef.current.cache();
  //   }
  // }, [containerRectRef]);

  useEffect(() => {
    if (duration > 0) {
      const newStartX = secondsToPixels(lyricText.start, duration, width);
      const newEndX = secondsToPixels(lyricText.end, duration, width);

      setStartX(newStartX);
      setEndX(newEndX);
      setY(timelineLevelToY(lyricText.textBoxTimelineLevel, timelineY));
      setContainerWidth(newEndX - newStartX);
      setLyricTextY(
        timelineLevelToY(lyricText.textBoxTimelineLevel, timelineY)
      );
    }
  }, [lyricText, duration]);

  useEffect(() => {
    const newStartX = secondsToPixels(lyricText.start, duration, width);
    const newEndX = secondsToPixels(lyricText.end, duration, width);

    setStartX(newStartX);
    setEndX(newEndX);
    setContainerWidth(newEndX - newStartX);
  }, [width]);

  useEffect(() => {
    if (draggingLyricTextProgress) {
      if (
        selectedTexts.has(lyricText.id) &&
        lyricText.id !== draggingLyricTextProgress?.startLyricText.id
      ) {
        const draggingTimeDelta =
          draggingLyricTextProgress.endLyricText.start -
          draggingLyricTextProgress.startLyricText.start;
        const draggingYDelta =
          draggingLyricTextProgress.startY - draggingLyricTextProgress.endY;

        setStartX(
          secondsToPixels(lyricText.start + draggingTimeDelta, duration, width)
        );
        setEndX(
          secondsToPixels(lyricText.end + draggingTimeDelta, duration, width)
        );
        setY(lyricTextY - draggingYDelta);
      }
    }
  }, [draggingLyricTextProgress]);

  useEffect(() => {
    const draggingId = draggingLyricTextProgress?.startLyricText.id;
    if (draggingId === lyricText.id) {
      return;
    }

    const previewLevel = draggingLyricTextPreviewLevels?.[lyricText.id];
    if (previewLevel !== undefined) {
      setY(timelineLevelToY(previewLevel, timelineY));
      return;
    }

    setY(timelineLevelToY(lyricText.textBoxTimelineLevel, timelineY));
  }, [
    draggingLyricTextPreviewLevels,
    draggingLyricTextProgress,
    lyricText.id,
    lyricText.textBoxTimelineLevel,
    timelineY,
  ]);

  function checkIfTwoLyricTextsOverlap(lyricA: LyricText, lyricB: LyricText) {
    if (lyricA.id === lyricB.id) {
      return false;
    }

    if (lyricA.start === lyricB.start) {
      return true;
    }

    if (lyricA.start < lyricB.start) {
      return lyricA.end >= lyricB.start;
    }

    return lyricB.end >= lyricA.start;
  }

  function handleTextBoxDrag(
    startX: number,
    textBoxWidth: number,
    windowWidth: number | undefined,
    index: number,
    fullKonvaWidth: number,
    audioDuration: number,
    textDuration: number,
    layerX: number
  ) {
    return (pos: Vector2d) => {
      // IMPORTANT: pos = local position

      // default prevent left over drag
      let localX = pos.x;

      // detect collision with prev
      const prevLyricText: LyricText | undefined = lyricTexts[index - 1];
      let isOverlapPrevLyricText: boolean = false;
      let newPrevEnd: number | undefined;
      if (prevLyricText) {
        const prevLyricTextEndX: number = secondsToPixels(
          prevLyricText.end,
          audioDuration,
          fullKonvaWidth
        );

        if (localX + Math.abs(layerX) <= prevLyricTextEndX) {
          localX = prevLyricTextEndX + layerX;
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

        if (localX + Math.abs(layerX) + textBoxWidth >= nextLyricTextStartX) {
          localX = nextLyricTextStartX - textBoxWidth + layerX;
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
              start: pixelsToSeconds(
                localX + Math.abs(layerX),
                fullKonvaWidth,
                audioDuration
              ),
              end:
                pixelsToSeconds(
                  localX + Math.abs(layerX),
                  fullKonvaWidth,
                  audioDuration
                ) + textDuration,
            };
          }

          return lyricText;
        }
      );

      setLyricTexts(updateLyricTexts);
      return { x: localX, y: textBoxPointerY };
    };
  }

  function handleDragStart(evt: KonvaEventObject<DragEvent>) {
    setDraggingLyricTextPreviewLevels(undefined);
    setDraggingLyricTextProgress({
      startLyricText: lyricText,
      endLyricText: lyricText,
      startY: lyricTextY,
      endY: lyricTextY,
    });
  }

  function handleDragEnd(evt: KonvaEventObject<DragEvent>) {
    if (evt.target.attrs.fill !== "white") {
      const localX = evt.target._lastPos.x;
      const localY = evt.target._lastPos.y;
      const localStart = pixelsToSeconds(localX + Math.abs(layerX), width, duration);
      const localEnd = localStart + textDuration;
      const preferredLevel = yToTimelineLevel(localY - timelineLayerY, timelineY);

      const updateLyricTexts = lyricTexts.map(
        (curLoopLyricText: LyricText, updatedIndex: number) => {
          if (curLoopLyricText.id === lyricText.id) {
            return {
              ...curLoopLyricText,
              start: localStart,
              end: localEnd,
              textBoxTimelineLevel: preferredLevel,
            };
          } else if (
            selectedTexts.has(curLoopLyricText.id) &&
            draggingLyricTextProgress
          ) {
            const draggingTimeDelta =
              draggingLyricTextProgress.endLyricText.start -
              draggingLyricTextProgress.startLyricText.start;
            const draggingYDelta =
              draggingLyricTextProgress.startY - draggingLyricTextProgress.endY;

            return {
              ...curLoopLyricText,
              start: curLoopLyricText.start + draggingTimeDelta,
              end: curLoopLyricText.end + draggingTimeDelta,
              textBoxTimelineLevel: yToTimelineLevel(
                timelineLevelToY(
                  curLoopLyricText.textBoxTimelineLevel,
                  timelineY
                ) - draggingYDelta,
                timelineY
              ),
            };
          }

          return curLoopLyricText;
        }
      );

      const pushedLyricTexts = pushCollidingItemsUpFromLevel({
        lyricTexts: updateLyricTexts,
        movingLyricTextId: lyricText.id,
        preferredLevel,
      });
      const finalizedDraggedLyricText = pushedLyricTexts.find(
        (currentLyricText) => currentLyricText.id === lyricText.id
      );
      const finalizedLevel =
        finalizedDraggedLyricText?.textBoxTimelineLevel ?? preferredLevel;

      setDraggingLyricTextProgress(undefined);
      setDraggingLyricTextPreviewLevels(undefined);
      setLyricTexts(pushedLyricTexts);
      evt.target.to({
        x: evt.target.x(),
        y: timelineLevelToY(finalizedLevel, timelineY),
      });
    }
  }

  function handleDragMove(evt: KonvaEventObject<DragEvent>) {
    if (evt.target.attrs.fill !== "white") {
      const localX = evt.target._lastPos.x;
      const localY = evt.target._lastPos.y;
      const localStart = pixelsToSeconds(localX + Math.abs(layerX), width, duration);
      const localEnd = localStart + textDuration;
      const preferredLevel = yToTimelineLevel(localY - timelineLayerY, timelineY);

      const previewDraftLyricTexts = lyricTexts.map((curLoopLyricText: LyricText) => {
        if (curLoopLyricText.id === lyricText.id) {
          return {
            ...curLoopLyricText,
            start: localStart,
            end: localEnd,
            textBoxTimelineLevel: preferredLevel,
          };
        }

        return curLoopLyricText;
      });

      const previewPushedLyricTexts = pushCollidingItemsUpFromLevel({
        lyricTexts: previewDraftLyricTexts,
        movingLyricTextId: lyricText.id,
        preferredLevel,
      });

      const previewLevels: Record<number, number> = {};
      previewPushedLyricTexts.forEach((previewLyricText) => {
        previewLevels[previewLyricText.id] = previewLyricText.textBoxTimelineLevel;
      });
      setDraggingLyricTextPreviewLevels(previewLevels);

      setDraggingLyricTextProgress({
        startLyricText: lyricText,
        endLyricText: {
          ...lyricTexts[index],
          start: localStart,
          end: localEnd,
          textBoxTimelineLevel: preferredLevel,
        },
        startY: lyricTextY,
        endY: localY - timelineLayerY,
      });
    }
  }

  function handleTextBoxClick(evt: KonvaEventObject<MouseEvent>) {
    if (activeTimelineTool !== "cut") {
      setSelectedLyricText(lyricText);
      return;
    }

    evt.cancelBubble = true;

    const stage = evt.target.getStage();
    const pointerPosition = stage?.getPointerPosition();
    if (!pointerPosition) {
      return;
    }

    const splitTime = pixelsToSeconds(pointerPosition.x + Math.abs(layerX), width, duration);

    if (splitTime <= lyricText.start || splitTime >= lyricText.end) {
      return;
    }

    const rightSegmentId = generateLyricTextId();
    const updatedLyricTexts = lyricTexts.flatMap((currentLyricText) => {
      if (currentLyricText.id !== lyricText.id) {
        return [currentLyricText];
      }

      const leftSegment: LyricText = {
        ...currentLyricText,
        end: splitTime,
      };

      const rightSegment: LyricText = {
        ...currentLyricText,
        id: rightSegmentId,
        start: splitTime,
      };

      return [leftSegment, rightSegment];
    });

    setLyricTexts(updatedLyricTexts);
    setSelectedLyricTextIds(new Set([lyricText.id, rightSegmentId]));
    setActiveTimelineTool("default");
  }

  const textBox = useMemo(() => {
    return (
      <Group
        key={index}
        width={containerWidth}
        height={TEXT_BOX_HEIGHT}
        y={y}
        x={startX}
        draggable={true}
        // dragBoundFunc={handleTextBoxDrag(
        //   startX,
        //   containerWidth,
        //   windowWidth,
        //   index,
        //   width,
        //   duration,
        //   textDuration,
        //   layerX
        // )}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={handleTextBoxClick}
        cornerRadius={2.5}
      >
        <Line
          points={[0, 0, 0, timelineY - y]}
          stroke={
            lyricText.isImage
              ? IMAGE_BOX_COLOR
              : lyricText.isVisualizer
              ? VISUALIZER_BOX_COLOR
              : TEXT_BOX_COLOR
          }
          strokeWidth={1}
        />
        <Rect
          ref={containerRectRef}
          perfectDrawEnabled={false}
          width={containerWidth}
          height={TEXT_BOX_HEIGHT}
          fill={
            lyricText.isImage
              ? IMAGE_BOX_COLOR
              : lyricText.isVisualizer
              ? VISUALIZER_BOX_COLOR
              : TEXT_BOX_COLOR
          }
          strokeWidth={isSelected ? 2 : 0} // border width
          stroke="orange" // border color
          cornerRadius={5}
        />
        {lyricText.isImage && lyricText.imageUrl ? (
          <KonvaImage
            url={lyricText.imageUrl}
            width={containerWidth}
            height={TEXT_BOX_HEIGHT}
            crop
            pixelate={4}
          />
        ) : (
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
        )}
        {/* left resize handle */}
        <Rect
          ref={leftHandleRef}
          x={0}
          width={LYRIC_TEXT_BOX_HANDLE_WIDTH}
          height={TEXT_BOX_HEIGHT}
          fill="white"
          draggable={true}
          dragBoundFunc={(pos: Vector2d) => {
            let localX = startX + layerX; // Initialize localX to the starting position

            // Ensure that the handle cannot go beyond the right side of the item
            // This assumes you have a way to calculate or retrieve the right edge position (`rightEdgeX`)
            let rightEdgeX = startX + layerX + containerWidth; // You need to define how to calculate `itemWidth`
            if (pos.x > rightEdgeX - LYRIC_TEXT_BOX_HANDLE_WIDTH) {
              localX = rightEdgeX - LYRIC_TEXT_BOX_HANDLE_WIDTH;
            } else {
              localX = pos.x;
            }

            // Update the lyric texts with the new start position
            const updateLyricTexts = lyricTexts.map(
              (oldLyricText: LyricText) => {
                if (oldLyricText.id === lyricText.id) {
                  return {
                    ...lyricText,
                    start: pixelsToSeconds(
                      localX + Math.abs(layerX),
                      width,
                      duration
                    ),
                  };
                }
                return oldLyricText;
              }
            );
            setLyricTexts(updateLyricTexts, false);

            return { x: startX + layerX, y: y + timelineLayerY };
          }}
          onDragEnd={() => {
            setLyricTexts(useProjectStore.getState().lyricTexts);
          }}
          onMouseEnter={(e) => {
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
          cornerRadius={5}
        />
        {/* right resize handle */}
        <Rect
          ref={rightHandleRef}
          x={containerWidth - LYRIC_TEXT_BOX_HANDLE_WIDTH}
          width={LYRIC_TEXT_BOX_HANDLE_WIDTH}
          height={TEXT_BOX_HEIGHT}
          fill="white"
          draggable={true}
          dragBoundFunc={(pos: Vector2d) => {
            // default prevent left over drag
            // localX = x relative to visible portion of the canvas, 0 to windowWidth
            let localX = startX + layerX;

            if (pos.x >= startX + layerX) {
              localX = pos.x;
            }

            const updateLyricTexts = lyricTexts.map(
              (oldLyricText: LyricText) => {
                if (oldLyricText.id === lyricText.id) {
                  return {
                    ...lyricText,
                    end: pixelsToSeconds(
                      localX + Math.abs(layerX) + LYRIC_TEXT_BOX_HANDLE_WIDTH,
                      width,
                      duration
                    ),
                  };
                }

                return oldLyricText;
              }
            );
            setLyricTexts(updateLyricTexts, false);

            return { x: localX, y: y + timelineLayerY };
          }}
          onDragEnd={() => {
            setLyricTexts(useProjectStore.getState().lyricTexts);
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
          cornerRadius={5}
        />
      </Group>
    );
  }, [
    y,
    startX,
    containerWidth,
    isSelected,
    lyricText,
    duration,
    width,
    draggingLyricTextProgress,
    activeTimelineTool,
  ]);

  return textBox;
}
