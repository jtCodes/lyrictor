export interface AshFadeSettings {
  id?: string;
  enabled: boolean;
  intensity: number;
  wind: number;
  startOffset: number;
  endOffset: number;
}

export const DEFAULT_ASH_FADE_SETTINGS: AshFadeSettings = {
  enabled: false,
  intensity: 0.55,
  wind: 0.35,
  startOffset: 0,
  endOffset: 0,
};