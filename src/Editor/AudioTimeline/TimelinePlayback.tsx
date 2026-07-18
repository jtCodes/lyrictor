import { KonvaEventObject } from "konva/lib/Node";
import { useEffect } from "react";
import { Layer, Line, Rect } from "react-konva";
import { useAudioPosition } from "./useAudioPosition";

const PLAYHEAD_LINE_COLOR = "rgba(255, 183, 154, 0.98)";
const PLAYHEAD_GLOW_COLOR = "rgba(255, 167, 131, 0.24)";
const PLAYHEAD_MARKER_FILL_COLOR = "rgba(255, 214, 196, 0.92)";
const PLAYHEAD_MARKER_STROKE_COLOR = "rgba(255, 241, 233, 0.52)";
const PLAYHEAD_MARKER_HALF_WIDTH = 3.5;
const MIN_LOOP_DURATION_SECONDS = 0.1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampLoopRange(
  start: number,
  end: number,
  duration: number
) {
  if (duration <= 0) {
    return { start: 0, end: 0 };
  }

  const minimumLoopDuration = Math.min(MIN_LOOP_DURATION_SECONDS, duration);
  const clampedStart = clamp(
    start,
    0,
    Math.max(0, duration - minimumLoopDuration)
  );
  const clampedEnd = clamp(
    end,
    clampedStart + minimumLoopDuration,
    duration
  );

  return {
    start: clampedStart,
    end: clampedEnd,
  };
}

export function TimelineLoopController({
  duration,
  playing,
  loopEnabled,
  loopStart,
  loopEnd,
  setLoopRange,
}: {
  duration: number;
  playing: boolean;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
  setLoopRange: (range: { start: number; end: number }) => void;
}) {
  const { position, seek } = useAudioPosition({
    highRefreshRate: true,
    active: playing && loopEnabled,
  });

  useEffect(() => {
    if (!loopEnabled || !playing || duration <= 0) {
      return;
    }

    const nextLoopRange = clampLoopRange(loopStart, loopEnd, duration);

    if (nextLoopRange.start !== loopStart || nextLoopRange.end !== loopEnd) {
      setLoopRange(nextLoopRange);
      return;
    }

    if (position < nextLoopRange.start || position >= nextLoopRange.end - 0.01) {
      seek(nextLoopRange.start);
    }
  }, [
    duration,
    loopEnabled,
    loopEnd,
    loopStart,
    playing,
    position,
    seek,
    setLoopRange,
  ]);

  return null;
}

export function TimelinePlayhead({
  width,
  height,
  layerX,
  rulerHeight,
  duration,
  playing,
  isDragging,
  onMarkerMouseDown,
  onMarkerMouseEnter,
  onMarkerMouseLeave,
}: {
  width: number;
  height: number;
  layerX: number;
  rulerHeight: number;
  duration: number;
  playing: boolean;
  isDragging: boolean;
  onMarkerMouseDown: (
    event: KonvaEventObject<MouseEvent>,
    cursorX: number
  ) => void;
  onMarkerMouseEnter: () => void;
  onMarkerMouseLeave: () => void;
}) {
  const { position } = useAudioPosition({
    highRefreshRate: true,
    active: playing,
  });
  const cursorX = duration > 0 ? (position / duration) * width : 0;
  const playheadTop = rulerHeight - 2;

  return (
    <>
      <Layer x={layerX} listening={false}>
        <Rect
          x={cursorX - 1}
          y={playheadTop}
          width={2}
          height={height - playheadTop}
          fill={PLAYHEAD_GLOW_COLOR}
        />
        <Rect
          x={cursorX - 0.5}
          y={playheadTop}
          width={1}
          height={height - playheadTop}
          fill={PLAYHEAD_LINE_COLOR}
        />
      </Layer>
      <Layer x={layerX}>
        <Line
          points={[
            -PLAYHEAD_MARKER_HALF_WIDTH,
            2,
            PLAYHEAD_MARKER_HALF_WIDTH,
            2,
            0,
            playheadTop,
          ]}
          x={cursorX}
          closed
          fill={PLAYHEAD_MARKER_FILL_COLOR}
          stroke={PLAYHEAD_MARKER_STROKE_COLOR}
          strokeWidth={1}
          lineJoin="round"
          onMouseDown={(event) => onMarkerMouseDown(event, cursorX)}
          onClick={(event) => {
            event.cancelBubble = true;
          }}
          onMouseEnter={() => {
            if (!isDragging) {
              onMarkerMouseEnter();
            }
          }}
          onMouseLeave={() => {
            if (!isDragging) {
              onMarkerMouseLeave();
            }
          }}
        />
      </Layer>
    </>
  );
}
