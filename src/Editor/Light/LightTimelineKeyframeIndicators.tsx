import { Group, Line, Rect } from "react-konva";
import { LightPaletteKeyframe } from "./store";

const INDICATOR_EDGE_PADDING = 3;
const TIMELINE_ITEM_HEIGHT = 20;

function indicatorColor(keyframe: LightPaletteKeyframe) {
  const { r, g, b } = keyframe.baseColor;
  return `rgb(${r}, ${g}, ${b})`;
}

function indicatorTint(keyframe: LightPaletteKeyframe) {
  const { r, g, b } = keyframe.baseColor;
  return `rgba(${r}, ${g}, ${b}, 0.34)`;
}

export default function LightTimelineKeyframeIndicators({
  keyframes,
  itemDuration,
  itemWidth,
  opacity,
}: {
  keyframes: LightPaletteKeyframe[];
  itemDuration: number;
  itemWidth: number;
  opacity: number;
}) {
  if (itemDuration <= 0 || itemWidth <= 0) {
    return null;
  }

  return (
    <Group listening={false} opacity={opacity}>
      {keyframes.map((keyframe) => {
        const startOffset = keyframe.startOffset ?? keyframe.offset ?? 0;
        const endOffset = keyframe.endOffset ?? startOffset + 1;
        const unclampedStartX =
          (startOffset / itemDuration) * itemWidth;
        const unclampedEndX = (endOffset / itemDuration) * itemWidth;
        const startX = Math.max(
          INDICATOR_EDGE_PADDING,
          Math.min(itemWidth - INDICATOR_EDGE_PADDING, unclampedStartX)
        );
        const endX = Math.max(
          startX,
          Math.min(itemWidth - INDICATOR_EDGE_PADDING, unclampedEndX)
        );
        const color = indicatorColor(keyframe);

        return (
          <Group key={keyframe.id}>
            <Rect
              x={startX}
              y={1}
              width={Math.max(1, endX - startX)}
              height={TIMELINE_ITEM_HEIGHT - 2}
              fill={indicatorTint(keyframe)}
            />
            <Line
              points={[startX, 3, startX, TIMELINE_ITEM_HEIGHT - 1]}
              stroke="rgba(255, 255, 255, 0.82)"
              strokeWidth={3}
            />
            <Line
              points={[startX, 3, startX, TIMELINE_ITEM_HEIGHT - 1]}
              stroke={color}
              strokeWidth={1.5}
            />
            <Line
              points={[startX - 3, 1, startX, 4, startX + 3, 1]}
              closed
              fill={color}
              stroke="rgba(255, 255, 255, 0.92)"
              strokeWidth={0.75}
            />
            <Line
              points={[endX, 1, endX, TIMELINE_ITEM_HEIGHT - 1]}
              stroke="rgba(255, 255, 255, 0.78)"
              strokeWidth={1.5}
              dash={[2, 2]}
            />
          </Group>
        );
      })}
    </Group>
  );
}
