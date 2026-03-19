import { View } from "@adobe/react-spectrum";
import { Vector2d } from "konva/lib/types";
import { Layer, Rect, Stage } from "react-konva";

const SCROLLBAR_SIZE = 10;
const SCROLLBAR_TRACK_BG = "rgba(255, 255, 255, 0.14)";
const SCROLLBAR_TRACK_STROKE = "rgba(255, 255, 255, 0.12)";
const SCROLLBAR_THUMB_BG = "rgba(255, 255, 255, 0.62)";
const SCROLLBAR_THUMB_STROKE = "rgba(255, 255, 255, 0.3)";

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
      cornerRadius={4}
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
      x={horizontalScrollbarX}
      y={0}
      width={horizontalScrollbarWidth}
      height={SCROLLBAR_SIZE}
      fill={SCROLLBAR_THUMB_BG}
      stroke={SCROLLBAR_THUMB_STROKE}
      strokeWidth={1}
      cornerRadius={4}
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
      y={0}
      width={SCROLLBAR_SIZE}
      height={height}
      fill={SCROLLBAR_TRACK_BG}
      stroke={SCROLLBAR_TRACK_STROKE}
      strokeWidth={1}
      cornerRadius={4}
      onMouseEnter={(e) => setStageCursor(e, "pointer")}
      onMouseLeave={(e) => setStageCursor(e, "default")}
      onClick={(e) => {
        const clickY = e.evt.offsetY;
        const maxThumbY = height - verticalScrollbarHeight;
        const nextThumbY = clamp(clickY - verticalScrollbarHeight / 2, 0, maxThumbY);
        const newLayerY = -(nextThumbY / height) * stageHeight;

        onVerticalThumbYChange(nextThumbY);
        onVerticalLayerYChange(newLayerY);
      }}
    />
  );

  const verticalScrollbar = (
    <Rect
      x={0}
      y={verticalScrollbarY}
      width={SCROLLBAR_SIZE}
      height={verticalScrollbarHeight}
      fill={SCROLLBAR_THUMB_BG}
      stroke={SCROLLBAR_THUMB_STROKE}
      strokeWidth={1}
      cornerRadius={4}
      shadowColor="rgba(0, 0, 0, 0.35)"
      shadowBlur={4}
      shadowOffsetY={1}
      draggable={true}
      onDragStart={(e) => setStageCursor(e, "grabbing")}
      onDragEnd={(e) => setStageCursor(e, "grab")}
      dragBoundFunc={(pos: Vector2d) => {
        const scrollbarLength = verticalScrollbarHeight;
        let y = 0;

        if (pos.y >= 0 && Math.abs(pos.y) + scrollbarLength <= height) {
          y = pos.y;
        }

        if (Math.abs(pos.y) + scrollbarLength > height) {
          y = height - scrollbarLength;
        }

        const newLayerY = -(y / height) * stageHeight;

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
      {verticalScrollbarHeight !== height ? (
        <View position={"absolute"} right={2.5} zIndex={1}>
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
