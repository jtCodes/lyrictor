import { LyricText } from "../../types";
import { TextEffect } from "./types";

export function getTextEffectsByType<TType extends TextEffect["type"]>(
  lyricText: LyricText,
  type: TType
): Array<Extract<TextEffect, { type: TType }>> {
  return (lyricText.textEffects ?? []).filter(
    (effect): effect is Extract<TextEffect, { type: TType }> => effect.type === type
  );
}

export function replaceTextEffectsByType<TType extends TextEffect["type"]>(
  lyricText: LyricText,
  type: TType,
  effects: Array<Extract<TextEffect, { type: TType }>>
): LyricText {
  const currentEffects = lyricText.textEffects ?? [];
  const firstMatchingIndex = currentEffects.findIndex(
    (effect) => effect.type === type
  );

  const nextEffects =
    firstMatchingIndex === -1
      ? [...currentEffects, ...effects]
      : currentEffects.flatMap((effect, effectIndex) => {
          if (effect.type !== type) {
            return [effect];
          }

          if (effectIndex !== firstMatchingIndex) {
            return [];
          }

          return effects;
        });

  return {
    ...lyricText,
    textEffects: nextEffects,
  };
}
