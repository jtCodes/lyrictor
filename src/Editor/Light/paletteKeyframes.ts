import { RGBColor } from "react-color";
import {
  LightBeatReactiveSettings,
  LightPaletteKeyframe,
  LightSettings,
} from "./store";

export interface ResolvedLightPalette {
  baseColor: RGBColor;
  baseOpacity: number;
  fieldColors: RGBColor[];
  fieldOpacities: number[];
  fieldBeatReactive: LightBeatReactiveSettings[];
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

function fieldBeatReactiveSettings(
  intensity: number,
  focus: number,
  affectsSize: boolean,
  affectsOpacity: boolean
): LightBeatReactiveSettings {
  return { intensity, focus, affectsSize, affectsOpacity };
}

function settingsPalette(settings: LightSettings): ResolvedLightPalette {
  return {
    baseColor: cloneColor(settings.baseColor),
    baseOpacity: settings.baseOpacity,
    fieldColors: settings.fields.map((field) => cloneColor(field.color)),
    fieldOpacities: settings.fields.map((field) => field.opacity),
    fieldBeatReactive: settings.fields.map((field) =>
      fieldBeatReactiveSettings(
        field.beatReactiveIntensity,
        field.beatReactiveFocus,
        field.beatReactiveSize,
        field.beatReactiveOpacity
      )
    ),
  };
}

function keyframePalette(
  settings: LightSettings,
  keyframe: LightPaletteKeyframe
): ResolvedLightPalette {
  return {
    baseColor: cloneColor(keyframe.baseColor),
    baseOpacity: keyframe.baseOpacity ?? settings.baseOpacity,
    fieldColors: settings.fields.map((field, index) =>
      cloneColor(keyframe.fieldColors[index] ?? field.color)
    ),
    fieldOpacities: settings.fields.map(
      (field, index) => keyframe.fieldOpacities?.[index] ?? field.opacity
    ),
    fieldBeatReactive: settings.fields.map((field, index) => {
      const override = keyframe.fieldBeatReactive?.[index];

      return fieldBeatReactiveSettings(
        override?.intensity ?? field.beatReactiveIntensity,
        override?.focus ?? field.beatReactiveFocus,
        override?.affectsSize ?? field.beatReactiveSize,
        override?.affectsOpacity ?? field.beatReactiveOpacity
      );
    }),
  };
}

function interpolatePalette(
  start: ResolvedLightPalette,
  end: ResolvedLightPalette,
  progress: number
): ResolvedLightPalette {
  return {
    baseColor: interpolateColor(start.baseColor, end.baseColor, progress),
    baseOpacity:
      start.baseOpacity + (end.baseOpacity - start.baseOpacity) * progress,
    fieldColors: start.fieldColors.map((color, index) =>
      interpolateColor(color, end.fieldColors[index] ?? color, progress)
    ),
    fieldOpacities: start.fieldOpacities.map(
      (opacity, index) =>
        opacity + ((end.fieldOpacities[index] ?? opacity) - opacity) * progress
    ),
    fieldBeatReactive: start.fieldBeatReactive.map((settings, index) => {
      const endSettings = end.fieldBeatReactive[index] ?? settings;
      const amount = Math.max(0, Math.min(1, progress));

      return fieldBeatReactiveSettings(
        settings.intensity +
          (endSettings.intensity - settings.intensity) * amount,
        settings.focus + (endSettings.focus - settings.focus) * amount,
        amount < 0.5 ? settings.affectsSize : endSettings.affectsSize,
        amount < 0.5 ? settings.affectsOpacity : endSettings.affectsOpacity
      );
    }),
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
    baseOpacity: palette.baseOpacity,
    fieldColors: settings.fields.map((field, index) =>
      cloneColor(palette.fieldColors[index] ?? field.color)
    ),
    fieldOpacities: settings.fields.map(
      (field, index) => palette.fieldOpacities[index] ?? field.opacity
    ),
    fieldBeatReactive: settings.fields.map((field, index) => {
      const resolved = palette.fieldBeatReactive[index];

      return fieldBeatReactiveSettings(
        resolved?.intensity ?? field.beatReactiveIntensity,
        resolved?.focus ?? field.beatReactiveFocus,
        resolved?.affectsSize ?? field.beatReactiveSize,
        resolved?.affectsOpacity ?? field.beatReactiveOpacity
      );
    }),
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
  let activeKeyframe: LightPaletteKeyframe | undefined;

  for (let index = keyframes.length - 1; index >= 0; index -= 1) {
    const keyframe = keyframes[index];

    if (
      localTime >= keyframe.startOffset &&
      localTime < keyframe.endOffset
    ) {
      activeKeyframe = keyframe;
      break;
    }
  }

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
