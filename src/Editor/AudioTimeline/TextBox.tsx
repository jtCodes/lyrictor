import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { useEffect, useRef } from "react";
import usePrevious from "react-hooks-use-previous";
import { Group, Line, Rect, Text as KonvaText } from "react-konva";
import { LyricText } from "../types";
import { pixelsToSeconds, secondsToPixels } from "../utils";

const LYRIC_TEXT_BOX_HANDLE_WIDTH: number = 2.5;
const TEXT_BOX_HEIGHT: number = 20;

export function TextBox({
  lyricText,
  index,
  width,
  windowWidth,
  layerX,
  duration,
  lyricTexts,
  setLyricTexts,
  setSelectedLyricText,
  isSelected,
  timelineY,
}: {
  lyricText: LyricText;
  index: number;
  width: number;
  windowWidth: number | undefined;
  layerX: number;
  duration: number;
  lyricTexts: LyricText[];
  setLyricTexts: any;
  setSelectedLyricText: any;
  isSelected: boolean;
  timelineY: number;
}) {
  const textBoxPointerY: number = 35;
  const textDuration: number = lyricText.end - lyricText.start;
  const startX: number = secondsToPixels(lyricText.start, duration, width);
  const endX: number = secondsToPixels(lyricText.end, duration, width);
  const y: number = timelineLevelToY(lyricText.textBoxTimelineLevel);
  const containerWidth: number = endX - startX;
  const prevLyricTexts = usePrevious(lyricTexts, []);

  useEffect(() => {
    // TODO: look for any lyrictext is that should no longer be stacking on top of lyrictext
    // and push it down
    // 1. look for all the lyrictexts one level above current lyrictext that overlaps current lyrictext
    // 2. for every lyrictext found in step 1, check if they are still 1 level above and overlapping with curreny lyric text
    // 3. if not shift down level
    // const prevLyricText: LyricText | undefined = prevLyricTexts.current.find(
    //   (prevLyricText) => {
    //     return prevLyricText.id === lyricText.id;
    //   }
    // );
    // console.log(prevLyricText, prevLyricTexts);
    // if (prevLyricText) {
    //   const prevOverlappingLyricTexts: LyricText[] =
    //     prevLyricTexts.current.filter((curLoopLyricText) => {
    //       return (
    //         checkIfTwoLyricTextsOverlap(curLoopLyricText, prevLyricText) &&
    //         curLoopLyricText.id !== lyricText.id
    //       );
    //     });
    //   console.log(prevOverlappingLyricTexts);
    // }
  }, [lyricTexts]);

  if (Number.isNaN(containerWidth)) {
    return null;
  }

  function timelineLevelToY(level: number) {
    if (level === 1) {
      return 55;
    }

    return 30;
  }

  function yToTimelineLevel(y: number) {
    if (y <= 30) {
      return 2;
    }

    return 1;
  }

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

  function handleDragEnd(evt: KonvaEventObject<DragEvent>) {
    console.log(evt, evt.target._lastPos.y <= 30);
    const localX = evt.target._lastPos.x;
    const localY = evt.target._lastPos.y;
    const updateLyricTexts = lyricTexts.map(
      (lyricText: LyricText, updatedIndex: number) => {
        if (updatedIndex === index) {
          return {
            ...lyricTexts[index],
            start: pixelsToSeconds(localX + Math.abs(layerX), width, duration),
            end:
              pixelsToSeconds(localX + Math.abs(layerX), width, duration) +
              textDuration,
            textBoxTimelineLevel: yToTimelineLevel(localY),
          };
        }

        return lyricText;
      }
    );

    console.log(lyricText.textBoxTimelineLevel);

    setLyricTexts(updateLyricTexts);
    evt.target.to({
      x: evt.target.x(),
      y: timelineLevelToY(yToTimelineLevel(localY)),
    });
  }

  function handleDragMove(evt: KonvaEventObject<DragEvent>) {
    const localX = evt.target._lastPos.x;
    const localY = evt.target._lastPos.y;
    const currentDragStart: number = pixelsToSeconds(
      localX + Math.abs(layerX),
      width,
      duration
    );
    const timelineLevel = yToTimelineLevel(localY);

    const collidingTextBox: LyricText | undefined = lyricTexts.filter(
      (curLoopLyricText) =>
        curLoopLyricText.end >= currentDragStart &&
        curLoopLyricText.id != lyricText.id
    )[0];

    const prevOverlappingLyricTexts: LyricText[] = lyricTexts.filter(
      (curLoopLyricText) => {
        return checkIfTwoLyricTextsOverlap(curLoopLyricText, lyricText);
      }
    );

    console.log(
      prevOverlappingLyricTexts,
      prevLyricTexts,
      lyricTexts,
      collidingTextBox
    );

    if (!collidingTextBox && prevOverlappingLyricTexts[0]) {
      const updateLyricTexts = lyricTexts.map(
        (lyricText: LyricText, updatedIndex: number) => {
          if (lyricText.id === prevOverlappingLyricTexts[0].id) {
            console.log("shift", prevOverlappingLyricTexts);
            return {
              ...lyricTexts[updatedIndex],
              textBoxTimelineLevel: lyricText.textBoxTimelineLevel - 1,
            };
          }

          return lyricText;
        }
      );

      setLyricTexts(updateLyricTexts);
    }

    // console.log(collidingTextBox, lyricTexts);

    if (collidingTextBox) {
      const updateLyricTexts = lyricTexts.map(
        (lyricText: LyricText, updatedIndex: number) => {
          if (lyricText.id === collidingTextBox.id) {
            return {
              ...lyricTexts[updatedIndex],
              textBoxTimelineLevel: collidingTextBox.textBoxTimelineLevel + 1,
            };
          }

          return lyricText;
        }
      );

      setLyricTexts(updateLyricTexts);
    }
  }

  return (
    <Group
      key={index}
      width={containerWidth}
      height={TEXT_BOX_HEIGHT}
      y={y}
      x={startX}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
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
        width={containerWidth}
        height={TEXT_BOX_HEIGHT}
        fill="#8282F6"
        strokeWidth={isSelected ? 2 : 0} // border width
        stroke="orange" // border color
      />
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
        width={LYRIC_TEXT_BOX_HANDLE_WIDTH}
        height={TEXT_BOX_HEIGHT}
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
        x={containerWidth - LYRIC_TEXT_BOX_HANDLE_WIDTH}
        width={LYRIC_TEXT_BOX_HANDLE_WIDTH}
        height={TEXT_BOX_HEIGHT}
        fill="white"
        draggable={true}
        dragBoundFunc={(pos: Vector2d) => {
          console.log(pos.x, startX, endX);
          // default prevent left over drag
          // localX = x relative to visible portion of the canvas, 0 to windowWidth
          let localX = startX + layerX;

          if (pos.x >= startX + layerX) {
            localX = pos.x;
          }

          const updateLyricTexts = lyricTexts.map(
            (lyricText: LyricText, updatedIndex: number) => {
              if (updatedIndex === index) {
                return {
                  ...lyricTexts[index],
                  end: pixelsToSeconds(
                    localX + Math.abs(layerX) + LYRIC_TEXT_BOX_HANDLE_WIDTH,
                    width,
                    duration
                  ),
                };
              }

              return lyricText;
            }
          );
          setLyricTexts(updateLyricTexts);

          return { x: localX, y: textBoxPointerY };
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
}
