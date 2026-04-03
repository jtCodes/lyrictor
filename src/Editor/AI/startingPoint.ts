import {
  LRCLIBSyncedLyricLine,
  parseLRCLIBSyncedLyrics,
} from "../../api/lrclib";
import { getFirstNonOverlappingTimelineLevel } from "../AudioTimeline/utils";
import { normalizeDirectionDegrees } from "../Lyrics/Effects/direction";
import {
  TEXT_EFFECT_TYPE_ASH_FADE,
  TEXT_EFFECT_TYPE_BLUR,
  TEXT_EFFECT_TYPE_DIRECTIONAL_FADE,
  TEXT_EFFECT_TYPE_FLOATING,
  TEXT_EFFECT_TYPE_GLITCH,
  TEXT_EFFECT_TYPE_WATER_DISTORTION,
  TextEffect,
} from "../Lyrics/Effects/types";
import { DEFAULT_ASH_FADE_SETTINGS } from "../Lyrics/Effects/AshFade/types";
import { DEFAULT_BLUR_SETTINGS } from "../Lyrics/Effects/Blur/types";
import { DEFAULT_DIRECTIONAL_FADE_SETTINGS } from "../Lyrics/Effects/DirectionalFade/types";
import { DEFAULT_FLOATING_SETTINGS } from "../Lyrics/Effects/Floating/types";
import { DEFAULT_GLITCH_SETTINGS } from "../Lyrics/Effects/Glitch/types";
import {
  constrainTimedEffectRange,
} from "../Lyrics/Effects/shared";
import { DEFAULT_WATER_DISTORTION_SETTINGS } from "../Lyrics/Effects/WaterDistortion/types";
import { getCenteredTextPosition } from "../Lyrics/LyricPreview/textCentering";
import {
  SUPPORTED_FONT_FAMILIES,
  SUPPORTED_FONT_WEIGHTS,
} from "../Lyrics/LyricPreview/supportedFonts";
import { normalizeVisualizerSetting } from "../Visualizer/store";
import { buildDefaultVisualizerSetting } from "../Visualizer/addVisualizerToTimeline";
import { normalizeParticleSettings } from "../Particles/store";
import { normalizeLightSettings } from "../Light/store";
import { isTextItem } from "../utils";
import { ElementType, LyricText } from "../types";
import { ProjectDetail } from "../../Project/types";
import { generateLyricTextId } from "../../Project/store";
import { RGBColor } from "react-color";

export const AI_STARTING_POINT_MODEL = "google/gemini-2.5-flash";
export const AI_STARTING_POINT_MODELS = [
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
  },
  {
    id: "openai/gpt-5-mini",
    label: "GPT-5 Mini",
  },
  {
    id: "openai/gpt-5",
    label: "GPT-5",
  },
  {
    id: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4",
  },
] as const;

export const AI_STARTING_POINT_ELEMENT_ADDONS = [
  { id: "visualizer", label: "Visualizer" },
  { id: "particle", label: "Particles" },
  { id: "light", label: "Light" },
] as const;

const MIN_SEGMENT_DURATION_SECONDS = 0.35;

export type StartingPointSourceType =
  | "lrclib-synced"
  | "lyric-reference"
  | "lrclib-plain";

export interface StartingPointSource {
  type: StartingPointSourceType;
  label: string;
  lyricsText: string;
  lineCount: number;
  timedLines?: LRCLIBSyncedLyricLine[];
  timelineOffsetSeconds?: number;
  clipDurationSeconds?: number;
  fullSongDurationSeconds?: number;
}

export interface AIStartingPointDraftSegment {
  section?: string;
  text: string;
  start: number;
  end: number;
  style?: AIStartingPointDraftStyle;
  effects?: AIStartingPointDraftEffect[];
}

export interface AIStartingPointDraft {
  summary?: string;
  globalStyle?: AIStartingPointDraftStyle;
  segments: AIStartingPointDraftSegment[];
  elements?: AIStartingPointDraftElement[];
  textUpdates?: AIStartingPointDraftTextUpdate[];
}

export interface AIStartingPointDraftTextSelector {
  text: string;
  occurrence?: number;
  approximateStart?: number;
}

export interface AIStartingPointDraftTextUpdate {
  selector: AIStartingPointDraftTextSelector;
  style?: AIStartingPointDraftStyle;
  effects?: AIStartingPointDraftEffect[];
  effectMode?: "replace" | "append";
}

export interface AIStartingPointDraftElement {
  type: ElementType;
  start?: number;
  end?: number;
  settings?: Record<string, unknown>;
}

export interface AIStartingPointDraftEffect {
  type: TextEffect["type"];
  settings?: Record<string, unknown>;
}

