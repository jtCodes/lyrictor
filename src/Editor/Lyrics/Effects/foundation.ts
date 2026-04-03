import { LyricText } from "../../types";
import { getTextEffectsByType, replaceTextEffectsByType } from "./effectCollection";
import { TextEffect } from "./types";

type EffectType = TextEffect["type"];
type EffectOfType<TType extends EffectType> = Extract<TextEffect, { type: TType }>;

export interface PreviewAnimationState {
  position: number;
  disableAnimation: boolean;
  animationEnabled: boolean;
}

export interface TextEffectDefinition<
  TType extends EffectType,
  TSettings extends { id?: string },
  TEffect extends EffectOfType<TType> = EffectOfType<TType>,
> {
  type: TType;
  debugName: string;
  getSettingsValue: (settings?: Partial<TSettings> | TEffect) => TSettings;
  buildFallbackEffectId: (lyricTextId: number, effectIndex: number) => string;
  normalizeEffect: (
    settings: Partial<TSettings> | TEffect | undefined,
    lyricTextId: number,
    effectIndex: number
  ) => TEffect;
}

export function defineTextEffect<
  TType extends EffectType,
  TSettings extends { id?: string },
  TEffect extends EffectOfType<TType> = EffectOfType<TType>,
>(definition: TextEffectDefinition<TType, TSettings, TEffect>) {
  return definition;
}

export function createEffectId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000000)}`;
}

export function getTargetLyricTextIds(
  selectedLyricText?: LyricText,
  selectedLyricTextIds?: number[]
) {
  if (selectedLyricText) {
    return [selectedLyricText.id];
  }

  if (selectedLyricTextIds && selectedLyricTextIds.length > 0) {
    return selectedLyricTextIds;
  }

  return undefined;
}

export function getEffectSettingsFromLyricText<
  TType extends EffectType,
  TSettings extends { id?: string },
  TEffect extends EffectOfType<TType> = EffectOfType<TType>,
>(
  definition: TextEffectDefinition<TType, TSettings, TEffect>,
  lyricText: LyricText
) {
  const genericEffects = getTextEffectsByType(lyricText, definition.type);

  return genericEffects.map((effect, effectIndex) =>
    definition.getSettingsValue(
      definition.normalizeEffect(effect as TEffect, lyricText.id, effectIndex)
    )
  );
}

export function getEffectSettingsAtIndex<
  TType extends EffectType,
  TSettings extends { id?: string },
  TEffect extends EffectOfType<TType> = EffectOfType<TType>,
>(
  definition: TextEffectDefinition<TType, TSettings, TEffect>,
  lyricText: LyricText,
  effectIndex: number
) {
  return (
    getEffectSettingsFromLyricText(definition, lyricText)[effectIndex] ??
    definition.getSettingsValue(undefined)
  );
}

export function setEffectSettingsForLyricText<
  TType extends EffectType,
  TSettings extends { id?: string },
  TEffect extends EffectOfType<TType> = EffectOfType<TType>,
>(
  definition: TextEffectDefinition<TType, TSettings, TEffect>,
  lyricText: LyricText,
  effects: TSettings[]
) {
  const normalizedEffects = effects.map((effect, effectIndex) =>
    definition.normalizeEffect(effect, lyricText.id, effectIndex)
  );

  return replaceTextEffectsByType(lyricText, definition.type, normalizedEffects);
}

export function createPreviewAnimationState(
  position: number,
  disableAnimation: boolean = false
): PreviewAnimationState {
  return {
    position,
    disableAnimation,
    animationEnabled: !disableAnimation,
  };
}

export function resolveAnimatedValue<T>(
  previewAnimation: PreviewAnimationState,
  getAnimatedValue: () => T,
  getStaticValue: () => T
) {
  return previewAnimation.disableAnimation
    ? getStaticValue()
    : getAnimatedValue();
}