import { LyricText } from "../../types";

export interface TimedEffectSettings {
  enabled: boolean;
  reverse: boolean;
  startPercent: number;
  endPercent: number;
}

export interface TimedEffectProgress<TSettings extends TimedEffectSettings> {
  effectDuration: number;
  effectStart: number;
  effectEnd: number;
  settings: TSettings;
  hasStarted: boolean;
  hasEnded: boolean;
  rawProgress: number;
  timelineProgress: number;
}

export const DEFAULT_MIN_EFFECT_DURATION = 0.001;
export const DEFAULT_MIN_EFFECT_PERCENT_SPAN = 0.001;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function getLyricDuration(
  lyricText: LyricText,
  minEffectDuration: number
) {
  return Math.max(minEffectDuration, lyricText.end - lyricText.start);
}

export function constrainTimedEffectRange<TSettings extends TimedEffectSettings>(
  settings: TSettings,
  minPercentSpan: number = DEFAULT_MIN_EFFECT_PERCENT_SPAN
): TSettings {
  const startPercent = clamp(settings.startPercent, 0, 1 - minPercentSpan);
  const endPercent = clamp(settings.endPercent, startPercent + minPercentSpan, 1);

  return {
    ...settings,
    startPercent,
    endPercent,
  };
}

export function getTimedEffectProgress<TSettings extends TimedEffectSettings>(
  lyricText: LyricText,
  position: number,
  settings: TSettings,
  options?: {
    minEffectDuration?: number;
    minPercentSpan?: number;
  }
): TimedEffectProgress<TSettings> {
  const minEffectDuration =
    options?.minEffectDuration ?? DEFAULT_MIN_EFFECT_DURATION;
  const minPercentSpan =
    options?.minPercentSpan ?? DEFAULT_MIN_EFFECT_PERCENT_SPAN;
  const constrainedSettings = constrainTimedEffectRange(settings, minPercentSpan);
  const duration = getLyricDuration(lyricText, minEffectDuration);
  const effectStart = lyricText.start + duration * constrainedSettings.startPercent;
  const effectEnd = Math.max(
    effectStart + minEffectDuration,
    lyricText.start + duration * constrainedSettings.endPercent
  );
  const effectDuration = Math.max(minEffectDuration, effectEnd - effectStart);
  const hasStarted = position >= effectStart;
  const hasEnded = position >= effectEnd;
  const rawProgress = hasStarted
    ? clamp((position - effectStart) / effectDuration, 0, 1)
    : 0;
  const timelineProgress = constrainedSettings.reverse
    ? hasStarted
      ? 1 - rawProgress
      : 0
    : hasEnded
      ? 1
      : rawProgress;

  return {
    effectDuration,
    effectStart,
    effectEnd,
    settings: constrainedSettings,
    hasStarted,
    hasEnded,
    rawProgress,
    timelineProgress,
  };
}