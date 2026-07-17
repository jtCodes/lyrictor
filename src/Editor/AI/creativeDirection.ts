import type { ElementType } from "../types";

export type AIStartingPointIntensity = "subtle" | "balanced" | "expressive";

export interface AIStartingPointMoodPreset {
  id: string;
  label: string;
  direction: string;
  recommendedAddOns: ElementType[];
}

export const AI_STARTING_POINT_INTENSITIES: Array<{
  id: AIStartingPointIntensity;
  label: string;
}> = [
  { id: "subtle", label: "Subtle" },
  { id: "balanced", label: "Balanced" },
  { id: "expressive", label: "Expressive" },
];

export const AI_STARTING_POINT_MOOD_PRESETS: AIStartingPointMoodPreset[] = [
  {
    id: "cinematic",
    label: "Cinematic",
    direction:
      "Restrained and cinematic. Use spacious compositions and deliberate movement in the verses, then introduce larger typography and stronger contrast for recurring hooks. Keep a cohesive, dramatic palette and reserve the strongest visual moments for emotional peaks.",
    recommendedAddOns: ["light", "grain"],
  },
  {
    id: "dreamy",
    label: "Dreamy",
    direction:
      "Dreamy, weightless, and nostalgic. Use airy typography, soft luminous color, gentle spatial drift, blur, and fluid motion. Let repeated lyrics return as a recognizable visual motif while choruses feel wider and more immersive.",
    recommendedAddOns: ["visualizer", "particle"],
  },
  {
    id: "intimate",
    label: "Intimate",
    direction:
      "Intimate and emotionally direct. Keep the composition minimal and lyric-led, with restrained type, generous negative space, subtle movement, and carefully placed emphasis on vulnerable phrases. Build intensity through scale and placement rather than constant effects.",
    recommendedAddOns: ["light", "grain"],
  },
  {
    id: "high-energy",
    label: "High Energy",
    direction:
      "Bold, kinetic, and high energy. Use assertive typography, punchy scale and position changes, directional movement, and selective glitch accents. Give the main hook a repeatable signature treatment and create clear visual escalation into major sections.",
    recommendedAddOns: ["visualizer", "particle"],
  },
  {
    id: "dark-moody",
    label: "Dark & Moody",
    direction:
      "Dark, atmospheric, and tense. Use a shadow-rich limited palette, controlled glow, off-center composition, slow directional movement, and text that emerges from blur or ash. Increase contrast and instability around the most emotionally charged lines.",
    recommendedAddOns: ["light", "grain"],
  },
  {
    id: "bright-playful",
    label: "Bright & Playful",
    direction:
      "Bright, playful, and confident. Use vivid coordinated colors, buoyant movement, varied but intentional placement, and bold typography. Make recurring hooks feel instantly recognizable while keeping verses lighter and rhythmically varied.",
    recommendedAddOns: ["visualizer", "particle"],
  },
];

export const AI_STARTING_POINT_INTENSITY_GUIDANCE: Record<
  AIStartingPointIntensity,
  string
> = {
  subtle:
    "Use restrained variation: one primary visual motif, gentle position and scale changes, and effects on only a few meaningful lines.",
  balanced:
    "Use clear section contrast and purposeful variation while preserving a coherent palette, typography system, and recurring hook motif.",
  expressive:
    "Push the editor deliberately: use bolder scale and placement changes, more pronounced section contrast, layered compatible effects, and stronger visual peaks without becoming random.",
};
