import { useEffect, useMemo, useState } from "react";
import { Stage, Group, Line, Layer, Rect, Text } from "react-konva";
import { secondsToPixels } from "../utils";

const HEIGHT: number = 15;
const BACKGROUND_COLOR: string = "rgba(30, 32, 36, 0.9)";
const TOP_HIGHLIGHT_COLOR: string = "rgba(255, 255, 255, 0.06)";
const BOTTOM_SHADOW_COLOR: string = "rgba(0, 0, 0, 0.35)";
const SIG_TICK_COLOR: string = "rgba(255, 255, 255, 0.42)";
const NORMAL_TICK_COLOR: string = "rgba(255, 255, 255, 0.2)";
const NORMAL_LABEL_COLOR: string = "rgba(255, 255, 255, 0.58)";

interface TickMark {
  isSignificant: boolean;
  markX: number;
  label: string;
}

function formatRulerLabel(second: number): string {
  if (second < 60) {
    return String(second);
  }

  const hrs = Math.floor(second / 3600);
  const mins = Math.floor((second % 3600) / 60);
  const secs = second % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${mins}:${String(secs).padStart(2, "0")}`;
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
  const [tickMarkData, setTickMarkData] = useState<TickMark[]>([]);
  const tickMarks = useMemo(
    () =>
      tickMarkData.map((mark, i) => (
        <Group key={mark.markX}>
          <Line
            key={"ruler-line-" + i}
            x={mark.markX}
            y={mark.isSignificant ? 0 : 5}
            points={[0, 0, 0, mark.isSignificant ? 15 : 10]}
            stroke={mark.isSignificant ? SIG_TICK_COLOR : NORMAL_TICK_COLOR}
            strokeWidth={1}
          />
          {mark.isSignificant ? (
            <Text
              key={"label" + i}
              text={mark.label}
              x={mark.markX + 5}
              y={2}
              fontSize={9}
              fontStyle={"600"}
              fill={NORMAL_LABEL_COLOR}
            />
          ) : null}
        </Group>
      )),
    [tickMarkData, duration]
  );

  useEffect(() => {
    const tickMarks: TickMark[] = [];

    for (let i = 0; i <= duration; i += 1) {
      const second = Math.round(i);
      const markX = secondsToPixels(second, duration, width);
      tickMarks.push({
        isSignificant: second % 5 === 0,
        markX,
        label: formatRulerLabel(second),
      });
    }

    setTickMarkData(tickMarks);
  }, [width, duration]);

  return (
    <>
      <Layer>
        <Rect
          x={0}
          y={0}
          width={windowWidth}
          height={HEIGHT}
          fill={BACKGROUND_COLOR}
        />
        <Line
          x={0}
          y={0}
          points={[0, 0, windowWidth, 0]}
          stroke={TOP_HIGHLIGHT_COLOR}
          strokeWidth={1}
        />
        <Line
          x={0}
          y={HEIGHT - 0.5}
          points={[0, 0, windowWidth, 0]}
          stroke={BOTTOM_SHADOW_COLOR}
          strokeWidth={1}
        />
      </Layer>
      <Layer x={scrollXOffset}>{tickMarks}</Layer>
    </>
  );
}
