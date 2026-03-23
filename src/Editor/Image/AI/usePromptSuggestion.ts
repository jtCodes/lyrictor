import { useState } from "react";
import { useOpenRouterStore } from "../../../api/openRouterStore";
import {
  createOpenRouterChatCompletion,
  OpenRouterMessage,
} from "../../../api/openRouter";
import { useProjectStore } from "../../../Project/store";

const MODEL = "google/gemini-2.5-flash";

export function usePromptSuggestion() {
  const [isLoading, setIsLoading] = useState(false);
  const apiKey = useOpenRouterStore((state) => state.apiKey);
  const songName = useProjectStore((state) => state.editingProject?.name);
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const albumArtSrc = useProjectStore(
    (state) => state.editingProject?.albumArtSrc
  );

  async function generatePrompt(
    existingPrompt?: string
  ): Promise<string | null> {
    if (!apiKey) return null;

    setIsLoading(true);
    try {
      const lyrics = lyricTexts
        .filter((lt) => lt.text && !lt.isImage && !lt.isVisualizer)
        .sort((a, b) => a.start - b.start)
        .map((lt) => lt.text)
        .join("\n");

      const parts: string[] = [];
      parts.push(
        `Generate atmosphere/mood keywords for a photorealistic lyric video background image. Output ONLY the keywords, nothing else.

The image should look like a real photograph shot on Fujifilm (think Fuji X-T5, classic chrome film simulation). Focus on: lighting, color tones, texture, weather, time of day, film characteristics. Do NOT include objects, subjects, or places — the user will add those.

GOOD examples:
- "dark moody tones, low fog, cold blue shadows, Fujifilm classic chrome, shallow depth of field"
- "warm golden hour, hazy, soft bokeh, desaturated film colors, natural grain"
- "harsh contrast, rain-soaked, night, tungsten light, shot on Fujifilm"
- "overcast, muted earth tones, gritty, photojournalistic, analog film grain"

BAD examples:
- "a barn at night" (that's an object/place, not atmosphere)
- "painting", "illustration", "digital art" (we want photo-real only)
- Any full sentences or descriptions

Keep it under 15 words. Comma-separated keywords only. Always include a film/camera reference.`
      );
      if (songName) parts.push(`Song: "${songName}"`);
      if (lyrics) parts.push(`Lyrics (for emotional tone only):\n${lyrics}`);
      if (existingPrompt)
        parts.push(
          `User already has: "${existingPrompt}" — suggest atmosphere that complements it, don't repeat what's there.`
        );

      const messages: OpenRouterMessage[] = [];

      if (albumArtSrc) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: parts.join("\n\n") },
            {
              type: "image_url",
              image_url: { url: albumArtSrc },
            },
          ],
        });
      } else {
        messages.push({ role: "user", content: parts.join("\n\n") });
      }

      const data = await createOpenRouterChatCompletion({
        apiKey,
        model: MODEL,
        messages,
      });
      const text = data.choices?.[0]?.message?.content;
      return typeof text === "string" ? text.trim() : null;
    } catch (err) {
      console.error("Prompt suggestion error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { generatePrompt, isLoading, isAvailable: !!apiKey };
}
