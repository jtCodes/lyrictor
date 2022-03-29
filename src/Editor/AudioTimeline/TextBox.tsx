import { Vector2d } from "konva/lib/types";
import { Group, Line, Rect, Text as KonvaText } from "react-konva";
import { LyricText } from "../types";
import { pixelsToSeconds, secondsToPixels } from "../utils";

const lyricTextBoxHandleWidth: number = 2.5;

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
}) {
  const textBoxPointerY: number = 15;
  const textDuration: number = lyricText.end - lyricText.start;
  const startX: number = secondsToPixels(lyricText.start, duration, width);
  const endX: number = secondsToPixels(lyricText.end, duration, width);
  const containerWidth: number = endX - startX;

  if (Number.isNaN(containerWidth)) {
    return null;
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

  return (
    <Group
      key={index}
      width={containerWidth}
      height={20}
      y={textBoxPointerY}
      x={startX}
      draggable={true}
      dragBoundFunc={handleTextBoxDrag(
        startX,
        containerWidth,
        windowWidth,
        index,
        width,
        duration,
        textDuration,
        layerX
      )}
      onClick={() => {
        setSelectedLyricText(lyricText);
      }}
    >
      <Line points={[0, 0, 0, 55]} stroke={"#8282F6"} strokeWidth={1} />
      <Rect
        width={containerWidth}
        height={20}
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
                    localX + Math.abs(layerX) + lyricTextBoxHandleWidth,
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
