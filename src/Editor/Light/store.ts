import { RGBColor } from "react-color";

export interface LightField {
  color: RGBColor;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  opacity: number;
  motionAmount: number;
}

export interface LightSettings {
  baseColor: RGBColor;
  baseOpacity: number;
  fields: LightField[];
  blur: number;
}

export function createDefaultLightField(): LightField {
  return {
    color: { r: 255, g: 236, b: 151, a: 1 },
    x: 0.5,
    y: 0.5,
    radiusX: 0.28,
    radiusY: 0.22,
    rotation: 0,
    opacity: 0.35,
    motionAmount: 0,
  };
}

export const DEFAULT_LIGHT_SETTINGS: LightSettings = {
  baseColor: { r: 155, g: 152, b: 74, a: 1 },
  baseOpacity: 1,
  blur: 0,
  fields: [
    {
      ...createDefaultLightField(),
      x: 0.13,
      y: 0.58,
      radiusX: 0.34,
      radiusY: 0.2,
      rotation: -10,
      opacity: 0.5,
    },
    {
      ...createDefaultLightField(),
      color: { r: 210, g: 199, b: 98, a: 1 },
      x: 0.76,
      y: 0.2,
      radiusX: 0.42,
      radiusY: 0.28,
      rotation: 8,
      opacity: 0.26,
    },
    {
      ...createDefaultLightField(),
      color: { r: 83, g: 74, b: 25, a: 1 },
      x: 0.8,
      y: 0.57,
      radiusX: 0.24,
      radiusY: 0.22,
      rotation: -16,
      opacity: 0.34,
    },
  ],
};

function normalizeColor(
  color: Partial<RGBColor> | undefined,
  fallback: RGBColor
): RGBColor {
  return {
    ...fallback,
    ...color,
  };
}

function normalizeField(
  field: Partial<LightField> | undefined,
  fallback: LightField
): LightField {
  return {
    ...fallback,
    ...field,
    color: normalizeColor(field?.color, fallback.color),
  };
}

export function normalizeLightSettings(
  settings?: Partial<LightSettings>
): LightSettings {
  const fields =
    settings?.fields?.map((field, index) =>
      normalizeField(
        field,
        DEFAULT_LIGHT_SETTINGS.fields[
          Math.min(index, DEFAULT_LIGHT_SETTINGS.fields.length - 1)
        ]
      )
    ) ?? DEFAULT_LIGHT_SETTINGS.fields;

  return {
    ...DEFAULT_LIGHT_SETTINGS,
    ...settings,
    baseColor: normalizeColor(settings?.baseColor, DEFAULT_LIGHT_SETTINGS.baseColor),
    fields: fields.length > 0 ? fields : [],
  };
}