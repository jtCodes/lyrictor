import { RGBColor } from "react-color";
import { TextCustomizationSettingType } from "./AudioTimeline/Tools/types";
import { AshFadeSettings } from "./Lyrics/Effects/AshFade/types";
import { TextEffect } from "./Lyrics/Effects/types";
import { GrainSettings } from "./Grain/store";
import { LightSettings } from "./Light/store";
import { ParticleSettings } from "./Particles/store";
import { VisualizerSetting } from "./Visualizer/store";

export const DEFAULT_TEXT_PREVIEW_WIDTH: number = 150;
export const DEFAULT_TEXT_PREVIEW_HEIGHT: number = 100;
export const DEFAULT_TEXT_PREVIEW_FONT_SIZE: number = 20;
export const MAX_TEXT_PREVIEW_FONT_SIZE: number = 800;
export const DEFAULT_TEXT_PREVIEW_FONT_COLOR: string = "white";
export const DEFAULT_TEXT_PREVIEW_FONT_NAME: string = "Inter Variable";
export const DEFAULT_TEXT_PREVIEW_FONT_WEIGHT: number = 400;

export type ElementType = "visualizer" | "particle" | "light" | "grain";
export type ImageDanceMode = "line" | "wiper";

export interface LyricText {
  id: number;
  start: number; // time this lyric begin
  end: number;
  text: string;
  textY: number;
  textX: number;
  textBoxTimelineLevel: number;
  width?: number;
  height?: number;
  [TextCustomizationSettingType.fontName]?: string;
  [TextCustomizationSettingType.fontSize]?: number;
  [TextCustomizationSettingType.fontColor]?: RGBColor;
  [TextCustomizationSettingType.textFillOpacity]?: number;
  [TextCustomizationSettingType.fontWeight]?: number;
  [TextCustomizationSettingType.letterSpacing]?: number;
  [TextCustomizationSettingType.shadowBlur]?: number;
  [TextCustomizationSettingType.shadowColor]?: RGBColor;
  [TextCustomizationSettingType.textGlowBlur]?: number;
  [TextCustomizationSettingType.textGlowColor]?: RGBColor;
  [TextCustomizationSettingType.ashFadeSettings]?: AshFadeSettings;
  textEffects?: TextEffect[];
  ashFadeSettings?: AshFadeSettings;
  ashFadeEffects?: AshFadeSettings[];
  isImage?: boolean;
  isVisualizer?: boolean;
  isParticle?: boolean;
  isLight?: boolean;
  isGrain?: boolean;
  elementType?: ElementType;
  renderEnabled?: boolean;
  itemOpacity?: number;
  imageUrl?: string;
  imageScale?: number;
  imageRotation?: number;
  imageOpacity?: number;
  imageEdgeFeather?: number;
  imageDanceAmount?: number;
  imageDanceSpeed?: number;
  imageDanceDirection?: number;
  imageDanceMode?: ImageDanceMode;
  imageDanceVectorX?: number;
  imageDanceVectorY?: number;
  visualizerSettings?: VisualizerSetting;
  particleSettings?: ParticleSettings;
  lightSettings?: LightSettings;
  grainSettings?: GrainSettings;
}

export enum ScrollDirection {
  vertical = "vertical",
  horizontal = "horizontal",
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface TimelineLoopRange {
  start: number;
  end: number;
}

export type TimelineTool = "default" | "cut";

export interface TimelineInteractionState {
  width: number;
  layerX: number;
  cursorX: number;
  // points: number[]
}
