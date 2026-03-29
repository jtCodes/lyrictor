import { DirectionalEffectSettings } from "../direction";

export interface AshFadeSettings extends DirectionalEffectSettings {
  id?: string;
  intensity: number;
  textFade: number;
  sparkleAmount: number;
  particleSharpness: number;
  animationDirection: number;
  wind: number;
}

export const DEFAULT_ASH_FADE_SETTINGS: AshFadeSettings = {
  enabled: false,
  reverse: false,
  intensity: 0.55,
  textFade: 1,
  sparkleAmount: 1,
  particleSharpness: 0.6,
  animationDirection: 315,
  wind: 0.35,
  startPercent: 0,
  endPercent: 1,
};