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
          textEffects: item.textEffects?.map((effect) => effect.type),
          style:
            item.elementType || item.isImage
              ? undefined
              : {
                  fontName: item.fontName,
                  fontSize: item.fontSize,
                  fontWeight: item.fontWeight,
                  textX: item.textX,
                  textY: item.textY,
                },
          settings:
            item.elementType === "visualizer"
              ? item.visualizerSettings
              : item.elementType === "particle"
                ? item.particleSettings
                : item.elementType === "light"
                  ? item.lightSettings
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
}: {
  direction: string;
  durationSeconds: number;
  project?: ProjectDetail;
  source: StartingPointSource;
  allowedElementTypes: ElementType[];
  applyMode: AIStartingPointApplyMode;
  currentTimelineItems: LyricText[];
}) {
  const enabledAddOnsLabel =
    allowedElementTypes.length > 0 ? allowedElementTypes.join(", ") : "none";
  const instructions = [
    "Create a lyric-video starting-point timeline draft.",
    "Return JSON only.",
    "Use only exact lyric text from the provided source.",
    "Do not invent, rewrite, paraphrase, reorder, or censor lyrics.",
    "You may combine adjacent source lines into a single segment by joining them with newline characters.",
    "Use globalStyle and per-segment style when the user's request implies text styling, font sizing, emphasis, or visual hierarchy.",
    "Use only text style keys that exist in the capability context.",
    "Preserve source order.",
    "Create phrase-level segments suitable for an initial lyric-video draft, not word-by-word timing.",
    "Segments must be chronological and non-overlapping.",
    `Every start/end value must be a number in seconds within 0 and ${durationSeconds.toFixed(3)}.`,
    "Each segment must have end greater than start.",
    "Prefer a useful starting point over dense micro-timing.",
    "When the user's direction implies mood, motion, or energy, attach supported text effects where useful.",
    "Only use text effect types and setting names that exist in the capability context.",
    "Not every segment needs effects; add them only when they clearly support the requested direction.",
    "If the source includes timestamps, use them as anchors when grouping segments.",
    "If a timeline offset is provided, the timed lyric payload has already been shifted so 0 seconds is the current project timeline start.",
    applyMode === "replace"
      ? "Apply mode is replace. Plan a fresh text timeline draft for this project."
      : "Apply mode is update. The existing timeline will stay in place, so focus on modifying what is already in the current timeline instead of rebuilding anything.",
    "This endpoint only accepts summary, globalStyle, segments, and optional elements.",
    "In update mode, you may also return textUpdates to patch existing lyric items by exact text.",
    "Do not return operations, patches, update instructions, ids, comments, or any wrapper format unless the wrapper still contains those exact keys.",
    "Do not reference or target existing timeline items by id.",
    applyMode === "update"
      ? "In update mode, the current timeline payload is the source of truth. Do not restore deleted lyrics, do not re-add missing source lines, and do not return standalone segments unless the user explicitly asks to add brand new lyric items. Prefer textUpdates for lyric changes and settings-only element updates for existing elements."
      : "In replace mode, segments should describe the main lyric timeline draft for the project.",
    allowedElementTypes.length > 0
      ? `Optional add-ons enabled for this run: ${enabledAddOnsLabel}.`
      : "No optional add-ons are enabled for this run. Do not add any elements.",
    "Only use enabled element types and only use element setting keys that exist in the capability context.",
    'Return this exact shape: {"summary":"short sentence","globalStyle":{"fontSize":32,"fontWeight":600},"segments":[{"section":"Verse 1","text":"first line\\nsecond line","start":12.3,"end":18.6,"style":{"fontSize":40},"effects":[{"type":"glitch","settings":{"intensity":0.7,"startPercent":0,"endPercent":1}}]}],"textUpdates":[{"selector":{"text":"some lyric line","occurrence":1},"effects":[{"type":"floating","settings":{"distance":0.12}}],"effectMode":"replace"}],"elements":[{"type":"visualizer","start":0,"end":42.5,"settings":{"blur":0.12}}, {"type":"light","settings":{"fields":[{"motionAmount":0.35}]}}]}',
  ];

  const metadata = [
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
    `User direction: ${direction.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    instructions.join("\n"),
    metadata,
    "Current editor capability context:",
    serializeAIEditorCapabilityContext(),
    "Current timeline payload:",
    buildCurrentTimelinePayload(currentTimelineItems),
    ...(applyMode === "replace"
      ? ["Lyric source payload:", buildSourcePayload(source)]
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
  }: {
    direction: string;
    durationSeconds: number;
    project?: ProjectDetail;
    source: StartingPointSource;
    model?: string;
    allowedElementTypes: ElementType[];
    applyMode: AIStartingPointApplyMode;
    currentTimelineItems: LyricText[];
  }): Promise<AIStartingPointDraft> {
    if (!apiKey) {
      throw new Error("Sign in with OpenRouter before generating a starting point");
    }

    setIsLoading(true);
    setError(null);
  setLastUsage(null);

    try {
      const messages: OpenRouterMessage[] = [
        {
          role: "system",
          content:
            "You generate structured JSON drafts for a lyric video editor. Return JSON only and follow the user's constraints exactly.",
        },
        {
          role: "user",
          content: buildPrompt({
            direction,
            durationSeconds,
            project,
            source,
            allowedElementTypes,
            applyMode,
            currentTimelineItems,
          }),
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