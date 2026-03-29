import { TimedEffectSettings } from "../shared";

export type BlurFadeMode = "none" | "in" | "out" | "inOut";

export interface BlurSettings extends TimedEffectSettings {
  id?: string;
  amount: number;
  fadeMode: BlurFadeMode;
}

export const DEFAULT_BLUR_SETTINGS: BlurSettings = {
  enabled: false,
  reverse: false,
  amount: 0.65,
  fadeMode: "none",
  startPercent: 0,
  endPercent: 1,
};