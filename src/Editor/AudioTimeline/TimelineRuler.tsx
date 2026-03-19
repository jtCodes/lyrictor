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
  isMajor: boolean;
  markX: number;
  label: string;
}

function isStepMultiple(value: number, step: number): boolean {
  const nearest = Math.round(value / step) * step;
  return Math.abs(value - nearest) < 1e-6;
}

function getRulerDensity(width: number, duration: number): {
  minorStep: number;
  majorStep: number;
  labelStep: number;
} {
  const pixelsPerSecond = width / Math.max(duration, 1);

  const minorStep =
    pixelsPerSecond >= 180
      ? 0.25
      : pixelsPerSecond >= 100
      ? 0.5
      : pixelsPerSecond >= 45
      ? 1
      : pixelsPerSecond >= 25
      ? 2
      : pixelsPerSecond >= 12
      ? 5
      : 10;

  // Pick the smallest label interval that keeps labels readable at this zoom.
  const labelCandidates = [0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120];
  const minLabelSpacingPx = 70;
  let labelStep = labelCandidates[labelCandidates.length - 1];
  for (const candidate of labelCandidates) {
    if (candidate * pixelsPerSecond >= minLabelSpacingPx) {
      labelStep = candidate;
      break;
    }
  }

  const majorStep = labelStep < 1 ? 1 : Math.max(1, labelStep / 2);

  return { minorStep, majorStep, labelStep };
}

function getFractionPrecision(labelStep: number): number {
  if (labelStep >= 1) return 0;
  if (labelStep >= 0.5) return 1;
  return 2;
}

function formatRulerLabel(second: number, labelStep: number): string {
  const precision = getFractionPrecision(labelStep);
  const roundedSecond = Number(second.toFixed(precision));

  if (roundedSecond < 60) {
    if (precision === 0) {
      return String(Math.round(roundedSecond));
    }
    return roundedSecond.toFixed(precision).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  }

  const wholeSeconds = Math.floor(roundedSecond);
  const hrs = Math.floor(wholeSeconds / 3600);
  const mins = Math.floor((wholeSeconds % 3600) / 60);
  const secsWhole = wholeSeconds % 60;

  let secsText = String(secsWhole).padStart(2, "0");
  if (precision > 0) {
    const fractional = roundedSecond - wholeSeconds;
    const fractionDigits = Math.round(fractional * 10 ** precision)
      .toString()
      .padStart(precision, "0");
    secsText = `${secsText}.${fractionDigits}`;
  }

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${secsText}`;
  }

  return `${mins}:${secsText}`;
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
            y={mark.isSignificant ? 0 : mark.isMajor ? 3 : 6}
            points={[0, 0, 0, mark.isSignificant ? 15 : mark.isMajor ? 12 : 9]}
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
    const { minorStep, majorStep, labelStep } = getRulerDensity(width, duration);

    for (let i = 0; i <= duration + 1e-6; i += minorStep) {
      const second = Number(i.toFixed(4));
      const markX = secondsToPixels(second, duration, width);
      const isSignificant = isStepMultiple(second, labelStep);
      const isMajor = isStepMultiple(second, majorStep);
      tickMarks.push({
        isSignificant,
        isMajor,
        markX,
        label: isSignificant ? formatRulerLabel(second, labelStep) : "",
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
