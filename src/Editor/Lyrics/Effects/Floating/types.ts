import { DirectionalEffectSettings } from "../direction";

export interface FloatingSettings extends DirectionalEffectSettings {
  id?: string;
  distance: number;
  preStartSeconds: number;
  speed: number;
}

export const DEFAULT_FLOATING_SETTINGS: FloatingSettings = {
  enabled: false,
  reverse: false,
  distance: 0.22,
  preStartSeconds: 0,
  speed: 0.4,
  animationDirection: 90,
  startPercent: 0,
  endPercent: 1,
};