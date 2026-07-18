import { RGBColor } from "react-color";
import {
  LightPaletteKeyframe,
  LightSettings,
} from "./store";

export interface ResolvedLightPalette {
  baseColor: RGBColor;
  fieldColors: RGBColor[];
}

let keyframeId = 0;

function cloneColor(color: RGBColor): RGBColor {
  return { ...color };
}

function interpolateColor(
  start: RGBColor,
  end: RGBColor,
  progress: number
): RGBColor {
  const amount = Math.max(0, Math.min(1, progress));
  const startAlpha = start.a ?? 1;
  const endAlpha = end.a ?? 1;

  return {
    r: start.r + (end.r - start.r) * amount,
    g: start.g + (end.g - start.g) * amount,
    b: start.b + (end.b - start.b) * amount,
    a: startAlpha + (endAlpha - startAlpha) * amount,
  };
}

function settingsPalette(settings: LightSettings): ResolvedLightPalette {
  return {
    baseColor: cloneColor(settings.baseColor),
    fieldColors: settings.fields.map((field) => cloneColor(field.color)),
  };
}

function keyframePalette(
  settings: LightSettings,
  keyframe: LightPaletteKeyframe
): ResolvedLightPalette {
  return {
    baseColor: cloneColor(keyframe.baseColor),
    fieldColors: settings.fields.map((field, index) =>
      cloneColor(keyframe.fieldColors[index] ?? field.color)
    ),
  };
}

function interpolatePalette(
  start: ResolvedLightPalette,
  end: ResolvedLightPalette,
  progress: number
): ResolvedLightPalette {
  return {
    baseColor: interpolateColor(start.baseColor, end.baseColor, progress),
    fieldColors: start.fieldColors.map((color, index) =>
      interpolateColor(color, end.fieldColors[index] ?? color, progress)
    ),
  };
}

export function createLightPaletteKeyframe(
  settings: LightSettings,
  offset: number,
  palette: ResolvedLightPalette = settingsPalette(settings)
): LightPaletteKeyframe {
  keyframeId += 1;

  return {
    id: `light-keyframe-${Date.now().toString(36)}-${keyframeId}`,
    offset: Math.max(0, offset),
    transition: "smooth",
    baseColor: cloneColor(palette.baseColor),
    fieldColors: settings.fields.map((field, index) =>
      cloneColor(palette.fieldColors[index] ?? field.color)
    ),
  };
}

export function resolveLightPalette(
  settings: LightSettings,
  itemStart: number,
  position: number
): ResolvedLightPalette {
  const keyframes = settings.paletteKeyframes;
  const initialPalette = settingsPalette(settings);

  if (keyframes.length === 0) {
    return initialPalette;
  }

  const localTime = Math.max(0, position - itemStart);
  let previousOffset = 0;
  let previousPalette = initialPalette;

  for (const keyframe of keyframes) {
    const nextPalette = keyframePalette(settings, keyframe);

    if (localTime <= keyframe.offset) {
      if (keyframe.transition === "cut") {
        return localTime < keyframe.offset ? previousPalette : nextPalette;
      }

      const duration = keyframe.offset - previousOffset;
      const progress = duration > 0 ? (localTime - previousOffset) / duration : 1;
      return interpolatePalette(previousPalette, nextPalette, progress);
    }

    previousOffset = keyframe.offset;
    previousPalette = nextPalette;
  }

  return previousPalette;
}
