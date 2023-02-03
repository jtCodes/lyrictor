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

const TEXT_BOX_COLOR: string = "rgb(104, 109, 244)";
const IMAGE_BOX_COLOR: string = "rgb(204, 164, 253)";
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

  const layerX = useEditorStore((state) => state.timelineLayerX);
  const timelineLayerY = useEditorStore((state) => state.timelineLayerY);

  const leftHandleRef = useRef<any>();
  const rightHandleRef = useRef<any>();
  const containerRectRef = useRef<any>();

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
      let newPrevEnd: number;
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
      const updateLyricTexts = lyricTexts.map(
        (curLoopLyricText: LyricText, updatedIndex: number) => {
          if (curLoopLyricText.id === lyricText.id) {
            return {
              ...curLoopLyricText,
              start: pixelsToSeconds(
                localX + Math.abs(layerX),
                width,
                duration
              ),
              end:
                pixelsToSeconds(localX + Math.abs(layerX), width, duration) +
                textDuration,
              textBoxTimelineLevel: yToTimelineLevel(
                localY - timelineLayerY,
                timelineY
              ),
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

      setDraggingLyricTextProgress(undefined);
      setLyricTexts(updateLyricTexts);
      evt.target.to({
        x: evt.target.x(),
        y: timelineLevelToY(
          yToTimelineLevel(localY - timelineLayerY, timelineY),
          timelineY
        ),
      });
    }
  }

  function handleDragMove(evt: KonvaEventObject<DragEvent>) {
    if (evt.target.attrs.fill !== "white") {
      const localX = evt.target._lastPos.x;
      const localY = evt.target._lastPos.y;

      setDraggingLyricTextProgress({
        startLyricText: lyricText,
        endLyricText: {
          ...lyricTexts[index],
          start: pixelsToSeconds(localX + Math.abs(layerX), width, duration),
          end:
            pixelsToSeconds(localX + Math.abs(layerX), width, duration) +
            textDuration,
          textBoxTimelineLevel: yToTimelineLevel(
            localY - timelineLayerY,
            timelineY
          ),
        },
        startY: lyricTextY,
        endY: localY - timelineLayerY,
      });
    }
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
        onClick={() => {
          setSelectedLyricText(lyricText);
        }}
      >
        <Line
          points={[0, 0, 0, timelineY - y]}
          stroke={"#8282F6"}
          strokeWidth={1}
        />
        <Rect
          ref={containerRectRef}
          perfectDrawEnabled={false}
          width={containerWidth}
          height={TEXT_BOX_HEIGHT}
          fill={lyricText.isImage ? IMAGE_BOX_COLOR : TEXT_BOX_COLOR}
          strokeWidth={isSelected ? 2 : 0} // border width
          stroke="orange" // border color
        />
        {lyricText.isImage && lyricText.imageUrl ? (
          <KonvaImage
            url={lyricText.imageUrl}
            width={containerWidth}
            height={TEXT_BOX_HEIGHT}
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
                    start: pixelsToSeconds(
                      pos.x + Math.abs(layerX) + LYRIC_TEXT_BOX_HANDLE_WIDTH,
                      width,
                      duration
                    ),
                  };
                }

                return oldLyricText;
              }
            );
            setLyricTexts(updateLyricTexts);

            return { x: pos.x, y: y + timelineLayerY };
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
            setLyricTexts(updateLyricTexts);

            return { x: localX, y: y + timelineLayerY };
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
  }, [
    y,
    startX,
    containerWidth,
    isSelected,
    lyricText,
    duration,
    width,
    draggingLyricTextProgress,
  ]);

  return textBox;
}
