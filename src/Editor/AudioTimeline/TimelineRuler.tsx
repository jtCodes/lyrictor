import { Stage, Group, Line, Layer, Rect } from "react-konva";

const HEIGHT: number = 15;
const BACKGROUND_COLOR: string = "rgba(49,49,49, 0.3)";
const NORMAL_TICK_COLOR: string = "#808080";

export default function TimelineRuler({
  width,
  from,
  to,
}: {
  width: number;
  from: number;
  to: number;
}) {
  // Set the length of the song in seconds
  const songLength = to - from;

  if (songLength < 1) {
    return null;
  }

  // Set the desired number of tick marks
  const numTickMarks = 10;

  // Calculate the interval between tick marks in seconds
  const tickInterval = songLength / numTickMarks;

  // Create an array to hold the points for the tick marks
  const tickMarkPoints: number[] = [];

  // Add tick marks at the desired intervals
  for (let i = 0; i <= songLength; i += tickInterval) {
    tickMarkPoints.push(i); // add the points for each tick mark
  }

  return (
    <Stage width={width} height={HEIGHT}>
      <Layer>
        <Rect
          x={0}
          y={0}
          width={width}
          height={HEIGHT}
          fill={BACKGROUND_COLOR}
          shadowBlur={10}
        />
      </Layer>
      <Layer>
        {tickMarkPoints.map((mark, i) => (
          <Line
            key={"ruler-line-" + i}
            x={96 * i}
            y={0}
            points={[0, 0, 0, 10]}
            stroke={NORMAL_TICK_COLOR}
            strokeWidth={1}
          />
        ))}
      </Layer>
    </Stage>
  );
}
