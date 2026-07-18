import { RGBColor } from "react-color";

export type LightBlendMode = "normal" | "screen" | "soft-light";
export type LightKeyframeTransition = "smooth" | "cut";

export interface LightPaletteKeyframe {
  id: string;
  startOffset: number;
  endOffset: number;
  transitionDuration?: number;
  /** Legacy point-keyframe fields retained for saved-project migration. */
  offset?: number;
  transition?: LightKeyframeTransition;
  baseColor: RGBColor;
  fieldColors: RGBColor[];
}

export interface LightField {
  color: RGBColor;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  opacity: number;
  motionAmount: number;
  beatReactiveIntensity: number;
  beatReactiveFocus: number;
  beatReactiveSize: boolean;
  beatReactiveOpacity: boolean;
}

export interface LightSettings {
  baseColor: RGBColor;
  baseOpacity: number;
  fields: LightField[];
  blur: number;
  blendMode: LightBlendMode;
  paletteKeyframes: LightPaletteKeyframe[];
}

export function createDefaultLightField(): LightField {
  return {
    color: { r: 255, g: 151, b: 245, a: 1 },
    x: 0.5,
    y: 0.5,
    radiusX: 0.28,
    radiusY: 0.22,
    rotation: 0,
    opacity: 0.35,
    motionAmount: 0,
    beatReactiveIntensity: 0,
    beatReactiveFocus: 0.15,
    beatReactiveSize: true,
    beatReactiveOpacity: true,
  };
}

export const DEFAULT_LIGHT_SETTINGS: LightSettings = {
  baseColor: { r: 142, g: 134, b: 166, a: 1 },
  baseOpacity: 1,
  blur: 0.82,
  blendMode: "screen",
  paletteKeyframes: [],
  fields: [
    {
      ...createDefaultLightField(),
      color: { r: 222, g: 238, b: 255, a: 1 },
      x: 0.2,
      y: 0.08,
      radiusX: 0.58,
      radiusY: 0.44,
      rotation: -8,
      opacity: 0.72,
    },
    {
      ...createDefaultLightField(),
      x: 0.57,
      y: 0.07,
      radiusX: 0.62,
      radiusY: 0.48,
      rotation: 5,
      opacity: 0.62,
    },
    {
      ...createDefaultLightField(),
      color: { r: 232, g: 104, b: 225, a: 1 },
      x: 0.94,
      y: 0.42,
      radiusX: 0.46,
      radiusY: 0.72,
      rotation: -12,
      opacity: 0.48,
    },
    {
      ...createDefaultLightField(),
      color: { r: 226, g: 228, b: 255, a: 1 },
      x: 0.48,
      y: 1.08,
      radiusX: 0.92,
      radiusY: 0.42,
      rotation: 0,
      opacity: 0.7,
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
  fallback: LightField,
  legacyBeatReactiveIntensity: number,
  legacyBeatReactiveFocus: number
): LightField {
  return {
    ...fallback,
    ...field,
    color: normalizeColor(field?.color, fallback.color),
    beatReactiveIntensity: Math.max(
      0,
      field?.beatReactiveIntensity ?? legacyBeatReactiveIntensity
    ),
    beatReactiveFocus: Math.min(
      1,
      Math.max(0, field?.beatReactiveFocus ?? legacyBeatReactiveFocus)
    ),
    beatReactiveSize: field?.beatReactiveSize ?? true,
    beatReactiveOpacity: field?.beatReactiveOpacity ?? true,
  };
}

type LegacyLightSettings = Partial<LightSettings> & {
  beatReactiveIntensity?: number;
  beatReactiveFocus?: number;
};

export function normalizeLightSettings(
  settings?: Partial<LightSettings>
): LightSettings {
  const legacySettings = settings as LegacyLightSettings | undefined;
  const legacyBeatReactiveIntensity = Math.max(
    0,
    legacySettings?.beatReactiveIntensity ?? 0
  );
  const legacyBeatReactiveFocus = Math.min(
    1,
    Math.max(0, legacySettings?.beatReactiveFocus ?? 0.15)
  );
  const {
    beatReactiveIntensity: _legacyBeatReactiveIntensity,
    beatReactiveFocus: _legacyBeatReactiveFocus,
    ...currentSettings
  } = legacySettings ?? {};
  const sourceFields = settings?.fields ?? DEFAULT_LIGHT_SETTINGS.fields;
  const fields = sourceFields.map((field, index) =>
    normalizeField(
      field,
      DEFAULT_LIGHT_SETTINGS.fields[
        Math.min(index, DEFAULT_LIGHT_SETTINGS.fields.length - 1)
      ],
      legacyBeatReactiveIntensity,
      legacyBeatReactiveFocus
    )
  );

  const baseColor = normalizeColor(
    settings?.baseColor,
    DEFAULT_LIGHT_SETTINGS.baseColor
  );
  const paletteKeyframes = (settings?.paletteKeyframes ?? [])
    .map((keyframe, index) => {
      const legacyOffset = keyframe.offset ?? 0;
      const startOffset = Math.max(0, keyframe.startOffset ?? legacyOffset);
      const endOffset = Math.max(
        startOffset + 0.01,
        keyframe.endOffset ?? startOffset + 1
      );

      return {
        id: keyframe.id || `light-keyframe-${index}`,
        startOffset,
        endOffset,
        transitionDuration: Math.max(
          0,
          keyframe.transitionDuration ??
            (keyframe.transition === "smooth" ? 0.25 : 0)
        ),
        baseColor: normalizeColor(keyframe.baseColor, baseColor),
        fieldColors: fields.map((field, fieldIndex) =>
          normalizeColor(keyframe.fieldColors?.[fieldIndex], field.color)
        ),
      };
    })
    .sort((a, b) => a.startOffset - b.startOffset);

  return {
    ...DEFAULT_LIGHT_SETTINGS,
    ...currentSettings,
    baseColor,
    blendMode:
      settings?.blendMode === "screen" || settings?.blendMode === "soft-light"
        ? settings.blendMode
        : "normal",
    fields: fields.length > 0 ? fields : [],
    paletteKeyframes,
  };
}
