import { AshFadeSettings } from "./AshFade/types";
import { BlurSettings } from "./Blur/types";
import { FloatingSettings } from "./Floating/types";
import { GlitchSettings } from "./Glitch/types";

export const TEXT_EFFECT_TYPE_ASH_FADE = "ashFade" as const;
export const TEXT_EFFECT_TYPE_BLUR = "blur" as const;
export const TEXT_EFFECT_TYPE_FLOATING = "floating" as const;
export const TEXT_EFFECT_TYPE_GLITCH = "glitch" as const;

export interface TextEffectBase<TType extends string = string> {
  id?: string;
  type: TType;
}

export interface AshFadeTextEffect
  extends TextEffectBase<typeof TEXT_EFFECT_TYPE_ASH_FADE>,
    AshFadeSettings {}

export interface GlitchTextEffect
  extends TextEffectBase<typeof TEXT_EFFECT_TYPE_GLITCH>,
    GlitchSettings {}

export interface BlurTextEffect
  extends TextEffectBase<typeof TEXT_EFFECT_TYPE_BLUR>,
    BlurSettings {}

export interface FloatingTextEffect
  extends TextEffectBase<typeof TEXT_EFFECT_TYPE_FLOATING>,
    FloatingSettings {}

export type TextEffect =
  | AshFadeTextEffect
  | BlurTextEffect
  | FloatingTextEffect
  | GlitchTextEffect;
