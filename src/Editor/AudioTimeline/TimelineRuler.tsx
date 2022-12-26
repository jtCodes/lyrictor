import { Stage, Group, Line, Layer, Rect, Text } from "react-konva";
import { secondsToPixels } from "../utils";

const HEIGHT: number = 15;
const BACKGROUND_COLOR: string = "rgba(40,40,40, 0.6)";
const SIG_TICK_COLOR: string = "rgba(128, 128, 128, 1)";
const NORMAL_TICK_COLOR: string = "rgba(128, 128, 128, 0.45)";
const NORMAL_LABEL_COLOR: string = "rgba(128, 128, 128, 0.8)";

interface TickMark {
  isSignificant: boolean;
  markX: number;
  label: string;
}

export default function TimelineRuler({
  width,
  windowWidth,
  scrollXOffset,
  duration,
}: {
  width: number;
  windowWidth: number;
  scrollXOffset: number;
  duration: number;
}) {
  const tickMarks: TickMark[] = [];
  const tickMarkPoints: number[] = [];
  const tickMarkLabel: number[] = [];

  for (let i = 0; i <= duration; i += 1) {
    const second = Math.round(i);
    const markX = secondsToPixels(second, duration, width);
    tickMarks.push({
      isSignificant: second % 5 === 0,
      markX,
      label: String(second),
    });
    tickMarkPoints.push(markX);
    tickMarkLabel.push(second);
  }

  return (
    <>
      <Layer>
        <Rect
          x={0}
          y={0}
          width={windowWidth}
          height={HEIGHT}
          fill={BACKGROUND_COLOR}
          shadowBlur={10}
        />
      </Layer>
      <Layer x={scrollXOffset}>
        {tickMarks.map((mark, i) => (
          <Group>
            <Line
              key={"ruler-line-" + i}
              x={mark.markX}
              y={0}
              points={[0, 0, 0, 15]}
              stroke={mark.isSignificant ? SIG_TICK_COLOR : NORMAL_TICK_COLOR}
              strokeWidth={1}
            />
            <Text
              key={"label" + i}
              text={mark.label}
              x={mark.markX + 5}
              y={2.5}
              fontSize={9}
              fontStyle={"600"}
              fill={NORMAL_LABEL_COLOR}
            />
          </Group>
        ))}
      </Layer>
    </>
  );
}
