import { useState } from "react";
import {
  createOpenRouterChatCompletion,
  OpenRouterMessage,
  OpenRouterResponseUsage,
} from "../../api/openRouter";
import { useOpenRouterStore } from "../../api/openRouterStore";
import { ProjectDetail } from "../../Project/types";
import {
  AI_STARTING_POINT_MODEL,
  AIStartingPointDraft,
  parseAIStartingPointDraft,
  StartingPointSource,
} from "./startingPoint";
import { ElementType } from "../types";
import { LyricText } from "../types";
import { serializeAIEditorCapabilityContext } from "./capabilities";
import {
  AI_STARTING_POINT_INTENSITY_GUIDANCE,
  AIStartingPointIntensity,
} from "./creativeDirection";
import {
  extractProminentColors,
  rgbToHex,
} from "../Visualizer/colorExtractor";

export type AIStartingPointApplyMode = "replace" | "update";

function buildCurrentTimelinePayload(items: LyricText[]) {
  const textOccurrenceCounts = new Map<string, number>();

  return JSON.stringify(
    items
      .slice()
      .sort((left, right) => {
        if (left.start !== right.start) {
          return left.start - right.start;
        }

        if (left.end !== right.end) {
          return left.end - right.end;
        }

        return left.id - right.id;
      })
      .map((item) => {
        const normalizedText = item.text?.trim() ?? "";
        const nextOccurrence = normalizedText
          ? (textOccurrenceCounts.get(normalizedText) ?? 0) + 1
          : undefined;

        if (normalizedText && nextOccurrence !== undefined) {
          textOccurrenceCounts.set(normalizedText, nextOccurrence);
        }

        return {
          type: item.elementType ?? (item.isImage ? "image" : "text"),
          start: Number(item.start.toFixed(3)),
          end: Number(item.end.toFixed(3)),
          text: item.text || undefined,
          textOccurrence: nextOccurrence,
          textEffects: item.textEffects?.map(({ id: _id, ...effect }) => effect),
          style:
            item.elementType || item.isImage
              ? undefined
              : {
                  fontName: item.fontName,
                  fontSize: item.fontSize,
                  fontWeight: item.fontWeight,
                  fontColor: item.fontColor,
                  textFillOpacity: item.textFillOpacity,
                  letterSpacing: item.letterSpacing,
                  shadowBlur: item.shadowBlur,
                  shadowColor: item.shadowColor,
                  textGlowBlur: item.textGlowBlur,
                  textGlowColor: item.textGlowColor,
                  textX: item.textX,
                  textY: item.textY,
                  itemOpacity: item.itemOpacity,
                  renderEnabled: item.renderEnabled,
                },
          settings:
            item.elementType === "visualizer"
              ? item.visualizerSettings
              : item.elementType === "particle"
                ? item.particleSettings
                : item.elementType === "light"
                  ? item.lightSettings
                  : item.elementType === "grain"
                    ? item.grainSettings
                    : undefined,
        };
      }),
    null,
    2
  );
}

function buildSourcePayload(source: StartingPointSource) {
  if (source.timedLines && source.timedLines.length > 0) {
    return JSON.stringify(
      source.timedLines.map((line, index) => ({
        index: index + 1,
        time: Number(line.time.toFixed(3)),
        text: line.text,
      })),
      null,
      2
    );
  }

  return JSON.stringify(
    source.lyricsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({ index: index + 1, text: line })),
    null,
    2
  );
}

