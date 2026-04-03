import { DirectionalEffectSettings } from "../direction";

export const DIRECTIONAL_FADE_EASING_LINEAR = "linear" as const;
export const DIRECTIONAL_FADE_EASING_EASE_OUT = "easeOut" as const;

export type DirectionalFadeEasing =
  | typeof DIRECTIONAL_FADE_EASING_LINEAR
  | typeof DIRECTIONAL_FADE_EASING_EASE_OUT;

export interface DirectionalFadeSettings extends DirectionalEffectSettings {
  id?: string;
  amount: number;
  softness: number;
  alphaFade: number;
  easing: DirectionalFadeEasing;
  speed: number;
}

export const DEFAULT_DIRECTIONAL_FADE_SETTINGS: DirectionalFadeSettings = {
  enabled: false,
  reverse: false,
  amount: 0.85,
  softness: 0.24,
  alphaFade: 0,
  easing: DIRECTIONAL_FADE_EASING_EASE_OUT,
  speed: 0,
  animationDirection: 315,
  startPercent: 0,
  endPercent: 1,
};