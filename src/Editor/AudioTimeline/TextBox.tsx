import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import usePrevious from "react-hooks-use-previous";
import { Circle, Group, Line, Rect, Text as KonvaText } from "react-konva";
import { KonvaImage } from "../../KonvaImage";
import { useEditorStore } from "../store";
import { LyricText } from "../types";
import {
  getElementType,
  pixelsToSeconds,
  secondsToPixels,
  timelineLevelToY,
  yToTimelineLevel,
} from "../utils";
import {
  pushCollidingItemsUpFromLevel,
  pushCollidingItemsUpFromLevels,
} from "./utils";
import { generateLyricTextId, useProjectStore } from "../../Project/store";

const TEXT_BOX_COLOR: string = "rgb(104, 109, 244)";
const IMAGE_BOX_COLOR: string = "rgb(204, 164, 253)";
const ELEMENT_BOX_COLOR: string = "#008c87";
const LYRIC_TEXT_BOX_HANDLE_WIDTH: number = 2.5;
const TEXT_BOX_HEIGHT: number = 20;
const TIMELINE_TEXT_FONT_SIZE: number = 12;
const ELEMENT_LABEL_FONT_SIZE: number = 10;
const ELEMENT_ICON_WIDTH: number = 10;
const ELEMENT_LABEL_GAP: number = 3;

function ElementTimelineIcon({
  elementType,
}: {
  elementType: "visualizer" | "particle";
}) {
  if (elementType === "visualizer") {
    return (
      <Group listening={false}>
        <Rect x={0} y={6} width={2} height={6} cornerRadius={1} fill="rgba(255,255,255,0.92)" />
        <Rect x={4} y={3} width={2} height={9} cornerRadius={1} fill="rgba(255,255,255,0.92)" />
        <Rect x={8} y={1} width={2} height={11} cornerRadius={1} fill="rgba(255,255,255,0.92)" />
      </Group>
    );
  }

  return (
    <Group listening={false}>
      <Circle x={2} y={4} radius={1.5} fill="rgba(255,255,255,0.92)" />
      <Circle x={8} y={2} radius={1.8} fill="rgba(255,255,255,0.88)" />
      <Circle x={6} y={8} radius={1.4} fill="rgba(255,255,255,0.82)" />
    </Group>
  );
}

const textMeasuringNode = new Konva.Text({
  fontSize: TIMELINE_TEXT_FONT_SIZE,
  wrap: "none",
});

