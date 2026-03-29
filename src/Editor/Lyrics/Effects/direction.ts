import { TimedEffectSettings } from "./shared";

export interface DirectionalEffectSettings extends TimedEffectSettings {
  animationDirection: number;
}

export const EFFECT_DIRECTION_OPTIONS = [
  { key: "up", label: "Up", degrees: 90 },
  { key: "up-right", label: "Up Right", degrees: 45 },
  { key: "right", label: "Right", degrees: 0 },
  { key: "down-right", label: "Down Right", degrees: 315 },
  { key: "down", label: "Down", degrees: 270 },
  { key: "down-left", label: "Down Left", degrees: 225 },
  { key: "left", label: "Left", degrees: 180 },
  { key: "up-left", label: "Up Left", degrees: 135 },
] as const;

export function normalizeDirectionDegrees(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function getDirectionVector(directionDegrees: number) {
  const radians = (normalizeDirectionDegrees(directionDegrees) * Math.PI) / 180;
  return {
    x: Math.cos(radians),
    y: -Math.sin(radians),
  };
}

export function averageDirectionDegrees(
  settings: Array<Pick<DirectionalEffectSettings, "animationDirection">>,
  fallbackDirection: number
) {
  const directionVector = settings.reduce(
    (sum, currentSettings) => {
      const direction = getDirectionVector(currentSettings.animationDirection);
      return {
        x: sum.x + direction.x,
        y: sum.y + direction.y,
      };
    },
    { x: 0, y: 0 }
  );

  if (directionVector.x === 0 && directionVector.y === 0) {
    return fallbackDirection;
  }

  return normalizeDirectionDegrees(
    (Math.atan2(-directionVector.y, directionVector.x) * 180) / Math.PI
  );
}

export function getNearestDirectionOption(directionDegrees: number) {
  const normalizedDirection = normalizeDirectionDegrees(directionDegrees);

  return EFFECT_DIRECTION_OPTIONS.reduce((closestOption, currentOption) => {
    const rawDistance = Math.abs(currentOption.degrees - normalizedDirection);
    const wrappedDistance = Math.min(rawDistance, 360 - rawDistance);

    if (!closestOption || wrappedDistance < closestOption.distance) {
      return {
        option: currentOption,
        distance: wrappedDistance,
      };
    }

    return closestOption;
  }, undefined as
    | {
        option: (typeof EFFECT_DIRECTION_OPTIONS)[number];
        distance: number;
      }
    | undefined)?.option ?? EFFECT_DIRECTION_OPTIONS[0];
}