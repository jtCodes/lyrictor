import { DirectionalEffectSettings } from "../direction";

export interface WaterDistortionSettings extends DirectionalEffectSettings {
  id?: string;
  amount: number;
  speed: number;
}

export const DEFAULT_WATER_DISTORTION_SETTINGS: WaterDistortionSettings = {
  enabled: false,
  reverse: false,
  amount: 0.24,
  speed: 0.18,
  animationDirection: 90,
  startPercent: 0,
  endPercent: 1,
};