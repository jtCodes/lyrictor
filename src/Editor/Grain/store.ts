export interface GrainSettings {
  intensity: number;
  size: number;
  resolution: number;
  speed: number;
  contrast: number;
  shadowAmount: number;
  highlightAmount: number;
}

export const DEFAULT_GRAIN_SETTINGS: GrainSettings = {
  intensity: 0.9,
  size: 1,
  resolution: 1,
  speed: 0.45,
  contrast: 1.2,
  shadowAmount: 0.82,
  highlightAmount: 0.5,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeGrainSettings(
  settings?: Partial<GrainSettings>
): GrainSettings {
  return {
    intensity: clamp(
      settings?.intensity ?? DEFAULT_GRAIN_SETTINGS.intensity,
      0,
      4
    ),
    size: clamp(settings?.size ?? DEFAULT_GRAIN_SETTINGS.size, 0.35, 4.5),
    resolution: clamp(
      settings?.resolution ?? DEFAULT_GRAIN_SETTINGS.resolution,
      0.5,
      3
    ),
    speed: clamp(settings?.speed ?? DEFAULT_GRAIN_SETTINGS.speed, 0, 1),
    contrast: clamp(
      settings?.contrast ?? DEFAULT_GRAIN_SETTINGS.contrast,
      0.4,
      4
    ),
    shadowAmount: clamp(
      settings?.shadowAmount ?? DEFAULT_GRAIN_SETTINGS.shadowAmount,
      0,
      1.5
    ),
    highlightAmount: clamp(
      settings?.highlightAmount ?? DEFAULT_GRAIN_SETTINGS.highlightAmount,
      0,
      1.5
    ),
  };
}