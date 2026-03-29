import { DirectionalEffectSettings } from "../direction";

export interface GlitchSettings extends DirectionalEffectSettings {
  id?: string;
  intensity: number;
  splitAmount: number;
  jitterAmount: number;
  flickerAmount: number;
  flickerSpeed: number;
}

export const DEFAULT_GLITCH_SETTINGS: GlitchSettings = {
  enabled: false,
  reverse: false,
  intensity: 0.55,
  splitAmount: 0.45,
  jitterAmount: 0.3,
  flickerAmount: 0.35,
  flickerSpeed: 0.5,
  animationDirection: 0,
  startPercent: 0,
  endPercent: 1,
};