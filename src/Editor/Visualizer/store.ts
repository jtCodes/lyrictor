import { RGBColor } from "react-color";
import create from "zustand";

export type VisualizerMode = "classic" | "aurora";
export type AuroraShape = "beam" | "ribbon" | "bloom";

export interface VisualizerSettingValue {
  value: number;
  beatSyncIntensity: number;
}

export interface ColorStop {
  stop: number;
  color: RGBColor;
  beatSyncIntensity: number;
  audioReactiveFocus: number;
  x: number;
  y: number;
  auroraShape: AuroraShape;
  auroraWidth: number;
  auroraHeight: number;
  auroraRotation: number;
  auroraGlowIntensity: number;
  auroraContrast: number;
  auroraReactiveThreshold: number;
  auroraExpansionAmount: number;
  auroraMotionAmount: number;
}

export interface VisualizerSetting {
  mode: VisualizerMode;
  fillRadialGradientStartPoint: { x: number; y: number };
  fillRadialGradientEndPoint: { x: number; y: number };
  fillRadialGradientStartRadius: VisualizerSettingValue;
  fillRadialGradientEndRadius: VisualizerSettingValue;
  fillRadialGradientColorStops: ColorStop[];
  globalAudioReactiveFocus: number;
  auroraShape: AuroraShape;
  auroraOriginX: number;
  auroraOriginY: number;
  auroraWidth: number;
  auroraHeight: number;
  auroraRotation: number;
  auroraGlowIntensity: number;
  auroraContrast: number;
  auroraReactiveThreshold: number;
  auroraExpansionAmount: number;
  auroraMotionAmount: number;
  blur: number;
  previewEffectsEnabled: boolean;
}