export interface AIStartingPointDraftStyle {
  fontName?: string;
  fontSize?: number;
  fontWeight?: number;
  fontColor?: RGBColor;
  textFillOpacity?: number;
  letterSpacing?: number;
  shadowBlur?: number;
  shadowColor?: RGBColor;
  textGlowBlur?: number;
  textGlowColor?: RGBColor;
  textX?: number;
  textY?: number;
  itemOpacity?: number;
  renderEnabled?: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseLyricReferenceText(lyricReference?: string): string | undefined {
  if (!lyricReference || lyricReference.trim().length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(lyricReference) as {
      blocks?: Array<{ text?: string }>;
    };
    const text = (parsed.blocks ?? [])
      .map((block) => block.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n")
      .trim();

    return text || undefined;
  } catch {
    const text = lyricReference.trim();
    return text.length > 0 ? text : undefined;
  }
}

function countLyricLines(text: string) {
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

export function resolveStartingPointSource({
  editingProject,
  lyricReference,
  clipDurationSeconds,
}: {
  editingProject?: ProjectDetail;
  lyricReference?: string;
  clipDurationSeconds?: number;
}): StartingPointSource | undefined {
  const timelineOffsetSeconds = Math.max(0, editingProject?.lrclibOffsetSeconds ?? 0);
  const timedLines = parseLRCLIBSyncedLyrics(editingProject?.lrclib?.syncedLyrics).filter(
    (line) => line.text.trim().length > 0
  );

  const effectiveClipDurationSeconds =
    clipDurationSeconds !== undefined && Number.isFinite(clipDurationSeconds) && clipDurationSeconds > 0
      ? clipDurationSeconds
      : undefined;

  const shiftedTimedLines = timedLines
    .filter((line, index) => {
      if (line.time >= timelineOffsetSeconds) {
        return true;
      }

      const nextLine = timedLines[index + 1];
      return Boolean(nextLine && nextLine.time > timelineOffsetSeconds);
    })
    .map((line) => ({
      ...line,
      time: Math.max(0, line.time - timelineOffsetSeconds),
    }))
    .filter((line) => {
      if (effectiveClipDurationSeconds === undefined) {
        return true;
      }

      return line.time < effectiveClipDurationSeconds;
    });

  if (shiftedTimedLines.length > 0) {
    const lyricsText = shiftedTimedLines.map((line) => line.text).join("\n");
    return {
      type: "lrclib-synced",
      label: "LRCLIB synced lyrics",
      lyricsText,
      lineCount: shiftedTimedLines.length,
      timedLines: shiftedTimedLines,
      timelineOffsetSeconds,
      clipDurationSeconds: effectiveClipDurationSeconds,
      fullSongDurationSeconds:
        editingProject?.lrclib?.duration && editingProject.lrclib.duration > 0
          ? editingProject.lrclib.duration
          : undefined,
    };
  }

  const referenceText = parseLyricReferenceText(lyricReference);
  if (referenceText) {
    return {
      type: "lyric-reference",
      label: "Lyric reference",
      lyricsText: referenceText,
      lineCount: countLyricLines(referenceText),
    };
  }

  const plainLyrics = editingProject?.lrclib?.plainLyrics?.trim();
  if (plainLyrics) {
    return {
      type: "lrclib-plain",
      label: "LRCLIB plain lyrics",
      lyricsText: plainLyrics,
      lineCount: countLyricLines(plainLyrics),
    };
  }

  return undefined;
}

export function getStartingPointDurationSeconds({
  editingProject,
  playbackDurationSeconds,
}: {
  editingProject?: ProjectDetail;
  playbackDurationSeconds?: number;
}) {
  if (
    playbackDurationSeconds !== undefined &&
    Number.isFinite(playbackDurationSeconds) &&
    playbackDurationSeconds > 0
  ) {
    return playbackDurationSeconds;
  }

  if (editingProject?.lrclib?.duration && editingProject.lrclib.duration > 0) {
    return editingProject.lrclib.duration;
  }

  if (
    editingProject?.youtubeDurationSeconds &&
    editingProject.youtubeDurationSeconds > 0
  ) {
    return editingProject.youtubeDurationSeconds;
  }

  return undefined;
}

function parseJSONObjectCandidate(content: string) {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new Error("AI response was empty");
  }

  try {
    return JSON.parse(trimmed) as AIStartingPointDraft;
  } catch {
    // Fall through to fenced extraction.
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i) ?? trimmed.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return JSON.parse(fencedMatch[1].trim()) as AIStartingPointDraft;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as AIStartingPointDraft;
  }

  throw new Error("AI response did not contain valid JSON");
}

function sanitizeSegmentText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getDraftArrayCandidate(
  parsed: Record<string, unknown>,
  key: "segments" | "elements" | "textUpdates"
): unknown[] | undefined {
  const direct = parsed[key];
  if (Array.isArray(direct)) {
    return direct;
  }

  const wrapperKeys = ["draft", "result", "response", "updates", "timeline", "data"];

  for (const wrapperKey of wrapperKeys) {
    const wrapper = parsed[wrapperKey];
    if (!isRecord(wrapper)) {
      continue;
    }

    const nested = wrapper[key];
    if (Array.isArray(nested)) {
      return nested;
    }
  }

  return undefined;
}

function getOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function getOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function normalizeDraftElementType(value: unknown): ElementType | undefined {
  if (value === "visualizer" || value === "particle" || value === "light") {
    return value;
  }

  if (value === "particles") {
    return "particle";
  }

  return undefined;
}

function normalizeColorChannel(value: unknown, fallback: number) {
  const numericValue = getOptionalNumber(value);
  if (numericValue === undefined) {
    return fallback;
  }

  return clamp(Math.round(numericValue), 0, 255);
}

function normalizeOpacityChannel(value: unknown, fallback: number) {
  const numericValue = getOptionalNumber(value);
  if (numericValue === undefined) {
    return fallback;
  }

  return clamp(numericValue, 0, 1);
}

function normalizeDraftColor(value: unknown): RGBColor | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    r: normalizeColorChannel(value.r, 255),
    g: normalizeColorChannel(value.g, 255),
    b: normalizeColorChannel(value.b, 255),
    a: normalizeOpacityChannel(value.a, 1),
  };
}

