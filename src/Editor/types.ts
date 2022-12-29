export const DEFAULT_TEXT_PREVIEW_WIDTH: number = 150;
export const DEFAULT_TEXT_PREVIEW_HEIGHT: number = 100;
export const DEFAULT_TEXT_PREVIEW_FONT_SIZE: number = 16;
export const DEFAULT_TEXT_PREVIEW_FONT_COLOR: string = "white";
export const DEFAULT_TEXT_PREVIEW_FONT_NAME: string = "sans-serif";
export interface LyricText {
  id: number;
  start: number; // time this lyric begin
  end: number;
  text: string;
  textY: number;
  textX: number;
  textBoxTimelineLevel: number;
  width?: number,
  height?: number,
  fontName?: string,
  fontSize?: number,
  fontColor?: string
}

export enum ScrollDirection {
  vertical = "vertical",
  horizontal = "horizontal",
}

export interface Coordinate {
  x: number;
  y: number;
}
