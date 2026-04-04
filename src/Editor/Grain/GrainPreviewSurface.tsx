import { View } from "@adobe/react-spectrum";
import { useEffect, useMemo, useState } from "react";
import { Image, Layer, Stage } from "react-konva";
import { LyricText } from "../types";
import { GrainSettings, normalizeGrainSettings } from "./store";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createSeededRandom(seed: number) {
  let currentSeed = seed >>> 0;

  return function nextRandom() {
    currentSeed += 0x6d2b79f5;
    let t = currentSeed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createNoiseFrame({
  frameWidth,
  frameHeight,
  settings,
  seed,
}: {
  frameWidth: number;
  frameHeight: number;
  settings: GrainSettings;
  seed: number;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = frameWidth;
  canvas.height = frameHeight;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    return canvas;
  }

  const imageData = context.createImageData(frameWidth, frameHeight);
  const data = imageData.data;
  const random = createSeededRandom(seed);
  const intensity = clamp(settings.intensity, 0, 4);
  const contrast = clamp(settings.contrast, 0.4, 4);
  const shadowAmount = clamp(settings.shadowAmount, 0, 1.5);
  const highlightAmount = clamp(settings.highlightAmount, 0, 1.5);
  const cutoff = clamp(0.48 - intensity * 0.08, 0.06, 0.48);
  const exponent = clamp(1.55 - contrast * 0.3, 0.28, 1.55);
  const alphaScale = clamp(0.12 + intensity * 0.18, 0, 0.92);

  for (let index = 0; index < data.length; index += 4) {
    const sample = random() * 2 - 1;
    const magnitude = Math.abs(sample);

    if (magnitude <= cutoff) {
      continue;
    }

    const normalizedMagnitude = (magnitude - cutoff) / (1 - cutoff);
    const shapedMagnitude = Math.pow(normalizedMagnitude, exponent);

    if (sample >= 0) {
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = Math.round(
        clamp(
          shapedMagnitude * alphaScale * (0.2 + highlightAmount * 0.7),
          0,
          1
        ) * 255
      );
    } else {
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = Math.round(
        clamp(
          shapedMagnitude * alphaScale * (0.28 + shadowAmount * 0.72),
          0,
          1
        ) * 255
      );
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function buildNoiseFrames({
  width,
  height,
  settings,
  id,
}: {
  width: number;
  height: number;
  settings: GrainSettings;
  id: number;
}) {
  if (typeof document === "undefined") {
    return [] as HTMLCanvasElement[];
  }

  const size = clamp(settings.size, 0.35, 4.5);
  const resolution = clamp(settings.resolution, 0.5, 3);
  const resolutionDivisor = 1.6 + size * 4.8;
  const frameWidth = Math.max(
    96,
    Math.min(width, 960, Math.round((width / resolutionDivisor) * resolution))
  );
  const frameHeight = Math.max(
    54,
    Math.min(height, 540, Math.round((height / resolutionDivisor) * resolution))
  );
  const frameCount = 5;

  return Array.from({ length: frameCount }, (_, index) =>
    createNoiseFrame({
      frameWidth,
      frameHeight,
      settings,
      seed: id * 4099 + index * 92821 + frameWidth * 17 + frameHeight * 29,
    })
  );
}

export default function GrainPreviewSurface({
  width,
  height,
  lyricText,
  opacity,
  disableAnimation = false,
}: {
  width: number;
  height: number;
  lyricText: LyricText;
  opacity: number;
  disableAnimation?: boolean;
}) {
  const settings = normalizeGrainSettings(lyricText.grainSettings);
  const frames = useMemo(
    () =>
      buildNoiseFrames({
        width,
        height,
        settings,
        id: lyricText.id,
      }),
    [height, lyricText.id, settings, width]
  );
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (disableAnimation || settings.speed <= 0.001 || frames.length <= 1) {
      setFrameIndex(0);
      return;
    }

    let frameId = 0;
    let lastUpdate = 0;
    const interval = 1000 / (3 + settings.speed * 17);

    const tick = (now: number) => {
      if (now - lastUpdate >= interval) {
        setFrameIndex((currentIndex) => (currentIndex + 1) % frames.length);
        lastUpdate = now;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [disableAnimation, frames.length, settings.speed]);

  const activeFrame = frames[frameIndex] ?? frames[0];
  const frameOpacity = clamp(
    0.84 + Math.sin(frameIndex * 1.37 + lyricText.id * 0.11) * settings.speed * 0.08,
    0.72,
    1
  );

  if (!activeFrame) {
    return null;
  }

  return (
    <View
      position={"absolute"}
      width={width}
      height={height}
      UNSAFE_style={{ pointerEvents: "none", opacity }}
      data-export-non-text-layer="grain"
    >
      <Stage width={width} height={height}>
        <Layer>
          <Image
            image={activeFrame}
            x={0}
            y={0}
            width={width}
            height={height}
            listening={false}
            perfectDrawEnabled={false}
            opacity={frameOpacity}
          />
        </Layer>
      </Stage>
    </View>
  );
}