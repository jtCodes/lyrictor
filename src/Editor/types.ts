import { TextCustomizationSettingType } from "./AudioTimeline/Tools/types";

export const DEFAULT_TEXT_PREVIEW_WIDTH: number = 150;
export const DEFAULT_TEXT_PREVIEW_HEIGHT: number = 100;
export const DEFAULT_TEXT_PREVIEW_FONT_SIZE: number = 20;
export const DEFAULT_TEXT_PREVIEW_FONT_COLOR: string = "white";
export const DEFAULT_TEXT_PREVIEW_FONT_NAME: string = "Inter Variable";
export const DEFAULT_TEXT_PREVIEW_FONT_WEIGHT: number = 400;
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
  [TextCustomizationSettingType.fontColor]?: string;
  [TextCustomizationSettingType.fontWeight]?: number;
  [TextCustomizationSettingType.shadowBlur]?: number;
  [TextCustomizationSettingType.shadowColor]?: string;
  isImage?: boolean;
  imageUrl?: string;
}

export enum ScrollDirection {
  vertical = "vertical",
  horizontal = "horizontal",
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface TimelineInteractionState {
  width: number;
  layerX: number;
  cursorX: number;
  // points: number[]
}