function normalizeDraftStyle(style: unknown): AIStartingPointDraftStyle | undefined {
  if (!isRecord(style)) {
    return undefined;
  }

  const fontName =
    typeof style.fontName === "string" && SUPPORTED_FONT_FAMILIES.includes(style.fontName as any)
      ? style.fontName
      : undefined;
  const fontWeightCandidate = getOptionalNumber(style.fontWeight);
  const fontWeight =
    fontWeightCandidate !== undefined &&
    SUPPORTED_FONT_WEIGHTS.includes(fontWeightCandidate as any)
      ? fontWeightCandidate
      : undefined;
  const normalizedStyle: AIStartingPointDraftStyle = {
    fontName,
    fontSize:
      getOptionalNumber(style.fontSize) !== undefined
        ? clamp(getOptionalNumber(style.fontSize)!, 1, 72)
        : undefined,
    fontWeight,
    fontColor: normalizeDraftColor(style.fontColor),
    textFillOpacity:
      getOptionalNumber(style.textFillOpacity) !== undefined
        ? clamp(getOptionalNumber(style.textFillOpacity)!, 0, 1)
        : undefined,
    letterSpacing:
      getOptionalNumber(style.letterSpacing) !== undefined
        ? clamp(getOptionalNumber(style.letterSpacing)!, -20, 80)
        : undefined,
    shadowBlur:
      getOptionalNumber(style.shadowBlur) !== undefined
        ? clamp(getOptionalNumber(style.shadowBlur)!, 0, 25)
        : undefined,
    shadowColor: normalizeDraftColor(style.shadowColor),
    textGlowBlur:
      getOptionalNumber(style.textGlowBlur) !== undefined
        ? clamp(getOptionalNumber(style.textGlowBlur)!, 0, 120)
        : undefined,
    textGlowColor: normalizeDraftColor(style.textGlowColor),
    textX:
      getOptionalNumber(style.textX) !== undefined
        ? clamp(getOptionalNumber(style.textX)!, 0, 1)
        : undefined,
    textY:
      getOptionalNumber(style.textY) !== undefined
        ? clamp(getOptionalNumber(style.textY)!, 0, 1)
        : undefined,
    itemOpacity:
      getOptionalNumber(style.itemOpacity) !== undefined
        ? clamp(getOptionalNumber(style.itemOpacity)!, 0, 1)
        : undefined,
    renderEnabled: getOptionalBoolean(style.renderEnabled),
  };

  const hasValues = Object.values(normalizedStyle).some((value) => value !== undefined);
  return hasValues ? normalizedStyle : undefined;
}

function mergeDraftStyles(
  baseStyle?: AIStartingPointDraftStyle,
  overrideStyle?: AIStartingPointDraftStyle
): AIStartingPointDraftStyle | undefined {
  if (!baseStyle && !overrideStyle) {
    return undefined;
  }

  return {
    ...baseStyle,
    ...overrideStyle,
    fontColor: overrideStyle?.fontColor ?? baseStyle?.fontColor,
    shadowColor: overrideStyle?.shadowColor ?? baseStyle?.shadowColor,
    textGlowColor: overrideStyle?.textGlowColor ?? baseStyle?.textGlowColor,
  };
}

function applyDraftStyleToLyricText(
  lyricText: LyricText,
  style?: AIStartingPointDraftStyle
) {
  if (!style) {
    return lyricText;
  }

  return {
    ...lyricText,
    ...(style.fontName !== undefined ? { fontName: style.fontName } : {}),
    ...(style.fontSize !== undefined ? { fontSize: style.fontSize } : {}),
    ...(style.fontWeight !== undefined ? { fontWeight: style.fontWeight } : {}),
    ...(style.fontColor !== undefined ? { fontColor: style.fontColor } : {}),
    ...(style.textFillOpacity !== undefined ? { textFillOpacity: style.textFillOpacity } : {}),
    ...(style.letterSpacing !== undefined ? { letterSpacing: style.letterSpacing } : {}),
    ...(style.shadowBlur !== undefined ? { shadowBlur: style.shadowBlur } : {}),
    ...(style.shadowColor !== undefined ? { shadowColor: style.shadowColor } : {}),
    ...(style.textGlowBlur !== undefined ? { textGlowBlur: style.textGlowBlur } : {}),
    ...(style.textGlowColor !== undefined ? { textGlowColor: style.textGlowColor } : {}),
    ...(style.textX !== undefined ? { textX: style.textX } : {}),
    ...(style.textY !== undefined ? { textY: style.textY } : {}),
    ...(style.itemOpacity !== undefined ? { itemOpacity: style.itemOpacity } : {}),
    ...(style.renderEnabled !== undefined ? { renderEnabled: style.renderEnabled } : {}),
  };
}

