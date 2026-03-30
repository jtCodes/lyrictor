import { RGBColor } from "react-color";

export interface ParticleSettings {
  count: number;
  size: number;
  speed: number;
  opacity: number;
  direction: number;
  spread: number;
  color: RGBColor;
  beatReactiveIntensity: number;
}

export const DEFAULT_PARTICLE_SETTINGS: ParticleSettings = {
  count: 32,
  size: 0.012,
  speed: 0.26,
  opacity: 0.55,
  direction: 90,
  spread: 0.45,
  color: { r: 255, g: 244, b: 214, a: 1 },
  beatReactiveIntensity: 0,
};

export function normalizeParticleSettings(
  settings?: Partial<ParticleSettings>
): ParticleSettings {
  return {
    ...DEFAULT_PARTICLE_SETTINGS,
    ...settings,
    color: {
      ...DEFAULT_PARTICLE_SETTINGS.color,
      ...settings?.color,
    },
  };
}
