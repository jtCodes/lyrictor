import { Group, Line, Rect } from "react-konva";
import { CameraOverride } from "./store";

const EDGE_PADDING = 3;
const ITEM_HEIGHT = 20;

export default function CameraTimelineOverrideIndicators({
  overrides,
  itemDuration,
  itemWidth,
  opacity,
}: {
  overrides: CameraOverride[];
  itemDuration: number;
  itemWidth: number;
  opacity: number;
}) {
  if (itemDuration <= 0 || itemWidth <= 0) {
    return null;
  }

  return (
    <Group listening={false} opacity={opacity}>
      {overrides.map((cameraOverride) => {
        const endOffset =
          cameraOverride.endOffset ?? cameraOverride.startOffset + 1;
        const startX = Math.max(
          EDGE_PADDING,
          Math.min(
            itemWidth - EDGE_PADDING,
            (cameraOverride.startOffset / itemDuration) * itemWidth
          )
        );
        const endX = Math.max(
          startX,
          Math.min(
            itemWidth - EDGE_PADDING,
            (endOffset / itemDuration) * itemWidth
          )
        );

        return (
          <Group key={cameraOverride.id}>
            <Rect
              x={startX}
              y={1}
              width={Math.max(1, endX - startX)}
              height={ITEM_HEIGHT - 2}
              fill="rgba(72, 201, 255, 0.24)"
            />
            <Line
              points={[startX, 3, startX, ITEM_HEIGHT - 1]}
              stroke="rgba(255, 255, 255, 0.88)"
              strokeWidth={3}
            />
            <Line
              points={[startX, 3, startX, ITEM_HEIGHT - 1]}
              stroke="rgb(72, 201, 255)"
              strokeWidth={1.5}
            />
            <Line
              points={[startX - 3, 1, startX, 4, startX + 3, 1]}
              closed
              fill="rgb(72, 201, 255)"
              stroke="rgba(255, 255, 255, 0.92)"
              strokeWidth={0.75}
            />
            <Line
              points={[endX, 1, endX, ITEM_HEIGHT - 1]}
              stroke="rgba(180, 235, 255, 0.9)"
              strokeWidth={1.5}
              dash={[2, 2]}
            />
          </Group>
        );
      })}
    </Group>
  );
}
