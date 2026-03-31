import { RGBColor } from "react-color";
import { TextCustomizationSettingType } from "./AudioTimeline/Tools/types";
import { AshFadeSettings } from "./Lyrics/Effects/AshFade/types";
import { TextEffect } from "./Lyrics/Effects/types";
import { ParticleSettings } from "./Particles/store";
import { VisualizerSetting } from "./Visualizer/store";

export const DEFAULT_TEXT_PREVIEW_WIDTH: number = 150;
export const DEFAULT_TEXT_PREVIEW_HEIGHT: number = 100;
export const DEFAULT_TEXT_PREVIEW_FONT_SIZE: number = 20;
export const DEFAULT_TEXT_PREVIEW_FONT_COLOR: string = "white";
export const DEFAULT_TEXT_PREVIEW_FONT_NAME: string = "Inter Variable";
export const DEFAULT_TEXT_PREVIEW_FONT_WEIGHT: number = 400;

export type ElementType = "visualizer" | "particle";
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
  [TextCustomizationSettingType.fontWeight]?: number;
  [TextCustomizationSettingType.letterSpacing]?: number;
  [TextCustomizationSettingType.shadowBlur]?: number;
  [TextCustomizationSettingType.shadowColor]?: RGBColor;
  [TextCustomizationSettingType.ashFadeSettings]?: AshFadeSettings;
  textEffects?: TextEffect[];
  ashFadeSettings?: AshFadeSettings;
  ashFadeEffects?: AshFadeSettings[];
  isImage?: boolean;
  isVisualizer?: boolean;
  isParticle?: boolean;
  elementType?: ElementType;
  renderEnabled?: boolean;
  itemOpacity?: number;
  imageUrl?: string;
  imageScale?: number;
  imageOpacity?: number;
  imageDanceAmount?: number;
  imageDanceDirection?: number;
  imageDanceMode?: ImageDanceMode;
  imageDanceVectorX?: number;
  imageDanceVectorY?: number;
  visualizerSettings?: VisualizerSetting;
  particleSettings?: ParticleSettings;
}

export enum ScrollDirection {
  vertical = "vertical",
  horizontal = "horizontal",
}

export interface Coordinate {
  x: number;
  y: number;
}

export type TimelineTool = "default" | "cut";

export interface TimelineInteractionState {
  width: number;
  layerX: number;
  cursorX: number;
  // points: number[]
}