function createEffectId(prefix: string, lyricTextId: number, effectIndex: number) {
  return `${prefix}-${lyricTextId}-${effectIndex}`;
}

function normalizeDraftEffects(
  draftEffects: unknown,
  lyricTextId: number,
  effectIndexOffset: number = 0
): TextEffect[] | undefined {
  if (!Array.isArray(draftEffects)) {
    return undefined;
  }

  const normalizedEffects = draftEffects.reduce<TextEffect[]>((effects, draftEffect, effectIndex) => {
    if (!isRecord(draftEffect) || typeof draftEffect.type !== "string") {
      return effects;
    }

    const settings = isRecord(draftEffect.settings) ? draftEffect.settings : {};
    const enabled = getOptionalBoolean(settings.enabled) ?? true;
    const reverse = getOptionalBoolean(settings.reverse);
    const startPercent = getOptionalNumber(settings.startPercent);
    const endPercent = getOptionalNumber(settings.endPercent);

    switch (draftEffect.type as TextEffect["type"]) {
      case TEXT_EFFECT_TYPE_ASH_FADE: {
        const base = constrainTimedEffectRange({
          ...DEFAULT_ASH_FADE_SETTINGS,
          enabled,
          reverse: reverse ?? DEFAULT_ASH_FADE_SETTINGS.reverse,
          intensity: getOptionalNumber(settings.intensity) ?? DEFAULT_ASH_FADE_SETTINGS.intensity,
          textFade: getOptionalNumber(settings.textFade) ?? DEFAULT_ASH_FADE_SETTINGS.textFade,
          sparkleAmount:
            getOptionalNumber(settings.sparkleAmount) ?? DEFAULT_ASH_FADE_SETTINGS.sparkleAmount,
          particleSharpness:
            getOptionalNumber(settings.particleSharpness) ?? DEFAULT_ASH_FADE_SETTINGS.particleSharpness,
          animationDirection: normalizeDirectionDegrees(
            getOptionalNumber(settings.animationDirection) ??
              DEFAULT_ASH_FADE_SETTINGS.animationDirection
          ),
          wind: getOptionalNumber(settings.wind) ?? DEFAULT_ASH_FADE_SETTINGS.wind,
          startPercent: startPercent ?? DEFAULT_ASH_FADE_SETTINGS.startPercent,
          endPercent: endPercent ?? DEFAULT_ASH_FADE_SETTINGS.endPercent,
        });

        effects.push({
          type: TEXT_EFFECT_TYPE_ASH_FADE,
          id: createEffectId("ash-fade", lyricTextId, effectIndex + effectIndexOffset),
          ...base,
        });
        return effects;
      }

      case TEXT_EFFECT_TYPE_BLUR: {
        const fadeMode =
          settings.fadeMode === "none" ||
          settings.fadeMode === "in" ||
          settings.fadeMode === "out" ||
          settings.fadeMode === "inOut"
            ? settings.fadeMode
            : DEFAULT_BLUR_SETTINGS.fadeMode;
        const base = constrainTimedEffectRange({
          ...DEFAULT_BLUR_SETTINGS,
          enabled,
          reverse: reverse ?? DEFAULT_BLUR_SETTINGS.reverse,
          amount: getOptionalNumber(settings.amount) ?? DEFAULT_BLUR_SETTINGS.amount,
          fadeMode,
          startPercent: startPercent ?? DEFAULT_BLUR_SETTINGS.startPercent,
          endPercent: endPercent ?? DEFAULT_BLUR_SETTINGS.endPercent,
        });

        effects.push({
          type: TEXT_EFFECT_TYPE_BLUR,
          id: createEffectId("blur", lyricTextId, effectIndex + effectIndexOffset),
          ...base,
        });
        return effects;
      }

      case TEXT_EFFECT_TYPE_DIRECTIONAL_FADE: {
        const easing =
          settings.easing === "linear" || settings.easing === "easeOut"
            ? settings.easing
            : DEFAULT_DIRECTIONAL_FADE_SETTINGS.easing;
        const base = constrainTimedEffectRange({
          ...DEFAULT_DIRECTIONAL_FADE_SETTINGS,
          enabled,
          reverse: reverse ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.reverse,
          amount: getOptionalNumber(settings.amount) ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.amount,
          softness: getOptionalNumber(settings.softness) ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.softness,
          alphaFade: getOptionalNumber(settings.alphaFade) ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.alphaFade,
          easing,
          speed: getOptionalNumber(settings.speed) ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.speed,
          animationDirection: normalizeDirectionDegrees(
            getOptionalNumber(settings.animationDirection) ??
              DEFAULT_DIRECTIONAL_FADE_SETTINGS.animationDirection
          ),
          startPercent: startPercent ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.startPercent,
          endPercent: endPercent ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.endPercent,
        });

        effects.push({
          type: TEXT_EFFECT_TYPE_DIRECTIONAL_FADE,
          id: createEffectId("directional-fade", lyricTextId, effectIndex + effectIndexOffset),
          ...base,
        });
        return effects;
      }

      case TEXT_EFFECT_TYPE_FLOATING: {
        const base = constrainTimedEffectRange({
          ...DEFAULT_FLOATING_SETTINGS,
          enabled,
          reverse: reverse ?? DEFAULT_FLOATING_SETTINGS.reverse,
          distance: getOptionalNumber(settings.distance) ?? DEFAULT_FLOATING_SETTINGS.distance,
          preStartSeconds:
            getOptionalNumber(settings.preStartSeconds) ?? DEFAULT_FLOATING_SETTINGS.preStartSeconds,
          speed: getOptionalNumber(settings.speed) ?? DEFAULT_FLOATING_SETTINGS.speed,
          animationDirection: normalizeDirectionDegrees(
            getOptionalNumber(settings.animationDirection) ??
              DEFAULT_FLOATING_SETTINGS.animationDirection
          ),
          startPercent: startPercent ?? DEFAULT_FLOATING_SETTINGS.startPercent,
          endPercent: endPercent ?? DEFAULT_FLOATING_SETTINGS.endPercent,
        });

        effects.push({
          type: TEXT_EFFECT_TYPE_FLOATING,
          id: createEffectId("floating", lyricTextId, effectIndex + effectIndexOffset),
          ...base,
        });
        return effects;
      }

      case TEXT_EFFECT_TYPE_GLITCH: {
        const base = constrainTimedEffectRange({
          ...DEFAULT_GLITCH_SETTINGS,
          enabled,
          reverse: reverse ?? DEFAULT_GLITCH_SETTINGS.reverse,
          intensity: getOptionalNumber(settings.intensity) ?? DEFAULT_GLITCH_SETTINGS.intensity,
          splitAmount: getOptionalNumber(settings.splitAmount) ?? DEFAULT_GLITCH_SETTINGS.splitAmount,
          jitterAmount: getOptionalNumber(settings.jitterAmount) ?? DEFAULT_GLITCH_SETTINGS.jitterAmount,
          flickerAmount: getOptionalNumber(settings.flickerAmount) ?? DEFAULT_GLITCH_SETTINGS.flickerAmount,
          flickerSpeed: getOptionalNumber(settings.flickerSpeed) ?? DEFAULT_GLITCH_SETTINGS.flickerSpeed,
          animationDirection: normalizeDirectionDegrees(
            getOptionalNumber(settings.animationDirection) ?? DEFAULT_GLITCH_SETTINGS.animationDirection
          ),
          startPercent: startPercent ?? DEFAULT_GLITCH_SETTINGS.startPercent,
          endPercent: endPercent ?? DEFAULT_GLITCH_SETTINGS.endPercent,
        });

        effects.push({
          type: TEXT_EFFECT_TYPE_GLITCH,
          id: createEffectId("glitch", lyricTextId, effectIndex + effectIndexOffset),
          ...base,
        });
        return effects;
      }

      case TEXT_EFFECT_TYPE_WATER_DISTORTION: {
        const base = constrainTimedEffectRange({
          ...DEFAULT_WATER_DISTORTION_SETTINGS,
          enabled,
          reverse: reverse ?? DEFAULT_WATER_DISTORTION_SETTINGS.reverse,
          amount: getOptionalNumber(settings.amount) ?? DEFAULT_WATER_DISTORTION_SETTINGS.amount,
          speed: getOptionalNumber(settings.speed) ?? DEFAULT_WATER_DISTORTION_SETTINGS.speed,
          animationDirection: normalizeDirectionDegrees(
            getOptionalNumber(settings.animationDirection) ??
              DEFAULT_WATER_DISTORTION_SETTINGS.animationDirection
          ),
          startPercent: startPercent ?? DEFAULT_WATER_DISTORTION_SETTINGS.startPercent,
          endPercent: endPercent ?? DEFAULT_WATER_DISTORTION_SETTINGS.endPercent,
        });

        effects.push({
          type: TEXT_EFFECT_TYPE_WATER_DISTORTION,
          id: createEffectId("water-distortion", lyricTextId, effectIndex + effectIndexOffset),
          ...base,
        });
        return effects;
      }

      default:
        return effects;
    }
  }, []);

  return normalizedEffects.length > 0 ? normalizedEffects : undefined;
}

