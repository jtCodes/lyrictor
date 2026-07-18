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

  return {
    r: start.r + (end.r - start.r) * amount,
    g: start.g + (end.g - start.g) * amount,
    b: start.b + (end.b - start.b) * amount,
    a: (start.a ?? 1) + ((end.a ?? 1) - (start.a ?? 1)) * amount,
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
  startOffset: number,
  endOffset: number,
  palette: ResolvedLightPalette = settingsPalette(settings)
): LightPaletteKeyframe {
  keyframeId += 1;

  return {
    id: `light-keyframe-${Date.now().toString(36)}-${keyframeId}`,
    startOffset: Math.max(0, startOffset),
    endOffset: Math.max(startOffset + 0.01, endOffset),
    transitionDuration: 0,
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
  const activeKeyframe = [...keyframes]
    .reverse()
    .find(
      (keyframe) =>
        localTime >= keyframe.startOffset && localTime < keyframe.endOffset
    );

  if (!activeKeyframe) {
    return initialPalette;
  }

  const overridePalette = keyframePalette(settings, activeKeyframe);
  const rangeDuration = activeKeyframe.endOffset - activeKeyframe.startOffset;
  const transitionDuration = Math.min(
    Math.max(0, activeKeyframe.transitionDuration ?? 0),
    rangeDuration / 2
  );

  if (transitionDuration <= 0) {
    return overridePalette;
  }

  const fadeIn =
    (localTime - activeKeyframe.startOffset) / transitionDuration;
  const fadeOut =
    (activeKeyframe.endOffset - localTime) / transitionDuration;
  return interpolatePalette(
    initialPalette,
    overridePalette,
    Math.min(1, fadeIn, fadeOut)
  );
}
