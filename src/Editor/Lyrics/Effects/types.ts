import { AshFadeSettings } from "./AshFade/types";

export const TEXT_EFFECT_TYPE_ASH_FADE = "ashFade" as const;

export interface TextEffectBase<TType extends string = string> {
  id?: string;
  type: TType;
}

export interface AshFadeTextEffect
  extends TextEffectBase<typeof TEXT_EFFECT_TYPE_ASH_FADE>,
    AshFadeSettings {}

export type TextEffect = AshFadeTextEffect;