function measureTimelineTextWidth(text: string): number {
  textMeasuringNode.text(text);
  return textMeasuringNode.getTextWidth();
}

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
  const textPadding = 5;
  const elementType = getElementType(lyricText);
  const isRenderEnabled = lyricText.renderEnabled ?? true;
  const elementLabel =
    elementType === "visualizer"
      ? "Visualizer"
      : elementType === "particle"
      ? "Particles"
      : undefined;
  const elementLabelWidth = useMemo(() => {
    if (!elementLabel) {
      return 0;
    }

    textMeasuringNode.fontSize(ELEMENT_LABEL_FONT_SIZE);
    textMeasuringNode.fontStyle("bold");
    const width = measureTimelineTextWidth(elementLabel.toUpperCase());
    textMeasuringNode.fontSize(TIMELINE_TEXT_FONT_SIZE);
    textMeasuringNode.fontStyle("normal");
    return width;
  }, [elementLabel]);
  const measuredTextWidth = useMemo(() => {
    if (lyricText.isImage || lyricText.isVisualizer || lyricText.isParticle) {
      return 0;
    }

    return measureTimelineTextWidth(lyricText.text);
  }, [lyricText.isImage, lyricText.isVisualizer, lyricText.isParticle, lyricText.text]);

  const textLayout = useMemo(() => {
    const safeWindowWidth = Math.max(0, windowWidth ?? 0);
    const viewportLeft = -layerX;
    const viewportRight = viewportLeft + safeWindowWidth;
    const viewportLeftInItem = Math.max(0, viewportLeft - startX);
    const viewportRightInItem = Math.min(
      containerWidth,
      viewportRight - startX
    );
    const visibleTextLeft = Math.min(containerWidth, viewportLeftInItem);
    const visibleTextRight = Math.max(visibleTextLeft, viewportRightInItem);
    const visibleTextWidth = Math.max(0, visibleTextRight - visibleTextLeft);
    const availableTextWidth = Math.max(0, visibleTextWidth - textPadding * 2);
    const preferredTextWidth = Math.max(
      0,
      Math.min(containerWidth - textPadding * 2, measuredTextWidth + 2)
    );
    const textWidth = Math.min(preferredTextWidth, availableTextWidth);
    const centeredX = visibleTextLeft + (visibleTextWidth - textWidth) / 2;
    const minX = visibleTextLeft + textPadding;
    const maxX = Math.max(minX, visibleTextRight - textPadding - textWidth);

    return {
      x: Math.min(maxX, Math.max(minX, centeredX)),
      width: textWidth,
      align: "left",
    } as const;
  }, [containerWidth, layerX, measuredTextWidth, startX, windowWidth]);

  const elementLabelLayout = useMemo(() => {
    if (!elementLabel) {
      return undefined;
    }

    const safeWindowWidth = Math.max(0, windowWidth ?? 0);
    const viewportLeft = -layerX;
    const viewportRight = viewportLeft + safeWindowWidth;
    const viewportLeftInItem = Math.max(0, viewportLeft - startX);
    const viewportRightInItem = Math.min(
      containerWidth,
      viewportRight - startX
    );
    const visibleTextLeft = Math.min(containerWidth, viewportLeftInItem);
    const visibleTextRight = Math.max(visibleTextLeft, viewportRightInItem);
    const visibleTextWidth = Math.max(0, visibleTextRight - visibleTextLeft);
    const leadingWidth = ELEMENT_ICON_WIDTH + ELEMENT_LABEL_GAP;
    const availableTextWidth = Math.max(
      0,
      visibleTextWidth - leadingWidth - textPadding * 2
    );
    const preferredBlockWidth = Math.max(
      0,
      Math.min(
        containerWidth - textPadding * 2,
        leadingWidth + elementLabelWidth + 14
      )
    );
    const blockWidth = Math.min(
      Math.max(leadingWidth, preferredBlockWidth),
      visibleTextWidth - textPadding * 2
    );
    const labelWidth = Math.max(0, availableTextWidth);
    const centeredX = visibleTextLeft + (visibleTextWidth - blockWidth) / 2;
    const minX = visibleTextLeft + textPadding;
    const maxX = Math.max(minX, visibleTextRight - textPadding - blockWidth);
    const x = Math.min(maxX, Math.max(minX, centeredX));

    return {
      iconX: x,
      textX: x + leadingWidth,
      textWidth: labelWidth,
    } as const;
  }, [
    containerWidth,
    elementLabel,
    elementLabelWidth,
    layerX,
    startX,
    textPadding,
    windowWidth,
  ]);

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
      const nextTimelineY = timelineLevelToY(lyricText.textBoxTimelineLevel, timelineY);

      setStartX(newStartX);
      setEndX(newEndX);
      setY(nextTimelineY);
      setContainerWidth(newEndX - newStartX);
      setLyricTextY(nextTimelineY);
    }
  }, [duration, lyricText, timelineY, width]);

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

  useEffect(() => {
    setLyricTextY(timelineLevelToY(lyricText.textBoxTimelineLevel, timelineY));
  }, [lyricText.textBoxTimelineLevel, timelineY]);

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
      const movingLyricTextIds = selectedTexts.has(lyricText.id)
        ? Array.from(selectedTexts)
        : [lyricText.id];

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

      const pushedLyricTexts =
        movingLyricTextIds.length > 1
          ? pushCollidingItemsUpFromLevels({
              lyricTexts: updateLyricTexts,
              movingLyricTextIds,
            })
          : pushCollidingItemsUpFromLevel({
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
      const draggingTimeDelta = localStart - lyricText.start;
      const draggingYDelta = lyricTextY - (localY - timelineLayerY);
      const movingLyricTextIds = selectedTexts.has(lyricText.id)
        ? Array.from(selectedTexts)
        : [lyricText.id];

      const previewDraftLyricTexts = lyricTexts.map((curLoopLyricText: LyricText) => {
        if (curLoopLyricText.id === lyricText.id) {
          return {
            ...curLoopLyricText,
            start: localStart,
            end: localEnd,
            textBoxTimelineLevel: preferredLevel,
          };
        }

        if (movingLyricTextIds.includes(curLoopLyricText.id)) {
          return {
            ...curLoopLyricText,
            start: curLoopLyricText.start + draggingTimeDelta,
            end: curLoopLyricText.end + draggingTimeDelta,
            textBoxTimelineLevel: yToTimelineLevel(
              timelineLevelToY(curLoopLyricText.textBoxTimelineLevel, timelineY) -
                draggingYDelta,
              timelineY
            ),
          };
        }

        return curLoopLyricText;
      });

      const previewPushedLyricTexts =
        movingLyricTextIds.length > 1
          ? pushCollidingItemsUpFromLevels({
              lyricTexts: previewDraftLyricTexts,
              movingLyricTextIds,
            })
          : pushCollidingItemsUpFromLevel({
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
    setSelectedLyricTextIds(new Set([]));
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
              ? ELEMENT_BOX_COLOR
              : lyricText.isParticle
              ? ELEMENT_BOX_COLOR
              : TEXT_BOX_COLOR
          }
          strokeWidth={1}
          opacity={isRenderEnabled ? 1 : 0.35}
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
              ? ELEMENT_BOX_COLOR
              : lyricText.isParticle
              ? ELEMENT_BOX_COLOR
              : TEXT_BOX_COLOR
          }
          cornerRadius={5}
          opacity={isRenderEnabled ? 1 : 0.35}
        />
        {isSelected ? (
          <Rect
            width={containerWidth}
            height={TEXT_BOX_HEIGHT}
            strokeWidth={2}
            stroke="orange"
            fillEnabled={false}
            cornerRadius={5}
          />
        ) : null}
        {lyricText.isImage && lyricText.imageUrl ? (
          <Group opacity={isRenderEnabled ? 1 : 0.55} listening={false}>
            <KonvaImage
              url={lyricText.imageUrl}
              width={containerWidth}
              height={TEXT_BOX_HEIGHT}
              crop
              pixelate={4}
            />
          </Group>
        ) : elementLabel && elementType ? (
          <>
            <Group
              x={elementLabelLayout?.iconX ?? 5}
              y={4}
              listening={false}
              opacity={isRenderEnabled ? 1 : 0.55}
            >
              <ElementTimelineIcon elementType={elementType} />
            </Group>
            <KonvaText
              fontSize={ELEMENT_LABEL_FONT_SIZE}
              fontStyle={"bold"}
              letterSpacing={0.4}
              text={elementLabel.toUpperCase()}
              wrap="none"
              ellipsis={true}
              width={Math.max(0, elementLabelLayout?.textWidth ?? 0)}
              x={elementLabelLayout?.textX ?? 20}
              y={5}
              fill={"rgba(255,255,255,0.92)"}
              opacity={isRenderEnabled ? 1 : 0.7}
            />
          </>
        ) : (
          <KonvaText
            fontSize={TIMELINE_TEXT_FONT_SIZE}
            text={lyricText.text}
            wrap="none"
            align={textLayout.align}
            ellipsis={true}
            width={textLayout.width}
            x={textLayout.x}
            y={5}
            fill={"white"}
            opacity={isRenderEnabled ? 1 : 0.7}
          />
        )}
        {!isRenderEnabled ? (
          <>
            <Rect
              width={containerWidth}
              height={TEXT_BOX_HEIGHT}
              fill="rgba(6, 10, 18, 0.32)"
              listening={false}
              cornerRadius={5}
            />
            <Line
              points={[6, TEXT_BOX_HEIGHT - 4, Math.max(6, containerWidth - 6), 4]}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={1.5}
              listening={false}
            />
            {containerWidth >= 34 ? (
              <KonvaText
                text="OFF"
                fontSize={9}
                fontStyle="bold"
                letterSpacing={0.5}
                x={Math.max(5, containerWidth - 26)}
                y={4}
                fill="rgba(255,255,255,0.82)"
                listening={false}
              />
            ) : null}
          </>
        ) : null}
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
    lyricTexts,
    textLayout,
    elementLabelLayout,
    duration,
    width,
    draggingLyricTextProgress,
    activeTimelineTool,
  ]);

  return textBox;
}
