import { TextCustomizationSettingType } from "../AudioTimeline/Tools/types";
import { EFFECT_DIRECTION_OPTIONS } from "../Lyrics/Effects/direction";
import {
  DEFAULT_ASH_FADE_SETTINGS,
} from "../Lyrics/Effects/AshFade/types";
import { DEFAULT_BLUR_SETTINGS } from "../Lyrics/Effects/Blur/types";
import {
  DEFAULT_DIRECTIONAL_FADE_SETTINGS,
  DIRECTIONAL_FADE_EASING_EASE_OUT,
  DIRECTIONAL_FADE_EASING_LINEAR,
} from "../Lyrics/Effects/DirectionalFade/types";
import { DEFAULT_FLOATING_SETTINGS } from "../Lyrics/Effects/Floating/types";
import { DEFAULT_GLITCH_SETTINGS } from "../Lyrics/Effects/Glitch/types";
import {
  TEXT_EFFECT_TYPE_ASH_FADE,
  TEXT_EFFECT_TYPE_BLUR,
  TEXT_EFFECT_TYPE_DIRECTIONAL_FADE,
  TEXT_EFFECT_TYPE_FLOATING,
  TEXT_EFFECT_TYPE_GLITCH,
  TEXT_EFFECT_TYPE_WATER_DISTORTION,
} from "../Lyrics/Effects/types";
import { DEFAULT_WATER_DISTORTION_SETTINGS } from "../Lyrics/Effects/WaterDistortion/types";
import {
  DEFAULT_MIN_EFFECT_DURATION,
  DEFAULT_MIN_EFFECT_PERCENT_SPAN,
} from "../Lyrics/Effects/shared";
import { DEFAULT_LIGHT_SETTINGS } from "../Light/store";
import { DEFAULT_PARTICLE_SETTINGS } from "../Particles/store";
import {
  SUPPORTED_FONT_FAMILIES,
  SUPPORTED_FONT_WEIGHTS,
} from "../Lyrics/LyricPreview/supportedFonts";
import { DEFAULT_VISUALIZER_SETTING } from "../Visualizer/store";

type AICapabilityScope = "text-item" | "image-item" | "element-item" | "project";

interface AICapabilityOperation {
  key: string;
  label: string;
  description: string;
  scope: AICapabilityScope;
}

interface AICapabilityField {
  key: string;
  type: "number" | "string" | "boolean" | "color" | "enum" | "object" | "array";
  description: string;
  allowedValues?: readonly (string | number)[];
}

interface AIEffectCapability {
  key: string;
  label: string;
  description: string;
  defaults: unknown;
  timing: {
    startPercentRange: [number, number];
    endPercentRange: [number, number];
    minPercentSpan: number;
    minDurationSeconds: number;
  };
  settings: AICapabilityField[];
}

interface AIElementCapability {
  key: string;
  label: string;
  description: string;
  defaults: unknown;
  settings: AICapabilityField[];
}

interface AISettingCapability {
  key: TextCustomizationSettingType;
  label: string;
  description: string;
  scope: "text-item" | "image-item";
  allowedValues?: readonly (string | number)[];
}

export interface AIEditorCapabilityContext {
  operations: AICapabilityOperation[];
  textSettings: AISettingCapability[];
  textEffects: AIEffectCapability[];
  elements: AIElementCapability[];
}

const DIRECTION_VALUES = EFFECT_DIRECTION_OPTIONS.map((option) => option.degrees);