export function parseAIStartingPointDraft(content: string): AIStartingPointDraft {
  const parsed = parseJSONObjectCandidate(content);
  const parsedRecord = parsed as unknown as Record<string, unknown>;
  const segmentCandidates = getDraftArrayCandidate(parsedRecord, "segments");
  const elementCandidates = getDraftArrayCandidate(parsedRecord, "elements");

  const segments = Array.isArray(segmentCandidates)
    ? segmentCandidates
        .map((segment) => {
          const segmentRecord = isRecord(segment) ? segment : {};

          return {
            text: sanitizeSegmentText(String(segmentRecord.text ?? "")),
            start: Number(segmentRecord.start),
            end: Number(segmentRecord.end),
            style: normalizeDraftStyle(segmentRecord.style),
            effects: Array.isArray(segmentRecord.effects)
            ? segmentRecord.effects
                .filter((effect): effect is AIStartingPointDraftEffect => {
                  return isRecord(effect) && typeof effect.type === "string";
                })
                .map((effect) => ({
                  type: effect.type as TextEffect["type"],
                  settings: isRecord(effect.settings) ? effect.settings : undefined,
                }))
            : undefined,
            section:
              typeof segmentRecord.section === "string" && segmentRecord.section.trim().length > 0
                ? segmentRecord.section.trim()
              : undefined,
          };
        })
        .filter(
          (segment) =>
            segment.text.length > 0 &&
            Number.isFinite(segment.start) &&
            Number.isFinite(segment.end)
        )
    : [];

  const elements = Array.isArray(elementCandidates)
    ? elementCandidates.reduce<AIStartingPointDraftElement[]>((validElements, element) => {
        const elementRecord = isRecord(element) ? element : {};
        const type = normalizeDraftElementType(elementRecord.type);
        const start = Number(elementRecord.start);
        const end = Number(elementRecord.end);
        const settings = isRecord(elementRecord.settings) ? elementRecord.settings : undefined;
        const hasTiming = Number.isFinite(start) && Number.isFinite(end);

        if (type === undefined || (!hasTiming && settings === undefined)) {
          return validElements;
        }

        validElements.push({
          type,
          start: hasTiming ? start : undefined,
          end: hasTiming ? end : undefined,
          settings,
        });

        return validElements;
      }, [])
    : undefined;

  const textUpdateCandidates = getDraftArrayCandidate(parsedRecord, "textUpdates");
  const textUpdates = Array.isArray(textUpdateCandidates)
    ? textUpdateCandidates.reduce<AIStartingPointDraftTextUpdate[]>((validUpdates, update) => {
        const updateRecord = isRecord(update) ? update : {};
        const selectorRecord = isRecord(updateRecord.selector) ? updateRecord.selector : undefined;
        const selectorText = sanitizeSegmentText(getOptionalString(selectorRecord?.text) ?? "");

        if (selectorText.length === 0) {
          return validUpdates;
        }

        const occurrence = getOptionalNumber(selectorRecord?.occurrence);
        const approximateStart = getOptionalNumber(selectorRecord?.approximateStart);
        const effectMode = updateRecord.effectMode === "append" ? "append" : "replace";

        validUpdates.push({
          selector: {
            text: selectorText,
            occurrence:
              occurrence !== undefined ? Math.max(1, Math.round(occurrence)) : undefined,
            approximateStart,
          },
          style: normalizeDraftStyle(updateRecord.style),
          effects: Array.isArray(updateRecord.effects)
            ? updateRecord.effects
                .filter((effect): effect is AIStartingPointDraftEffect => {
                  return isRecord(effect) && typeof effect.type === "string";
                })
                .map((effect) => ({
                  type: effect.type as TextEffect["type"],
                  settings: isRecord(effect.settings) ? effect.settings : undefined,
                }))
            : undefined,
          effectMode,
        });

        return validUpdates;
      }, [])
    : undefined;

  if (segments.length === 0 && (!elements || elements.length === 0) && (!textUpdates || textUpdates.length === 0)) {
    throw new Error("AI response did not include any valid lyric segments, text updates, or elements");
  }

  return {
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : undefined,
    globalStyle: normalizeDraftStyle(parsed.globalStyle),
    segments,
    textUpdates: textUpdates && textUpdates.length > 0 ? textUpdates : undefined,
    elements: elements && elements.length > 0 ? elements : undefined,
  };
}

