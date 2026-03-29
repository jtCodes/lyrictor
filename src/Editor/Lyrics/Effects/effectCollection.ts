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
  const otherEffects = (lyricText.textEffects ?? []).filter(
    (effect) => effect.type !== type
  );

  return {
    ...lyricText,
    textEffects: [...otherEffects, ...effects],
  };
}