function buildPrompt({
  direction,
  durationSeconds,
  project,
  source,
  allowedElementTypes,
  applyMode,
  currentTimelineItems,
  albumArtPalette,
  intensity,
}: {
  direction: string;
  durationSeconds: number;
  project?: ProjectDetail;
  source: StartingPointSource;
  allowedElementTypes: ElementType[];
  applyMode: AIStartingPointApplyMode;
  currentTimelineItems: LyricText[];
  albumArtPalette: Array<{ r: number; g: number; b: number }>;
  intensity: AIStartingPointIntensity;
}) {
  const enabledAddOnsLabel =
    allowedElementTypes.length > 0 ? allowedElementTypes.join(", ") : "none";
  const creativeBrief = [
    `User direction: ${direction.trim()}`,
    `Expression intensity: ${intensity}`,
    AI_STARTING_POINT_INTENSITY_GUIDANCE[intensity],
    albumArtPalette.length > 0
      ? `Album-art color swatches (authoritative JSON): ${JSON.stringify(
          albumArtPalette.map((color) => ({
            hex: rgbToHex(color),
            color: { r: color.r, g: color.g, b: color.b, a: 1 },
          }))
        )}. These are discrete exact swatches, not endpoints of a color range. Copy their RGB channel values into generated fontColor, shadowColor, textGlowColor, particle color, light colors, and visualizer color stops. Do not replace them with color names, approximate ranges, or invented intermediate colors; only alpha may be adjusted.`
      : "No album-art palette is supplied; derive a deliberate limited palette from the requested mood and lyrical language.",
  ].join("\n");

  const creativeMandate = [
    "Act as a lyric-video creative director using the real editor controls below, not as a generic subtitle formatter.",
    "Commit to one coherent visual concept. Make specific choices for palette, typography, spatial composition, motion language, and section progression.",
    "Establish a useful globalStyle, then vary per-segment style intentionally to create hierarchy and contrast.",
    "Infer likely sections and emotional peaks from lyric repetition, language, and timestamps. Repeated hooks should return with a recognizable visual motif.",
    "Give verses, transitions, hooks, and climactic lines visibly different roles while keeping the overall design cohesive.",
    "Use position across the frame, scale, weight, letter spacing, color, opacity, shadow, and glow—not font size alone.",
    "Use supported effects as entrance, hold, or exit choreography. Compatible effects may be layered when that strengthens the concept; avoid assigning the same treatment to every line.",
    "Create a visual arc: establish the motif, develop it, reach stronger visual peaks, then resolve it. Do not return a uniform sequence of centered text cards.",
    allowedElementTypes.length > 0
      ? `Enabled visual layers: ${enabledAddOnsLabel}. Use them as cohesive scene layers and tune their full settings to the brief rather than returning defaults.`
      : "No visual layers are enabled, so create the visual arc through typography, placement, color, glow, opacity, and text effects.",
    "The app does not provide beat or loudness analysis. Do not claim beat-perfect choreography; use lyric timing, repetition, and semantic intensity as the available musical signals.",
  ].join("\n");

  const projectContext = [
    project?.songName ? `Song: ${project.songName}` : undefined,
    project?.artistName ? `Artist: ${project.artistName}` : undefined,
    project?.name ? `Project: ${project.name}` : undefined,
    `Duration seconds: ${durationSeconds.toFixed(3)}`,
    source.fullSongDurationSeconds
      ? `Full song duration seconds: ${source.fullSongDurationSeconds.toFixed(3)}`
      : undefined,
    source.timelineOffsetSeconds !== undefined
      ? `Timeline offset seconds: ${source.timelineOffsetSeconds.toFixed(3)}`
      : undefined,
    `Lyric source: ${source.label}`,
    `Apply mode: ${applyMode}`,
    `Enabled add-ons: ${enabledAddOnsLabel}`,
    project?.resolution ? `Canvas aspect ratio: ${project.resolution}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  const outputRules = [
    "Return one valid JSON object and no markdown or commentary.",
    "Accepted top-level keys are summary, globalStyle, segments, textUpdates, and elements.",
    "Use only exact lyric text from the supplied source/current timeline. Never invent, rewrite, paraphrase, reorder, censor, or change capitalization and punctuation.",
    "Adjacent source lines may be combined with newline characters. Preserve source order and cover the available lyric source without duplicating lines.",
    "Use phrase-level segments, not word-by-word timing. Segments must be chronological, non-overlapping, and have end greater than start.",
    `All start/end values must be seconds between 0 and ${durationSeconds.toFixed(3)}.`,
    "Use only style, effect, element, and setting keys present in the enabled capability context.",
    "Colors use {r,g,b,a}, with RGB from 0 to 255 and alpha from 0 to 1. textX/textY use normalized 0 to 1 coordinates.",
    albumArtPalette.length > 0
      ? "Because album-art swatches are supplied, every generated color object must use the exact r/g/b values of one supplied swatch. Gradients must list concrete supplied swatches as their color stops; never describe a color as being between two colors."
      : "Every generated color must be a concrete {r,g,b,a} object, not a color name or descriptive range.",
    "Valid style ranges: fontSize 1-800, textFillOpacity/itemOpacity 0-1, letterSpacing -20 to 80, shadowBlur 0-25, and textGlowBlur 0-120.",
    "The summary must briefly name the chosen palette, typography/motion motif, and visual progression.",
    applyMode === "replace"
      ? "Replace mode: return a fresh lyric timeline in segments. Preserve non-text items already in the current timeline."
      : "Update mode: preserve the current timeline and use textUpdates to restyle exact existing lyrics. Do not restore deleted lyrics or rebuild the lyric timeline. Return segments only when the direction explicitly asks to add new lyric items.",
    applyMode === "update"
      ? "Select repeated text with occurrence or approximateStart. Do not use internal ids. Use effectMode append only when preserving existing effects is intentional."
      : "textUpdates may be omitted in replace mode.",
    allowedElementTypes.length > 0
      ? "Only enabled element types may appear. For newly created elements, include start and end; usually span the relevant scene or full timeline."
      : "Omit elements because no visual layers are enabled.",
    "Omit unused optional keys instead of filling them with generic defaults.",
    "Shape: summary is a string; globalStyle is an optional style object; segments is an array of {section,text,start,end,style,effects}; textUpdates is an optional array of {selector,style,effects,effectMode}; elements is an optional array of {type,start,end,settings}.",
    "Each effect is {type,settings}. Each textUpdates selector is {text,occurrence?,approximateStart?}. Invent project-specific values; do not copy generic example values or return type placeholders.",
  ].join("\n");

  return [
    "CREATIVE BRIEF — highest priority",
    creativeBrief,
    "CREATIVE-DIRECTION MANDATE",
    creativeMandate,
    "PROJECT CONTEXT",
    projectContext,
    "OUTPUT CONTRACT",
    outputRules,
    "ENABLED EDITOR CAPABILITIES",
    serializeAIEditorCapabilityContext({ allowedElementTypes, applyMode }),
    "CURRENT TIMELINE",
    buildCurrentTimelinePayload(currentTimelineItems),
    ...(applyMode === "replace"
      ? ["LYRIC SOURCE", buildSourcePayload(source)]
      : []),
  ].join("\n\n");
}

export function useAIStartingPointGenerator() {
  const apiKey = useOpenRouterStore((state) => state.apiKey);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<OpenRouterResponseUsage | null>(null);

  async function generateStartingPoint({
    direction,
    durationSeconds,
    project,
    source,
    model,
    allowedElementTypes,
    applyMode,
    currentTimelineItems,
    includeAlbumArtPalette,
    intensity,
  }: {
    direction: string;
    durationSeconds: number;
    project?: ProjectDetail;
    source: StartingPointSource;
    model?: string;
    allowedElementTypes: ElementType[];
    applyMode: AIStartingPointApplyMode;
    currentTimelineItems: LyricText[];
    includeAlbumArtPalette: boolean;
    intensity: AIStartingPointIntensity;
  }): Promise<AIStartingPointDraft> {
    if (!apiKey) {
      throw new Error("Sign in with OpenRouter before generating a starting point");
    }

    setIsLoading(true);
    setError(null);
    setLastUsage(null);

    try {
      let albumArtPalette: Array<{ r: number; g: number; b: number }> = [];

      if (includeAlbumArtPalette && project?.albumArtSrc) {
        try {
          albumArtPalette = await extractProminentColors(project.albumArtSrc);
        } catch (paletteError) {
          console.warn("Failed to extract album-art palette for AI direction", paletteError);
        }
      }

      const prompt = buildPrompt({
        direction,
        durationSeconds,
        project,
        source,
        allowedElementTypes,
        applyMode,
        currentTimelineItems,
        albumArtPalette,
        intensity,
      });

      const messages: OpenRouterMessage[] = [
        {
          role: "system",
          content:
            "You are an expert lyric-video creative director and motion-typography designer. Translate a short emotional brief into a cohesive, expressive design using only the supplied editor capabilities. Make bold but intentional visual decisions, preserve lyrics exactly, and return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      const response = await createOpenRouterChatCompletion({
        apiKey,
        model: model ?? AI_STARTING_POINT_MODEL,
        messages,
      });
      setLastUsage(response.usage ?? null);

      const content = response.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim().length === 0) {
        throw new Error("OpenRouter returned an empty response");
      }

      return parseAIStartingPointDraft(content);
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Failed to generate an AI starting point";
      setError(message);
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    error,
    isAvailable: Boolean(apiKey),
    isLoading,
    lastUsage,
    generateStartingPoint,
  };
}