export function applyTextUpdatesFromStartingPointDraft({
  draft,
  lyricTexts,
}: {
  draft: AIStartingPointDraft;
  lyricTexts: LyricText[];
}) {
  if (!draft.textUpdates || draft.textUpdates.length === 0) {
    return { items: lyricTexts, updatedCount: 0 };
  }

  const nextItems = [...lyricTexts];
  let updatedCount = 0;

  draft.textUpdates.forEach((textUpdate) => {
    const matchingIndexes = nextItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => isTextItem(item))
      .filter(({ item }) => sanitizeSegmentText(item.text) === textUpdate.selector.text)
      .sort((left, right) => {
        if (left.item.start !== right.item.start) {
          return left.item.start - right.item.start;
        }

        if (left.item.end !== right.item.end) {
          return left.item.end - right.item.end;
        }

        return left.item.id - right.item.id;
      });

    let targetIndexes = matchingIndexes;

    if (textUpdate.selector.approximateStart !== undefined && matchingIndexes.length > 1) {
      const nearest = [...matchingIndexes].sort(
        (left, right) =>
          Math.abs(left.item.start - textUpdate.selector.approximateStart!) -
          Math.abs(right.item.start - textUpdate.selector.approximateStart!)
      )[0];
      targetIndexes = nearest ? [nearest] : [];
    }

    if (textUpdate.selector.occurrence !== undefined) {
      const selected = matchingIndexes[textUpdate.selector.occurrence - 1];
      targetIndexes = selected ? [selected] : [];
    }

    targetIndexes.forEach(({ index, item }) => {
      let nextItem = applyDraftStyleToLyricText(item, textUpdate.style);

      if (textUpdate.effects) {
        const normalizedEffects = normalizeDraftEffects(
          textUpdate.effects,
          item.id,
          textUpdate.effectMode === "append" ? item.textEffects?.length ?? 0 : 0
        );

        if (normalizedEffects) {
          nextItem = {
            ...nextItem,
            textEffects:
              textUpdate.effectMode === "append"
                ? [...(item.textEffects ?? []), ...normalizedEffects]
                : normalizedEffects,
          };
        }
      }

      nextItems[index] = nextItem;
      updatedCount += 1;
    });
  });

  return { items: nextItems, updatedCount };
}