export const DEFAULT_VISUALIZER_SETTING: VisualizerSetting = {
  mode: "classic",
  fillRadialGradientStartPoint: { x: 50, y: 50 },
  fillRadialGradientEndPoint: { x: 50, y: 50 },
  fillRadialGradientStartRadius: { value: 0, beatSyncIntensity: 0 },
  fillRadialGradientEndRadius: { value: 1, beatSyncIntensity: 1 },
  fillRadialGradientColorStops: [
    {
      stop: 0,
      color: { r: 255, g: 179, b: 186, a: 1 },
      beatSyncIntensity: 1,
      audioReactiveFocus: 0.15,
      x: 0,
      y: 0,
      auroraShape: "ribbon",
      auroraWidth: 0.95,
      auroraHeight: 0.28,
      auroraRotation: -12,
      auroraGlowIntensity: 1.35,
      auroraContrast: 1.45,
      auroraReactiveThreshold: 0.18,
      auroraExpansionAmount: 1.4,
      auroraMotionAmount: 0.32,
    },
    {
      stop: 1,
      color: { r: 255, g: 223, b: 186, a: 1 },
      beatSyncIntensity: 0,
      audioReactiveFocus: 0.15,
      x: 0,
      y: 0,
      auroraShape: "ribbon",
      auroraWidth: 0.95,
      auroraHeight: 0.28,
      auroraRotation: -12,
      auroraGlowIntensity: 1.35,
      auroraContrast: 1.45,
      auroraReactiveThreshold: 0.18,
      auroraExpansionAmount: 1.4,
      auroraMotionAmount: 0.32,
    },
  ],
  globalAudioReactiveFocus: 0.5,
  auroraShape: "ribbon",
  auroraOriginX: 0.08,
  auroraOriginY: 0.58,
  auroraWidth: 0.95,
  auroraHeight: 0.28,
  auroraRotation: -12,
  auroraGlowIntensity: 1.35,
  auroraContrast: 1.45,
  auroraReactiveThreshold: 0.18,
  auroraExpansionAmount: 1.4,
  auroraMotionAmount: 0.32,
  blur: 0,
  previewEffectsEnabled: true,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeVisualizerSettingValue(
  value: Partial<VisualizerSettingValue> | undefined,
  defaults: VisualizerSettingValue
): VisualizerSettingValue {
  return {
    ...defaults,
    ...value,
  };
}

function normalizeColorStop(
  stop: Partial<ColorStop> | undefined,
  fallback: ColorStop
): ColorStop {
  const mergedStop = {
    ...fallback,
    ...stop,
  };

  return {
    ...mergedStop,
    stop: clamp(mergedStop.stop, 0, 1),
    audioReactiveFocus: clamp(mergedStop.audioReactiveFocus, 0, 1),
    x: clamp(mergedStop.x, -1, 1),
    y: clamp(mergedStop.y, -1, 1),
    auroraShape: mergedStop.auroraShape,
    auroraWidth: clamp(mergedStop.auroraWidth, 0.1, 1.6),
    auroraHeight: clamp(mergedStop.auroraHeight, 0.05, 0.9),
    auroraRotation: clamp(mergedStop.auroraRotation, -180, 180),
    auroraGlowIntensity: clamp(mergedStop.auroraGlowIntensity, 0, 5),
    auroraContrast: clamp(mergedStop.auroraContrast, 0.4, 5),
    auroraReactiveThreshold: clamp(mergedStop.auroraReactiveThreshold, 0, 0.95),
    auroraExpansionAmount: clamp(mergedStop.auroraExpansionAmount, 0, 4),
    auroraMotionAmount: clamp(mergedStop.auroraMotionAmount, 0, 5),
    color: {
      ...fallback.color,
      ...stop?.color,
    },
  };
}

function getColorStopFallback(
  fallback: ColorStop,
  setting?: Partial<VisualizerSetting>
): ColorStop {
  return {
    ...fallback,
    x: setting?.auroraOriginX ?? fallback.x,
    y: setting?.auroraOriginY ?? fallback.y,
    auroraShape: setting?.auroraShape ?? fallback.auroraShape,
    auroraWidth: setting?.auroraWidth ?? fallback.auroraWidth,
    auroraHeight: setting?.auroraHeight ?? fallback.auroraHeight,
    auroraRotation: setting?.auroraRotation ?? fallback.auroraRotation,
    auroraGlowIntensity:
      setting?.auroraGlowIntensity ?? fallback.auroraGlowIntensity,
    auroraContrast: setting?.auroraContrast ?? fallback.auroraContrast,
    auroraReactiveThreshold:
      setting?.auroraReactiveThreshold ?? fallback.auroraReactiveThreshold,
    auroraExpansionAmount:
      setting?.auroraExpansionAmount ?? fallback.auroraExpansionAmount,
    auroraMotionAmount:
      setting?.auroraMotionAmount ?? fallback.auroraMotionAmount,
  };
}

export function normalizeVisualizerSetting(
  setting?: Partial<VisualizerSetting>
): VisualizerSetting {
  const normalizedColorStops =
    setting?.fillRadialGradientColorStops?.map((stop, index) =>
      normalizeColorStop(
        stop,
        getColorStopFallback(
          DEFAULT_VISUALIZER_SETTING.fillRadialGradientColorStops[
            Math.min(
              index,
              DEFAULT_VISUALIZER_SETTING.fillRadialGradientColorStops.length - 1
            )
          ],
          setting
        )
      )
    ) ?? DEFAULT_VISUALIZER_SETTING.fillRadialGradientColorStops;

  return {
    ...DEFAULT_VISUALIZER_SETTING,
    ...setting,
    mode: setting?.mode ?? DEFAULT_VISUALIZER_SETTING.mode,
    fillRadialGradientStartPoint: {
      ...DEFAULT_VISUALIZER_SETTING.fillRadialGradientStartPoint,
      ...setting?.fillRadialGradientStartPoint,
    },
    fillRadialGradientEndPoint: {
      ...DEFAULT_VISUALIZER_SETTING.fillRadialGradientEndPoint,
      ...setting?.fillRadialGradientEndPoint,
    },
    fillRadialGradientStartRadius: normalizeVisualizerSettingValue(
      setting?.fillRadialGradientStartRadius,
      DEFAULT_VISUALIZER_SETTING.fillRadialGradientStartRadius
    ),
    fillRadialGradientEndRadius: normalizeVisualizerSettingValue(
      setting?.fillRadialGradientEndRadius,
      DEFAULT_VISUALIZER_SETTING.fillRadialGradientEndRadius
    ),
    fillRadialGradientColorStops: normalizedColorStops,
    globalAudioReactiveFocus: clamp(
      setting?.globalAudioReactiveFocus ??
        DEFAULT_VISUALIZER_SETTING.globalAudioReactiveFocus,
      0,
      1
    ),
    auroraShape: setting?.auroraShape ?? DEFAULT_VISUALIZER_SETTING.auroraShape,
    auroraOriginX: clamp(
      setting?.auroraOriginX ?? DEFAULT_VISUALIZER_SETTING.auroraOriginX,
      -1,
      1
    ),
    auroraOriginY: clamp(
      setting?.auroraOriginY ?? DEFAULT_VISUALIZER_SETTING.auroraOriginY,
      -1,
      1
    ),
    auroraWidth: clamp(
      setting?.auroraWidth ?? DEFAULT_VISUALIZER_SETTING.auroraWidth,
      0.1,
      1.6
    ),
    auroraHeight: clamp(
      setting?.auroraHeight ?? DEFAULT_VISUALIZER_SETTING.auroraHeight,
      0.05,
      0.9
    ),
    auroraRotation: clamp(
      setting?.auroraRotation ?? DEFAULT_VISUALIZER_SETTING.auroraRotation,
      -180,
      180
    ),
    auroraGlowIntensity: clamp(
      setting?.auroraGlowIntensity ??
        DEFAULT_VISUALIZER_SETTING.auroraGlowIntensity,
      0,
      5
    ),
    auroraContrast: clamp(
      setting?.auroraContrast ?? DEFAULT_VISUALIZER_SETTING.auroraContrast,
      0.4,
      5
    ),
    auroraReactiveThreshold: clamp(
      setting?.auroraReactiveThreshold ??
        DEFAULT_VISUALIZER_SETTING.auroraReactiveThreshold,
      0,
      0.95
    ),
    auroraExpansionAmount: clamp(
      setting?.auroraExpansionAmount ??
        DEFAULT_VISUALIZER_SETTING.auroraExpansionAmount,
      0,
      4
    ),
    auroraMotionAmount: clamp(
      setting?.auroraMotionAmount ?? DEFAULT_VISUALIZER_SETTING.auroraMotionAmount,
      0,
      5
    ),
  };
}

export function isAuroraVisualizerSetting(
  setting?: Partial<VisualizerSetting>
): boolean {
  return (setting?.mode ?? DEFAULT_VISUALIZER_SETTING.mode) === "aurora";
}

export function getVisualizerDisplayLabel(
  setting?: Partial<VisualizerSetting>
): string {
  return isAuroraVisualizerSetting(setting) ? "Aurora" : "Visualizer";
}

export const useAudioVisualizerStore = create<{
  settings: VisualizerSetting[];
  updateSetting: <T extends keyof VisualizerSetting>(
    id: string,
    property: T,
    value: VisualizerSetting[T]
  ) => void;
  addSetting: (from: number, to: number, textBoxTimelineLevel: number) => void;
}>((set) => ({
  settings: [],
  updateSetting: <T extends keyof VisualizerSetting>(
    id: string,
    property: T,
    value: VisualizerSetting[T]
  ) => {
    // set((state) => ({
    //   settings: state.settings.map((setting) =>
    //     setting.id === id ? { ...setting, [property]: value } : setting
    //   ),
    // }));
  },
  addSetting: (from: number, to: number, textBoxTimelineLevel: number) => {
    set((state) => ({
      settings: [],
    }));
  },
}));

export function colorStopToArray(
  colorStops: ColorStop[],
  currentBeatIntensityByStop?: number[]
): (number | string)[] {
  return colorStops.flatMap((colorStop, index) => {
    const { stop, color, beatSyncIntensity } = colorStop;
    let a = color.a ?? 1;
    const currentBeatIntensity = currentBeatIntensityByStop?.[index];

    if (beatSyncIntensity !== 0 && currentBeatIntensity) {
      a = beatSyncIntensity * currentBeatIntensity * a;
    }

    const rgba = `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
    return [stop, rgba];
  });
}
