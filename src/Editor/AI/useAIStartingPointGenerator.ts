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
import { serializeAIEditorCapabilityContext } from "./capabilities";

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
}: {
  direction: string;
  durationSeconds: number;
  project?: ProjectDetail;
  source: StartingPointSource;
}) {
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
    'Return this exact shape: {"summary":"short sentence","globalStyle":{"fontSize":32,"fontWeight":600},"segments":[{"section":"Verse 1","text":"first line\\nsecond line","start":12.3,"end":18.6,"style":{"fontSize":40},"effects":[{"type":"glitch","settings":{"intensity":0.7,"startPercent":0,"endPercent":1}}]}]}',
  ];

  const metadata = [
    project?.songName ? `Song: ${project.songName}` : undefined,
    project?.artistName ? `Artist: ${project.artistName}` : undefined,
    project?.name ? `Project: ${project.name}` : undefined,
    `Duration seconds: ${durationSeconds.toFixed(3)}`,
    `Lyric source: ${source.label}`,
    `User direction: ${direction.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    instructions.join("\n"),
    metadata,
    "Current editor capability context:",
    serializeAIEditorCapabilityContext(),
    "Lyric source payload:",
    buildSourcePayload(source),
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
  }: {
    direction: string;
    durationSeconds: number;
    project?: ProjectDetail;
    source: StartingPointSource;
    model?: string;
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