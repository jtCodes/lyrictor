import { View } from "@adobe/react-spectrum";
import { Vector2d } from "konva/lib/types";
import { Layer, Rect, Stage } from "react-konva";

const SCROLLBAR_SIZE = 10;
const SCROLLBAR_TRACK_BG = "rgba(255, 255, 255, 0.32)";
const SCROLLBAR_TRACK_STROKE = "rgba(255, 255, 255, 0.24)";
const SCROLLBAR_THUMB_BG = "rgba(255, 255, 255, 0.82)";
const SCROLLBAR_THUMB_STROKE = "rgba(255, 255, 255, 0.42)";
const SCROLLBAR_RADIUS = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function setStageCursor(e: any, cursor: string) {
  if (e.target.getStage()?.container()) {
    const container = e.target.getStage()?.container();
    container.style.cursor = cursor;
  }
}

interface TimelineScrollbarsProps {
  windowWidth: number;
  canHorizontalScroll: boolean;
  height: number;
  timelineWidth: number;
  stageHeight: number;
  verticalScrollbarTopOffset: number;
  verticalScrollbarTrackHeight: number;
  horizontalScrollbarWidth: number;
  verticalScrollbarHeight: number;
  horizontalScrollbarX: number;
  verticalScrollbarY: number;
  onHorizontalThumbXChange: (x: number) => void;
  onHorizontalLayerXChange: (layerX: number) => void;
  onVerticalThumbYChange: (y: number) => void;
  onVerticalLayerYChange: (layerY: number) => void;
}