export const AI_EDITOR_CAPABILITY_CONTEXT: AIEditorCapabilityContext = {
  operations: [
    {
      key: "replace_lyric_timing",
      label: "Replace Lyric Timing",
      description:
        "Replace existing plain text lyric items with a newly planned timing/grouping layout while preserving non-text items.",
      scope: "project",
    },
    {
      key: "add_text_items",
      label: "Add Text Items",
      description:
        "Create new text timeline items with explicit text, start, end, and app-owned defaults for layout and rendering.",
      scope: "text-item",
    },
    {
      key: "update_text_settings",
      label: "Update Text Settings",
      description:
        "Modify supported text item settings like font, color, opacity, spacing, glow, and position.",
      scope: "text-item",
    },
    {
      key: "update_existing_text_items",
      label: "Update Existing Text Items",
      description:
        "Target existing lyric items by exact text content and update their style and-or text effects without rebuilding the full timeline.",
      scope: "text-item",
    },
    {
      key: "apply_text_effect",
      label: "Apply Text Effect",
      description:
        "Attach one of the supported text effects to existing text items using normalized effect timing and defaults.",
      scope: "text-item",
    },
    {
      key: "add_element",
      label: "Add Element",
      description:
        "Add a supported non-text timeline element such as a visualizer, particles, or light field.",
      scope: "element-item",
    },
    {
      key: "update_element_settings",
      label: "Update Element Settings",
      description:
        "Modify supported visualizer, particle, or light settings using app-defined defaults and normalization.",
      scope: "element-item",
    },
    {
      key: "update_image_settings",
      label: "Update Image Settings",
      description:
        "Modify imported image item settings such as scale, rotation, edge feathering, and sway behavior.",
      scope: "image-item",
    },
  ],
  textSettings: [
    {
      key: TextCustomizationSettingType.fontName,
      label: "Font Name",
      description: "Change the text font family.",
      scope: "text-item",
      allowedValues: SUPPORTED_FONT_FAMILIES,
    },
    {
      key: TextCustomizationSettingType.fontSize,
      label: "Font Size",
      description: "Adjust lyric text size.",
      scope: "text-item",
    },
    {
      key: TextCustomizationSettingType.fontWeight,
      label: "Font Weight",
      description: "Adjust text thickness/weight.",
      scope: "text-item",
      allowedValues: SUPPORTED_FONT_WEIGHTS,
    },
    {
      key: TextCustomizationSettingType.fontColor,
      label: "Font Color",
      description: "Change lyric text color.",
      scope: "text-item",
    },
    {
      key: TextCustomizationSettingType.textFillOpacity,
      label: "Text Fill Opacity",
      description: "Control lyric fill transparency.",
      scope: "text-item",
    },
    {
      key: TextCustomizationSettingType.letterSpacing,
      label: "Letter Spacing",
      description: "Adjust spacing between glyphs.",
      scope: "text-item",
    },
    {
      key: TextCustomizationSettingType.shadowBlur,
      label: "Shadow Blur",
      description: "Set text shadow softness.",
      scope: "text-item",
    },
    {
      key: TextCustomizationSettingType.shadowColor,
      label: "Shadow Color",
      description: "Set text shadow color.",
      scope: "text-item",
    },
    {
      key: TextCustomizationSettingType.textGlowBlur,
      label: "Glow Blur",
      description: "Set lyric glow softness.",
      scope: "text-item",
    },
    {
      key: TextCustomizationSettingType.textGlowColor,
      label: "Glow Color",
      description: "Set lyric glow color.",
      scope: "text-item",
    },
    {
      key: TextCustomizationSettingType.textX,
      label: "Text X",
      description: "Move text horizontally in normalized preview space.",
      scope: "text-item",
    },
    {
      key: TextCustomizationSettingType.textY,
      label: "Text Y",
      description: "Move text vertically in normalized preview space.",
      scope: "text-item",
    },
    {
      key: TextCustomizationSettingType.itemOpacity,
      label: "Item Opacity",
      description: "Control overall item opacity.",
      scope: "text-item",
    },
    {
      key: TextCustomizationSettingType.renderEnabled,
      label: "Render Enabled",
      description: "Turn item visibility on or off.",
      scope: "text-item",
    },
    {
      key: TextCustomizationSettingType.imageScale,
      label: "Image Scale",
      description: "Resize an imported image item.",
      scope: "image-item",
    },
    {
      key: TextCustomizationSettingType.imageRotation,
      label: "Image Rotation",
      description: "Rotate an imported image item.",
      scope: "image-item",
    },
    {
      key: TextCustomizationSettingType.imageOpacity,
      label: "Image Opacity",
      description: "Control image transparency.",
      scope: "image-item",
    },
    {
      key: TextCustomizationSettingType.imageEdgeFeather,
      label: "Image Edge Feather",
      description: "Blend image edges into the scene.",
      scope: "image-item",
    },
    {
      key: TextCustomizationSettingType.imageDanceAmount,
      label: "Image Sway Amount",
      description: "Set image motion amount.",
      scope: "image-item",
    },
    {
      key: TextCustomizationSettingType.imageDanceSpeed,
      label: "Image Animation Speed",
      description: "Set image sway speed.",
      scope: "image-item",
    },
    {
      key: TextCustomizationSettingType.imageDanceDirection,
      label: "Image Sway Direction",
      description: "Set image sway direction in degrees.",
      scope: "image-item",
    },
    {
      key: TextCustomizationSettingType.imageDanceMode,
      label: "Image Sway Motion",
      description: "Choose between straight-line and windshield-wiper image sway.",
      scope: "image-item",
    },
  ],
  textEffects: [
    {
      key: TEXT_EFFECT_TYPE_ASH_FADE,
      label: "Ash Fade",
      description: "Break text into drifting particles with directional motion.",
      defaults: DEFAULT_ASH_FADE_SETTINGS,
      timing: {
        startPercentRange: [0, 1],
        endPercentRange: [0, 1],
        minPercentSpan: DEFAULT_MIN_EFFECT_PERCENT_SPAN,
        minDurationSeconds: DEFAULT_MIN_EFFECT_DURATION,
      },
      settings: [
        { key: "enabled", type: "boolean", description: "Enable or disable the effect." },
        { key: "reverse", type: "boolean", description: "Reverse the timing curve." },
        { key: "startPercent", type: "number", description: "Normalized effect start within the item duration." },
        { key: "endPercent", type: "number", description: "Normalized effect end within the item duration." },
        { key: "intensity", type: "number", description: "Overall ash breakup intensity." },
        { key: "textFade", type: "number", description: "How much the original text fades out." },
        { key: "sparkleAmount", type: "number", description: "Additional particle sparkle amount." },
        { key: "particleSharpness", type: "number", description: "Particle edge sharpness." },
        { key: "animationDirection", type: "enum", description: "Particle travel direction in degrees.", allowedValues: DIRECTION_VALUES },
        { key: "wind", type: "number", description: "Directional wind influence." },
      ],
    },
    {
      key: TEXT_EFFECT_TYPE_BLUR,
      label: "Blur",
      description: "Blur the text over time, optionally fading in or out.",
      defaults: DEFAULT_BLUR_SETTINGS,
      timing: {
        startPercentRange: [0, 1],
        endPercentRange: [0, 1],
        minPercentSpan: DEFAULT_MIN_EFFECT_PERCENT_SPAN,
        minDurationSeconds: DEFAULT_MIN_EFFECT_DURATION,
      },
      settings: [
        { key: "enabled", type: "boolean", description: "Enable or disable the effect." },
        { key: "reverse", type: "boolean", description: "Reverse the timing curve." },
        { key: "startPercent", type: "number", description: "Normalized effect start within the item duration." },
        { key: "endPercent", type: "number", description: "Normalized effect end within the item duration." },
        { key: "amount", type: "number", description: "Blur amount." },
        { key: "fadeMode", type: "enum", description: "Blur fade behavior.", allowedValues: ["none", "in", "out", "inOut"] },
      ],
    },
    {
      key: TEXT_EFFECT_TYPE_DIRECTIONAL_FADE,
      label: "Directional Fade",
      description: "Fade text directionally with softness and easing control.",
      defaults: DEFAULT_DIRECTIONAL_FADE_SETTINGS,
      timing: {
        startPercentRange: [0, 1],
        endPercentRange: [0, 1],
        minPercentSpan: DEFAULT_MIN_EFFECT_PERCENT_SPAN,
        minDurationSeconds: DEFAULT_MIN_EFFECT_DURATION,
      },
      settings: [
        { key: "enabled", type: "boolean", description: "Enable or disable the effect." },
        { key: "reverse", type: "boolean", description: "Reverse the timing curve." },
        { key: "startPercent", type: "number", description: "Normalized effect start within the item duration." },
        { key: "endPercent", type: "number", description: "Normalized effect end within the item duration." },
        { key: "amount", type: "number", description: "Directional fade amount." },
        { key: "softness", type: "number", description: "Edge softness of the fade." },
        { key: "alphaFade", type: "number", description: "Additional alpha fade amount." },
        { key: "easing", type: "enum", description: "Directional fade easing mode.", allowedValues: [DIRECTIONAL_FADE_EASING_LINEAR, DIRECTIONAL_FADE_EASING_EASE_OUT] },
        { key: "speed", type: "number", description: "Directional sweep speed." },
        { key: "animationDirection", type: "enum", description: "Fade direction in degrees.", allowedValues: DIRECTION_VALUES },
      ],
    },
    {
      key: TEXT_EFFECT_TYPE_FLOATING,
      label: "Floating",
      description: "Move text in a chosen direction with distance and speed control.",
      defaults: DEFAULT_FLOATING_SETTINGS,
      timing: {
        startPercentRange: [0, 1],
        endPercentRange: [0, 1],
        minPercentSpan: DEFAULT_MIN_EFFECT_PERCENT_SPAN,
        minDurationSeconds: DEFAULT_MIN_EFFECT_DURATION,
      },
      settings: [
        { key: "enabled", type: "boolean", description: "Enable or disable the effect." },
        { key: "reverse", type: "boolean", description: "Reverse the timing curve." },
        { key: "startPercent", type: "number", description: "Normalized effect start within the item duration." },
        { key: "endPercent", type: "number", description: "Normalized effect end within the item duration." },
        { key: "distance", type: "number", description: "Floating travel distance." },
        { key: "preStartSeconds", type: "number", description: "Allow motion to begin before the lyric start time." },
        { key: "speed", type: "number", description: "Floating motion speed." },
        { key: "animationDirection", type: "enum", description: "Floating direction in degrees.", allowedValues: DIRECTION_VALUES },
      ],
    },
    {
      key: TEXT_EFFECT_TYPE_GLITCH,
      label: "Glitch",
      description: "Apply split, jitter, and flicker distortion to text.",
      defaults: DEFAULT_GLITCH_SETTINGS,
      timing: {
        startPercentRange: [0, 1],
        endPercentRange: [0, 1],
        minPercentSpan: DEFAULT_MIN_EFFECT_PERCENT_SPAN,
        minDurationSeconds: DEFAULT_MIN_EFFECT_DURATION,
      },
      settings: [
        { key: "enabled", type: "boolean", description: "Enable or disable the effect." },
        { key: "reverse", type: "boolean", description: "Reverse the timing curve." },
        { key: "startPercent", type: "number", description: "Normalized effect start within the item duration." },
        { key: "endPercent", type: "number", description: "Normalized effect end within the item duration." },
        { key: "intensity", type: "number", description: "Overall glitch intensity." },
        { key: "splitAmount", type: "number", description: "RGB split amount." },
        { key: "jitterAmount", type: "number", description: "Position jitter amount." },
        { key: "flickerAmount", type: "number", description: "Brightness flicker amount." },
        { key: "flickerSpeed", type: "number", description: "Flicker speed." },
        { key: "animationDirection", type: "enum", description: "Preferred directional emphasis in degrees.", allowedValues: DIRECTION_VALUES },
      ],
    },
    {
      key: TEXT_EFFECT_TYPE_WATER_DISTORTION,
      label: "Water Distortion",
      description: "Apply wave-like distortion with directional motion.",
      defaults: DEFAULT_WATER_DISTORTION_SETTINGS,
      timing: {
        startPercentRange: [0, 1],
        endPercentRange: [0, 1],
        minPercentSpan: DEFAULT_MIN_EFFECT_PERCENT_SPAN,
        minDurationSeconds: DEFAULT_MIN_EFFECT_DURATION,
      },
      settings: [
        { key: "enabled", type: "boolean", description: "Enable or disable the effect." },
        { key: "reverse", type: "boolean", description: "Reverse the timing curve." },
        { key: "startPercent", type: "number", description: "Normalized effect start within the item duration." },
        { key: "endPercent", type: "number", description: "Normalized effect end within the item duration." },
        { key: "amount", type: "number", description: "Distortion strength." },
        { key: "speed", type: "number", description: "Wave speed." },
        { key: "animationDirection", type: "enum", description: "Wave motion direction in degrees.", allowedValues: DIRECTION_VALUES },
      ],
    },
  ],
  elements: [
    {
      key: "visualizer",
      label: "Visualizer",
      description: "A radial-gradient audio visualizer background element.",
      defaults: DEFAULT_VISUALIZER_SETTING,
      settings: [
        { key: "fillRadialGradientStartPoint", type: "object", description: "Gradient start point with normalized x/y coordinates." },
        { key: "fillRadialGradientEndPoint", type: "object", description: "Gradient end point with normalized x/y coordinates." },
        { key: "fillRadialGradientStartRadius", type: "object", description: "Gradient inner radius and beat-sync intensity." },
        { key: "fillRadialGradientEndRadius", type: "object", description: "Gradient outer radius and beat-sync intensity." },
        { key: "fillRadialGradientColorStops", type: "array", description: "Ordered color stops with beat-sync intensity values." },
        { key: "blur", type: "number", description: "Visualizer blur amount." },
        { key: "previewEffectsEnabled", type: "boolean", description: "Whether preview effects are active in the editor." },
      ],
    },
    {
      key: "particle",
      label: "Particles",
      description: "A particle field with directional motion and beat-reactive behavior.",
      defaults: DEFAULT_PARTICLE_SETTINGS,
      settings: [
        { key: "count", type: "number", description: "Number of particles." },
        { key: "size", type: "number", description: "Particle size." },
        { key: "speed", type: "number", description: "Particle travel speed." },
        { key: "sparkleSpeed", type: "number", description: "Sparkle/pulse animation speed." },
        { key: "animationMode", type: "enum", description: "Particle animation mode.", allowedValues: ["sparkle", "pulse", "flicker", "steady"] },
        { key: "opacity", type: "number", description: "Particle opacity." },
        { key: "direction", type: "enum", description: "Directional heading in degrees.", allowedValues: DIRECTION_VALUES },
        { key: "travelVectorX", type: "number", description: "Normalized manual travel vector X component." },
        { key: "travelVectorY", type: "number", description: "Normalized manual travel vector Y component." },
        { key: "spread", type: "number", description: "Particle spread/randomness." },
        { key: "color", type: "color", description: "Particle color." },
        { key: "beatReactiveIntensity", type: "number", description: "How strongly particles react to beats." },
      ],
    },
    {
      key: "light",
      label: "Light",
      description: "A layered light-field background with blurred color regions.",
      defaults: DEFAULT_LIGHT_SETTINGS,
      settings: [
        { key: "baseColor", type: "color", description: "Underlying scene wash color." },
        { key: "baseOpacity", type: "number", description: "Underlying scene wash opacity." },
        { key: "blur", type: "number", description: "Global light blur amount." },
        { key: "fields", type: "array", description: "Array of light fields with color, position, radius, rotation, opacity, and motionAmount." },
      ],
    },
  ],
};

export function serializeAIEditorCapabilityContext() {
  return JSON.stringify(AI_EDITOR_CAPABILITY_CONTEXT, null, 2);
}