function buildElementItemBase({
  type,
  start,
  end,
  occupiedTimelineItems,
}: {
  type: ElementType;
  start: number;
  end: number;
  occupiedTimelineItems: LyricText[];
}): LyricText {
  const item: LyricText = {
    id: generateLyricTextId(),
    start,
    end,
    text: "",
    textX: 0.5,
    textY: 0.5,
    textBoxTimelineLevel: 1,
    fontName: "Inter Variable",
    fontWeight: 400,
    renderEnabled: true,
    itemOpacity: 1,
    elementType: type,
    isVisualizer: type === "visualizer",
    isParticle: type === "particle",
    isLight: type === "light",
  };

  item.textBoxTimelineLevel = getFirstNonOverlappingTimelineLevel({
    movingLyricText: item,
    lyricTexts: occupiedTimelineItems,
    preferredLevel: 1,
  });

  return item;
}

function updateExistingElementItem({
  existingItem,
  draftElement,
  durationSeconds,
}: {
  existingItem: LyricText;
  draftElement: AIStartingPointDraftElement;
  durationSeconds: number;
}) {
  const nextItem: LyricText = { ...existingItem };

  if (
    draftElement.start !== undefined &&
    draftElement.end !== undefined &&
    Number.isFinite(draftElement.start) &&
    Number.isFinite(draftElement.end)
  ) {
    const nextStart = clamp(draftElement.start, 0, durationSeconds);
    let nextEnd = clamp(draftElement.end, 0, durationSeconds);

    if (nextEnd - nextStart < MIN_SEGMENT_DURATION_SECONDS) {
      nextEnd = Math.min(durationSeconds, nextStart + MIN_SEGMENT_DURATION_SECONDS);
    }

    if (nextEnd > nextStart) {
      nextItem.start = nextStart;
      nextItem.end = nextEnd;
    }
  }

  if (draftElement.type === "visualizer" && draftElement.settings) {
    nextItem.visualizerSettings = normalizeVisualizerSetting({
      ...existingItem.visualizerSettings,
      ...draftElement.settings,
    });
  }

  if (draftElement.type === "particle" && draftElement.settings) {
    nextItem.particleSettings = normalizeParticleSettings({
      ...existingItem.particleSettings,
      ...draftElement.settings,
    });
  }

  if (draftElement.type === "light" && draftElement.settings) {
    nextItem.lightSettings = normalizeLightSettings({
      ...existingItem.lightSettings,
      ...draftElement.settings,
    });
  }

  return nextItem;
}

export async function applyElementDraftsToTimeline({
  draft,
  durationSeconds,
  existingItems = [],
  albumArtSrc,
  allowedElementTypes,
  mode,
}: {
  draft: AIStartingPointDraft;
  durationSeconds: number;
  existingItems?: LyricText[];
  albumArtSrc?: string;
  allowedElementTypes?: ElementType[];
  mode: "replace" | "update";
}) {
  if (!draft.elements || draft.elements.length === 0) {
    return { items: existingItems, createdCount: 0, updatedCount: 0 };
  }

  const allowedElementTypeSet = new Set(allowedElementTypes ?? []);

  if (allowedElementTypeSet.size === 0) {
    return { items: existingItems, createdCount: 0, updatedCount: 0 };
  }

  const nextItems = [...existingItems];
  const existingElementIndexes = new Map<ElementType, number>();
  nextItems.forEach((item, index) => {
    if (item.elementType) {
      existingElementIndexes.set(item.elementType, index);
    }
  });
  const addedElementTypes = new Set<ElementType>();
  const occupiedTimelineItems = [...nextItems];
  let createdCount = 0;
  let updatedCount = 0;

  for (const element of draft.elements) {
    if (!allowedElementTypeSet.has(element.type)) {
      continue;
    }

    const existingElementIndex = existingElementIndexes.get(element.type);
    if (existingElementIndex !== undefined && mode === "update") {
      nextItems[existingElementIndex] = updateExistingElementItem({
        existingItem: nextItems[existingElementIndex],
        draftElement: element,
        durationSeconds,
      });
      occupiedTimelineItems[existingElementIndex] = nextItems[existingElementIndex];
      updatedCount += 1;
      continue;
    }

    if (existingElementIndex !== undefined || addedElementTypes.has(element.type)) {
      continue;
    }

    if (element.start === undefined || element.end === undefined) {
      continue;
    }

    const start = clamp(element.start, 0, durationSeconds);
    let end = clamp(element.end, 0, durationSeconds);

    if (end - start < MIN_SEGMENT_DURATION_SECONDS) {
      end = Math.min(durationSeconds, start + MIN_SEGMENT_DURATION_SECONDS);
    }

    if (end <= start) {
      continue;
    }

    const nextItem = buildElementItemBase({
      type: element.type,
      start,
      end,
      occupiedTimelineItems,
    });

    if (element.type === "visualizer") {
      const defaultSettings = await buildDefaultVisualizerSetting(albumArtSrc);
      nextItem.visualizerSettings = normalizeVisualizerSetting({
        ...defaultSettings,
        ...(element.settings as Record<string, unknown> | undefined),
      });
    }

    if (element.type === "particle") {
      nextItem.particleSettings = normalizeParticleSettings(
        element.settings as Record<string, unknown> | undefined
      );
    }

    if (element.type === "light") {
      nextItem.lightSettings = normalizeLightSettings(
        element.settings as Record<string, unknown> | undefined
      );
    }

    occupiedTimelineItems.push(nextItem);
    nextItems.push(nextItem);
    addedElementTypes.add(element.type);
    createdCount += 1;
  }

  return { items: nextItems, createdCount, updatedCount };
}

