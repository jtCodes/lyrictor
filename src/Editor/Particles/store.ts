import { RGBColor } from "react-color";
import { getDirectionVector } from "../Lyrics/Effects/direction";

export type ParticleAnimationMode = "sparkle" | "pulse" | "flicker" | "steady";

export interface ParticleSettings {
  count: number;
  size: number;
  speed: number;
  sparkleSpeed: number;
  animationMode: ParticleAnimationMode;
  opacity: number;
  direction: number;
  travelVectorX: number;
  travelVectorY: number;
  spread: number;
  color: RGBColor;
  beatReactiveIntensity: number;
}

export const DEFAULT_PARTICLE_SETTINGS: ParticleSettings = {
  count: 32,
  size: 0.012,
  speed: 0.26,
  sparkleSpeed: 0.35,
  animationMode: "sparkle",
  opacity: 0.55,
  direction: 90,
  travelVectorX: 0,
  travelVectorY: -1,
  spread: 0.45,
  color: { r: 255, g: 244, b: 214, a: 1 },
  beatReactiveIntensity: 0,
};

function normalizeTravelVector(
  x: number,
  y: number
): { travelVectorX: number; travelVectorY: number } {
  const magnitude = Math.sqrt(x * x + y * y);

  if (magnitude <= 0.0001) {
    return { travelVectorX: 0, travelVectorY: 0 };
  }

  if (magnitude <= 1) {
    return { travelVectorX: x, travelVectorY: y };
  }

  return {
    travelVectorX: x / magnitude,
    travelVectorY: y / magnitude,
  };
}

export function normalizeParticleSettings(
  settings?: Partial<ParticleSettings>
): ParticleSettings {
  const fallbackVector = getDirectionVector(
    settings?.direction ?? DEFAULT_PARTICLE_SETTINGS.direction
  );
  const normalizedTravelVector = normalizeTravelVector(
    settings?.travelVectorX ?? fallbackVector.x,
    settings?.travelVectorY ?? fallbackVector.y
  );

  const rawAnimationMode = settings?.animationMode as
    | ParticleAnimationMode
    | "breathing"
    | undefined;
  const normalizedAnimationMode =
    rawAnimationMode === "breathing"
      ? "sparkle"
      : rawAnimationMode ?? DEFAULT_PARTICLE_SETTINGS.animationMode;

  return {
    ...DEFAULT_PARTICLE_SETTINGS,
    ...settings,
    animationMode: normalizedAnimationMode,
    ...normalizedTravelVector,
    color: {
      ...DEFAULT_PARTICLE_SETTINGS.color,
      ...settings?.color,
    },
  };
}
