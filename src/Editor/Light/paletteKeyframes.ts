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

  return activeKeyframe
    ? keyframePalette(settings, activeKeyframe)
    : initialPalette;
}
