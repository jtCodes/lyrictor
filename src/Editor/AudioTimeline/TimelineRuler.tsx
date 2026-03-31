import { useMemo } from "react";
import { Group, Line, Layer, Rect, Text } from "react-konva";
import { secondsToPixels } from "../utils";
import { TimelineLoopRange } from "../types";

const HEIGHT: number = 15;
const BACKGROUND_COLOR: string = "rgba(30, 32, 36, 0.9)";
const TOP_HIGHLIGHT_COLOR: string = "rgba(255, 255, 255, 0.06)";
const BOTTOM_SHADOW_COLOR: string = "rgba(0, 0, 0, 0.35)";
const PRIMARY_TICK_COLOR: string = "rgba(255, 255, 255, 0.52)";
const SECONDARY_TICK_COLOR: string = "rgba(255, 255, 255, 0.34)";
const TERTIARY_TICK_COLOR: string = "rgba(255, 255, 255, 0.22)";
const MINOR_TICK_COLOR: string = "rgba(255, 255, 255, 0.14)";
const PRIMARY_LABEL_COLOR: string = "rgba(255, 255, 255, 0.72)";
const SECONDARY_LABEL_COLOR: string = "rgba(255, 255, 255, 0.34)";
const LOOP_REGION_FILL_COLOR = "rgba(76, 143, 255, 0.16)";
const LOOP_REGION_EDGE_COLOR = "rgba(102, 181, 255, 0.48)";
const LOOP_HANDLE_FILL_COLOR = "rgba(18, 22, 30, 0.96)";
const LOOP_HANDLE_STROKE_COLOR = "rgba(118, 184, 255, 0.96)";
const LOOP_HANDLE_GRIP_COLOR = "rgba(255, 255, 255, 0.74)";
const MIN_LOOP_DURATION_SECONDS = 0.1;
const LOOP_HANDLE_WIDTH = 12;
const LOOP_HANDLE_CORNER_RADIUS = 4;
const LOOP_HANDLE_Y_OFFSET = HEIGHT + 4;

type TickLevel = "primary" | "secondary" | "tertiary" | "minor";
type LabelLevel = "primary" | "secondary";

interface TickMark {
  second: number;
  tickLevel: TickLevel;
  markX: number;
  label: string;
  labelLevel?: LabelLevel;
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
    pixelsPerSecond >= 320
      ? 0.1
      : pixelsPerSecond >= 220
      ? 0.2
      : pixelsPerSecond >= 180
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
  const labelCandidates = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120];
  const minLabelSpacingPx = 52;
  let labelStep = labelCandidates[labelCandidates.length - 1];
  for (const candidate of labelCandidates) {
    if (candidate * pixelsPerSecond >= minLabelSpacingPx) {
      labelStep = candidate;
      break;
    }
  }

  const majorStep =
    labelStep < 0.5 ? 0.5 : labelStep < 1 ? 1 : Math.max(1, labelStep / 2);

  return { minorStep, majorStep, labelStep };
}

