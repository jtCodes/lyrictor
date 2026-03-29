import { TimedEffectSettings } from "../shared";

export interface AshFadeSettings extends TimedEffectSettings {
  id?: string;
  intensity: number;
  textFade: number;
  sparkleAmount: number;
  particleSharpness: number;
  wind: number;
}

export const DEFAULT_ASH_FADE_SETTINGS: AshFadeSettings = {
  enabled: false,
  reverse: false,
  intensity: 0.55,
  textFade: 1,
  sparkleAmount: 1,
  particleSharpness: 0.6,
  wind: 0.35,
  startPercent: 0,
  endPercent: 1,
};