export function buildLyricTextsFromStartingPointDraft({
  draft,
  durationSeconds,
  occupiedTimelineItems = [],
  previewSize,
}: {
  draft: AIStartingPointDraft;
  durationSeconds: number;
  occupiedTimelineItems?: LyricText[];
  previewSize?: { width: number; height: number };
}) {
  const sortedSegments = [...draft.segments].sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    if (left.end !== right.end) {
      return left.end - right.end;
    }

    return left.text.localeCompare(right.text);
  });

  const placedItems = [...occupiedTimelineItems];
  const builtItems: LyricText[] = [];
  let previousEnd = 0;

  sortedSegments.forEach((segment, index) => {
    let start = clamp(segment.start, 0, durationSeconds);
    let end = clamp(segment.end, 0, durationSeconds);

    start = Math.max(start, previousEnd);

    const nextSegment = sortedSegments[index + 1];
    if (nextSegment) {
      const nextStart = clamp(nextSegment.start, 0, durationSeconds);
      if (nextStart > start) {
        end = Math.min(end, nextStart);
      }
    }

    if (end - start < MIN_SEGMENT_DURATION_SECONDS) {
      end = Math.min(durationSeconds, start + MIN_SEGMENT_DURATION_SECONDS);
    }

    if (end <= start) {
      return;
    }

    const nextLyricItemId = generateLyricTextId() + index;
    const mergedStyle = mergeDraftStyles(draft.globalStyle, segment.style);
    const nextLyricItem: LyricText = {
      id: nextLyricItemId,
      start,
      end,
      text: segment.text,
      textX: 0.5,
      textY: 0.5,
      textBoxTimelineLevel: 1,
      fontName: mergedStyle?.fontName ?? "Inter Variable",
      fontSize: mergedStyle?.fontSize,
      fontWeight: mergedStyle?.fontWeight ?? 400,
      fontColor: mergedStyle?.fontColor,
      textFillOpacity: mergedStyle?.textFillOpacity,
      letterSpacing: mergedStyle?.letterSpacing,
      shadowBlur: mergedStyle?.shadowBlur,
      shadowColor: mergedStyle?.shadowColor,
      textGlowBlur: mergedStyle?.textGlowBlur,
      textGlowColor: mergedStyle?.textGlowColor,
      renderEnabled: mergedStyle?.renderEnabled ?? true,
      itemOpacity: mergedStyle?.itemOpacity ?? 1,
      textEffects: normalizeDraftEffects(segment.effects, nextLyricItemId),
    };

    if (mergedStyle?.textX !== undefined) {
      nextLyricItem.textX = mergedStyle.textX;
    }

    if (mergedStyle?.textY !== undefined) {
      nextLyricItem.textY = mergedStyle.textY;
    }

    nextLyricItem.textBoxTimelineLevel = getFirstNonOverlappingTimelineLevel({
      movingLyricText: nextLyricItem,
      lyricTexts: placedItems,
      preferredLevel: 1,
    });

    if (previewSize && mergedStyle?.textX === undefined && mergedStyle?.textY === undefined) {
      const centeredPosition = getCenteredTextPosition({
        lyricText: nextLyricItem,
        previewWidth: previewSize.width,
        previewHeight: previewSize.height,
      });

      nextLyricItem.textX = centeredPosition.textX;
      nextLyricItem.textY = centeredPosition.textY;
    }

    previousEnd = nextLyricItem.end;
    placedItems.push(nextLyricItem);
    builtItems.push(nextLyricItem);
  });

  return builtItems;
}

export function replaceTextItems(
  existingItems: LyricText[],
  replacementTextItems: LyricText[]
) {
  return [
    ...existingItems.filter((item) => !isTextItem(item)),
    ...replacementTextItems,
  ].sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    if (left.end !== right.end) {
      return left.end - right.end;
    }

    return left.id - right.id;
  });
}