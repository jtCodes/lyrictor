export interface AshFadeSettings {
  enabled: boolean;
  intensity: number;
  wind: number;
}

export const DEFAULT_ASH_FADE_SETTINGS: AshFadeSettings = {
  enabled: false,
  intensity: 0.55,
  wind: 0.35,
};