export default function TimelineScrollbars({
  windowWidth,
  canHorizontalScroll,
  height,
  timelineWidth,
  stageHeight,
  verticalScrollbarTopOffset,
  verticalScrollbarTrackHeight,
  horizontalScrollbarWidth,
  verticalScrollbarHeight,
  horizontalScrollbarX,
  verticalScrollbarY,
  onHorizontalThumbXChange,
  onHorizontalLayerXChange,
  onVerticalThumbYChange,
  onVerticalLayerYChange,
}: TimelineScrollbarsProps) {
  const horizontalScrollbarTrack = (
    <Rect
      x={0}
      y={0}
      width={windowWidth}
      height={SCROLLBAR_SIZE}
      fill={SCROLLBAR_TRACK_BG}
      stroke={SCROLLBAR_TRACK_STROKE}
      strokeWidth={1}
      cornerRadius={SCROLLBAR_RADIUS}
      onMouseEnter={(e) => setStageCursor(e, "pointer")}
      onMouseLeave={(e) => setStageCursor(e, "default")}
      onClick={(e) => {
        if (!windowWidth) return;

        const clickX = e.evt.offsetX;
        const maxThumbX = windowWidth - horizontalScrollbarWidth;
        const nextThumbX = clamp(clickX - horizontalScrollbarWidth / 2, 0, maxThumbX);
        const newLayerX = -(nextThumbX / windowWidth) * timelineWidth;

        onHorizontalThumbXChange(nextThumbX);
        onHorizontalLayerXChange(newLayerX);
      }}
    />
  );

  const horizontalScrollbar = (
    <Rect
      x={horizontalScrollbarX + 1}
      y={1}
      width={Math.max(6, horizontalScrollbarWidth - 2)}
      height={SCROLLBAR_SIZE - 2}
      fill={SCROLLBAR_THUMB_BG}
      stroke={SCROLLBAR_THUMB_STROKE}
      strokeWidth={1}
      cornerRadius={SCROLLBAR_RADIUS}
      shadowColor="rgba(0, 0, 0, 0.35)"
      shadowBlur={4}
      shadowOffsetY={1}
      draggable={true}
      onDragStart={(e) => setStageCursor(e, "grabbing")}
      onDragEnd={(e) => setStageCursor(e, "grab")}
      dragBoundFunc={(pos: Vector2d) => {
        if (!windowWidth) return { x: 0, y: 0 };

        const scrollbarLength = horizontalScrollbarWidth;
        let x = 0;

        if (pos.x >= 0 && Math.abs(pos.x) + scrollbarLength <= windowWidth) {
          x = pos.x;
        }

        if (Math.abs(pos.x) + scrollbarLength > windowWidth) {
          x = windowWidth - scrollbarLength;
        }

        const newLayerX = -(x / windowWidth) * timelineWidth;

        onHorizontalThumbXChange(x);
        onHorizontalLayerXChange(newLayerX);

        return { x, y: 0 };
      }}
      onMouseEnter={(e) => setStageCursor(e, "grab")}
      onMouseLeave={(e) => setStageCursor(e, "default")}
    />
  );

  const verticalScrollbarTrack = (
    <Rect
      x={0}
      y={verticalScrollbarTopOffset}
      width={SCROLLBAR_SIZE}
      height={verticalScrollbarTrackHeight}
      fill={SCROLLBAR_TRACK_BG}
      stroke={SCROLLBAR_TRACK_STROKE}
      strokeWidth={1}
      cornerRadius={SCROLLBAR_RADIUS}
      onMouseEnter={(e) => setStageCursor(e, "pointer")}
      onMouseLeave={(e) => setStageCursor(e, "default")}
      onClick={(e) => {
        const clickY = e.evt.offsetY;
        const minThumbY = verticalScrollbarTopOffset;
        const maxThumbY =
          verticalScrollbarTopOffset +
          Math.max(0, verticalScrollbarTrackHeight - verticalScrollbarHeight);
        const nextThumbY = clamp(
          clickY - verticalScrollbarHeight / 2,
          minThumbY,
          maxThumbY
        );

        const maxVerticalLayerOffset = Math.max(0, stageHeight - height);
        const maxThumbTravel = Math.max(
          0,
          verticalScrollbarTrackHeight - verticalScrollbarHeight
        );
        const relativeThumbY = nextThumbY - verticalScrollbarTopOffset;
        const ratio = maxThumbTravel > 0 ? relativeThumbY / maxThumbTravel : 0;
        const newLayerY = -ratio * maxVerticalLayerOffset;

        onVerticalThumbYChange(nextThumbY);
        onVerticalLayerYChange(newLayerY);
      }}
    />
  );

  const verticalScrollbar = (
    <Rect
      x={1}
      y={verticalScrollbarY + 1}
      width={SCROLLBAR_SIZE - 2}
      height={Math.max(6, verticalScrollbarHeight - 2)}
      fill={SCROLLBAR_THUMB_BG}
      stroke={SCROLLBAR_THUMB_STROKE}
      strokeWidth={1}
      cornerRadius={SCROLLBAR_RADIUS}
      shadowColor="rgba(0, 0, 0, 0.35)"
      shadowBlur={4}
      shadowOffsetY={1}
      draggable={true}
      onDragStart={(e) => setStageCursor(e, "grabbing")}
      onDragEnd={(e) => setStageCursor(e, "grab")}
      dragBoundFunc={(pos: Vector2d) => {
        const scrollbarLength = verticalScrollbarHeight;
        const minThumbY = verticalScrollbarTopOffset;
        const maxThumbY =
          verticalScrollbarTopOffset +
          Math.max(0, verticalScrollbarTrackHeight - scrollbarLength);
        let y = minThumbY;

        if (pos.y >= minThumbY && pos.y <= maxThumbY) {
          y = pos.y;
        }

        if (pos.y > maxThumbY) {
          y = maxThumbY;
        }

        if (pos.y < minThumbY) {
          y = minThumbY;
        }

        const maxVerticalLayerOffset = Math.max(0, stageHeight - height);
        const maxThumbTravel = Math.max(
          0,
          verticalScrollbarTrackHeight - scrollbarLength
        );
        const relativeThumbY = y - verticalScrollbarTopOffset;
        const ratio = maxThumbTravel > 0 ? relativeThumbY / maxThumbTravel : 0;
        const newLayerY = -ratio * maxVerticalLayerOffset;

        onVerticalLayerYChange(newLayerY);
        onVerticalThumbYChange(y);

        return { x: 0, y };
      }}
      onMouseEnter={(e) => setStageCursor(e, "grab")}
      onMouseLeave={(e) => setStageCursor(e, "default")}
    />
  );

  return (
    <>
      {canHorizontalScroll ? (
        <View position={"absolute"} bottom={0} zIndex={1}>
          <Stage height={SCROLLBAR_SIZE} width={windowWidth}>
            <Layer>
              {horizontalScrollbarTrack}
              {horizontalScrollbar}
            </Layer>
          </Stage>
        </View>
      ) : null}
      {verticalScrollbarTrackHeight > 0 && verticalScrollbarHeight < verticalScrollbarTrackHeight ? (
        <View position={"absolute"} right={0} zIndex={1}>
          <Stage height={height} width={SCROLLBAR_SIZE}>
            <Layer>
              {verticalScrollbarTrack}
              {verticalScrollbar}
            </Layer>
          </Stage>
        </View>
      ) : null}
    </>
  );
}
