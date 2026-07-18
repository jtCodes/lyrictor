import { LightSettings } from "./store";

export interface LightPreset {
  id: string;
  name: string;
  description: string;
  settings: LightSettings;
}

export const LIGHT_PRESETS: LightPreset[] = [
  {
    id: "soft-pink-studio",
    name: "Soft pink studio",
    description:
      "Broad cool-white and pink washes with a softly illuminated floor.",
    settings: {
      baseColor: { r: 142, g: 134, b: 166, a: 1 },
      baseOpacity: 1,
      blur: 0.82,
      blendMode: "screen",
      paletteKeyframes: [],
      fields: [
        {
          color: { r: 222, g: 238, b: 255, a: 1 },
          x: 0.2,
          y: 0.08,
          radiusX: 0.58,
          radiusY: 0.44,
          rotation: -8,
          opacity: 0.72,
          motionAmount: 0,
        },
        {
          color: { r: 255, g: 151, b: 245, a: 1 },
          x: 0.57,
          y: 0.07,
          radiusX: 0.62,
          radiusY: 0.48,
          rotation: 5,
          opacity: 0.62,
          motionAmount: 0,
        },
        {
          color: { r: 232, g: 104, b: 225, a: 1 },
          x: 0.94,
          y: 0.42,
          radiusX: 0.46,
          radiusY: 0.72,
          rotation: -12,
          opacity: 0.48,
          motionAmount: 0,
        },
        {
          color: { r: 226, g: 228, b: 255, a: 1 },
          x: 0.48,
          y: 1.08,
          radiusX: 0.92,
          radiusY: 0.42,
          rotation: 0,
          opacity: 0.7,
          motionAmount: 0,
        },
      ],
    },
  },
];

export function cloneLightPresetSettings(preset: LightPreset): LightSettings {
  return structuredClone(preset.settings);
}
