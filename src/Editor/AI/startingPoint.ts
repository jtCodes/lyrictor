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
import { isTextItem } from "../utils";
import { LyricText } from "../types";
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

function getOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
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

function createEffectId(prefix: string, lyricTextId: number, effectIndex: number) {
  return `${prefix}-${lyricTextId}-${effectIndex}`;
}

function normalizeDraftEffects(
  draftEffects: unknown,
  lyricTextId: number
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
          id: createEffectId("ash-fade", lyricTextId, effectIndex),
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
          id: createEffectId("blur", lyricTextId, effectIndex),
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
          id: createEffectId("directional-fade", lyricTextId, effectIndex),
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
          id: createEffectId("floating", lyricTextId, effectIndex),
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
          id: createEffectId("glitch", lyricTextId, effectIndex),
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
          id: createEffectId("water-distortion", lyricTextId, effectIndex),
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
  const segments = Array.isArray(parsed.segments)
    ? parsed.segments
        .map((segment) => ({
          ...segment,
          text: sanitizeSegmentText(String(segment?.text ?? "")),
          start: Number(segment?.start),
          end: Number(segment?.end),
          style: normalizeDraftStyle(segment?.style),
          effects: Array.isArray(segment?.effects)
            ? segment.effects
                .filter((effect): effect is AIStartingPointDraftEffect => {
                  return isRecord(effect) && typeof effect.type === "string";
                })
                .map((effect) => ({
                  type: effect.type as TextEffect["type"],
                  settings: isRecord(effect.settings) ? effect.settings : undefined,
                }))
            : undefined,
          section:
            typeof segment?.section === "string" && segment.section.trim().length > 0
              ? segment.section.trim()
              : undefined,
        }))
        .filter(
          (segment) =>
            segment.text.length > 0 &&
            Number.isFinite(segment.start) &&
            Number.isFinite(segment.end)
        )
    : [];

  if (segments.length === 0) {
    throw new Error("AI response did not include any valid lyric segments");
  }

  return {
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : undefined,
      globalStyle: normalizeDraftStyle(parsed.globalStyle),
    segments,
  };
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