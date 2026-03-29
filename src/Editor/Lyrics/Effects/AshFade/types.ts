export interface AshFadeSettings {
  id?: string;
  enabled: boolean;
  reverse: boolean;
  intensity: number;
  wind: number;
  startPercent: number;
  endPercent: number;
}

export const DEFAULT_ASH_FADE_SETTINGS: AshFadeSettings = {
  enabled: false,
  reverse: false,
  intensity: 0.55,
  wind: 0.35,
  startPercent: 0,
  endPercent: 1,
};