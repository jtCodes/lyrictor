import { TimedEffectSettings } from "../shared";

export interface BlurSettings extends TimedEffectSettings {
  id?: string;
  amount: number;
}

export const DEFAULT_BLUR_SETTINGS: BlurSettings = {
  enabled: false,
  reverse: false,
  amount: 0.65,
  startPercent: 0,
  endPercent: 1,
};