function getFractionPrecision(labelStep: number): number {
  if (labelStep >= 1) return 0;
  if (labelStep >= 0.5) return 1;
  if (labelStep >= 0.1) return 1;
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

function getTickLevel(second: number, labelStep: number, majorStep: number): TickLevel {
  const primaryLabelStep = getPrimaryLabelStep(labelStep);

  if (isStepMultiple(second, primaryLabelStep)) return "primary";
  if (isStepMultiple(second, labelStep)) return "secondary";
  if (isStepMultiple(second, majorStep)) return "tertiary";
  return "minor";
}

function getLabelLevel(second: number, labelStep: number): LabelLevel {
  return isStepMultiple(second, getPrimaryLabelStep(labelStep))
    ? "primary"
    : "secondary";
}

function getPrimaryLabelStep(labelStep: number): number {
  if (labelStep < 1) return 1;
  if (labelStep <= 2) return 5;
  if (labelStep <= 5) return 10;
  return labelStep;
}

function getTickStyle(tickLevel: TickLevel): { y: number; length: number; color: string } {
  switch (tickLevel) {
    case "primary":
      return { y: 0, length: 15, color: PRIMARY_TICK_COLOR };
    case "secondary":
      return { y: 5, length: 10, color: SECONDARY_TICK_COLOR };
    case "tertiary":
      return { y: 6, length: 9, color: TERTIARY_TICK_COLOR };
    default:
      return { y: 7, length: 8, color: MINOR_TICK_COLOR };
  }
}

function getLabelStyle(labelLevel: LabelLevel): { color: string; fontSize: number; y: number } {
  if (labelLevel === "primary") {
    return { color: PRIMARY_LABEL_COLOR, fontSize: 9, y: 2 };
  }

  return { color: SECONDARY_LABEL_COLOR, fontSize: 8, y: 4 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function TimelineRuler({
  width,
  windowWidth,
  scrollXOffset,
  duration,
  loopEnabled,
  loopRange,
  onLoopRangeChange,
}: {
  width: number;
  windowWidth: number;
  scrollXOffset: number;
  duration: number;
  loopEnabled: boolean;
  loopRange: TimelineLoopRange;
  onLoopRangeChange: (range: TimelineLoopRange) => void;
}) {
  const tickMarkData = useMemo(() => {
    if (duration <= 0 || width <= 0 || windowWidth <= 0) {
      return [] as TickMark[];
    }

    const tickMarks: TickMark[] = [];
    const { minorStep, majorStep, labelStep } = getRulerDensity(width, duration);
    const bufferPx = 120;
    const visibleStartX = Math.max(0, -scrollXOffset - bufferPx);
    const visibleEndX = Math.min(width, -scrollXOffset + windowWidth + bufferPx);
    const visibleStartSec = (visibleStartX / width) * duration;
    const visibleEndSec = (visibleEndX / width) * duration;

    let second = Math.floor(visibleStartSec / minorStep) * minorStep;
    if (second < 0) {
      second = 0;
    }

    while (second <= visibleEndSec + 1e-6) {
      const normalizedSecond = Number(second.toFixed(4));
      const markX = secondsToPixels(normalizedSecond, duration, width);
      const isSignificant = isStepMultiple(normalizedSecond, labelStep);
      const tickLevel = getTickLevel(normalizedSecond, labelStep, majorStep);

      tickMarks.push({
        second: normalizedSecond,
        tickLevel,
        markX,
        label: isSignificant
          ? formatRulerLabel(normalizedSecond, labelStep)
          : "",
        labelLevel: isSignificant
          ? getLabelLevel(normalizedSecond, labelStep)
          : undefined,
      });

      second += minorStep;
    }

    return tickMarks;
  }, [duration, width, windowWidth, scrollXOffset]);

  const tickMarks = useMemo(
    () =>
      tickMarkData.map((mark, i) => {
        const tickStyle = getTickStyle(mark.tickLevel);
        const labelLevel = mark.labelLevel ?? "secondary";
        const labelStyle = getLabelStyle(labelLevel);

        return (
          <Group key={`${mark.second}-${i}`}>
            <Line
              key={"ruler-line-" + i}
              x={mark.markX}
              y={tickStyle.y}
              points={[0, 0, 0, tickStyle.length]}
              stroke={tickStyle.color}
              strokeWidth={1}
            />
            {mark.label ? (
              <Text
                key={"label" + i}
                text={mark.label}
                x={mark.markX + 5}
                y={labelStyle.y}
                fontSize={labelStyle.fontSize}
                fontStyle={labelLevel === "primary" ? "600" : "400"}
                fill={labelStyle.color}
              />
            ) : null}
          </Group>
        );
      }),
    [tickMarkData]
  );

  const loopOverlay = useMemo(() => {
    if (!loopEnabled || duration <= 0 || width <= 0) {
      return null;
    }

    const minLoopPixelWidth = secondsToPixels(
      Math.min(MIN_LOOP_DURATION_SECONDS, duration),
      duration,
      width
    );
    const startX = secondsToPixels(loopRange.start, duration, width);
    const endX = secondsToPixels(loopRange.end, duration, width);

    return (
      <>
        <Rect
          x={startX}
          y={0}
          width={Math.max(0, endX - startX)}
          height={HEIGHT}
          fill={LOOP_REGION_FILL_COLOR}
          listening={false}
        />
        <Line
          points={[startX, 0, startX, HEIGHT]}
          stroke={LOOP_REGION_EDGE_COLOR}
          strokeWidth={1}
          listening={false}
        />
        <Line
          points={[endX, 0, endX, HEIGHT]}
          stroke={LOOP_REGION_EDGE_COLOR}
          strokeWidth={1}
          listening={false}
        />
        <Group
          x={startX}
          y={LOOP_HANDLE_Y_OFFSET}
          draggable={true}
          dragBoundFunc={(pos) => ({
            x: clamp(pos.x, 0, Math.max(0, endX - minLoopPixelWidth)),
            y: LOOP_HANDLE_Y_OFFSET,
          })}
          onDragMove={(event) => {
            const nextStart = clamp(
              (event.target.x() / width) * duration,
              0,
              Math.max(0, loopRange.end - Math.min(MIN_LOOP_DURATION_SECONDS, duration))
            );

            onLoopRangeChange({
              start: nextStart,
              end: loopRange.end,
            });
          }}
          onMouseDown={(event) => {
            event.cancelBubble = true;
          }}
          onClick={(event) => {
            event.cancelBubble = true;
          }}
        >
          <Line
            points={[0, -LOOP_HANDLE_Y_OFFSET, 0, 0]}
            stroke={LOOP_HANDLE_STROKE_COLOR}
            strokeWidth={1}
            listening={false}
          />
          <Rect
            x={-LOOP_HANDLE_WIDTH / 2}
            y={0}
            width={LOOP_HANDLE_WIDTH}
            height={HEIGHT}
            cornerRadius={LOOP_HANDLE_CORNER_RADIUS}
            fill={LOOP_HANDLE_FILL_COLOR}
            stroke={LOOP_HANDLE_STROKE_COLOR}
            strokeWidth={1}
          />
          <Line
            points={[-1.5, 4, -1.5, HEIGHT - 4]}
            stroke={LOOP_HANDLE_GRIP_COLOR}
            strokeWidth={1}
            lineCap="round"
          />
          <Line
            points={[1.5, 4, 1.5, HEIGHT - 4]}
            stroke={LOOP_HANDLE_GRIP_COLOR}
            strokeWidth={1}
            lineCap="round"
          />
        </Group>
        <Group
          x={endX}
          y={LOOP_HANDLE_Y_OFFSET}
          draggable={true}
          dragBoundFunc={(pos) => ({
            x: clamp(
              pos.x,
              Math.min(width, startX + minLoopPixelWidth),
              width
            ),
            y: LOOP_HANDLE_Y_OFFSET,
          })}
          onDragMove={(event) => {
            const nextEnd = clamp(
              (event.target.x() / width) * duration,
              Math.min(duration, loopRange.start + Math.min(MIN_LOOP_DURATION_SECONDS, duration)),
              duration
            );

            onLoopRangeChange({
              start: loopRange.start,
              end: nextEnd,
            });
          }}
          onMouseDown={(event) => {
            event.cancelBubble = true;
          }}
          onClick={(event) => {
            event.cancelBubble = true;
          }}
        >
          <Line
            points={[0, -LOOP_HANDLE_Y_OFFSET, 0, 0]}
            stroke={LOOP_HANDLE_STROKE_COLOR}
            strokeWidth={1}
            listening={false}
          />
          <Rect
            x={-LOOP_HANDLE_WIDTH / 2}
            y={0}
            width={LOOP_HANDLE_WIDTH}
            height={HEIGHT}
            cornerRadius={LOOP_HANDLE_CORNER_RADIUS}
            fill={LOOP_HANDLE_FILL_COLOR}
            stroke={LOOP_HANDLE_STROKE_COLOR}
            strokeWidth={1}
          />
          <Line
            points={[-1.5, 4, -1.5, HEIGHT - 4]}
            stroke={LOOP_HANDLE_GRIP_COLOR}
            strokeWidth={1}
            lineCap="round"
          />
          <Line
            points={[1.5, 4, 1.5, HEIGHT - 4]}
            stroke={LOOP_HANDLE_GRIP_COLOR}
            strokeWidth={1}
            lineCap="round"
          />
        </Group>
      </>
    );
  }, [duration, loopEnabled, loopRange.end, loopRange.start, onLoopRangeChange, width]);

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
      <Layer x={scrollXOffset}>
        {loopOverlay}
        {tickMarks}
      </Layer>
    </>
  );
}
