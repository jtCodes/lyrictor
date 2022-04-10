import { LyricText, ScrollDirection } from "./types";

export const scaleY = (amplitude: number, height: number) => {
  const range = 256;
  const offset = 128;

  return height - ((amplitude + offset) * height) / range;
};

export function secondsToPixels(
  secondsToConvert: number,
  maxSeconds: number,
  maxPixels: number
): number {
  return (secondsToConvert / maxSeconds) * maxPixels;
}

export function pixelsToSeconds(
  pixelsToConvert: number,
  maxPixels: number,
  maxSeconds: number
): number {
  return (pixelsToConvert / maxPixels) * maxSeconds;
}

export function getCurrentLyric(
  lyricTexts: LyricText[],
  position: number
): LyricText | undefined {
  let lyricText;

  for (let index = 0; index < lyricTexts.length; index++) {
    const element = lyricTexts[index];
    if (position >= element.start && position <= element.end) {
      lyricText = element;
      break;
    }
  }

  return lyricText;
}

export function getCurrentLyrics(
  lyricTexts: LyricText[],
  position: number
): LyricText[] {
  let visibleLyricTexts: LyricText[] = [];

  for (let index = 0; index < lyricTexts.length; index++) {
    const element = lyricTexts[index];
    if (position >= element.start && position <= element.end) {
      visibleLyricTexts.push(element);
    }
  }

  return visibleLyricTexts;
}

export function getCurrentLyricIndex(
  lyricTexts: LyricText[],
  position: number
): number | undefined {
  let indexFound;

  for (let index = 0; index < lyricTexts.length; index++) {
    const element = lyricTexts[index];
    if (position >= element.start && position <= element.end) {
      indexFound = index;
      break;
    }
  }

  return indexFound;
}

export function getScrollDirection(
  prevX: number,
  curX: number,
  prevY: number,
  curY: number
): ScrollDirection {
  if (Math.abs(curX - prevX) > Math.abs(curY - prevY)) {
    return ScrollDirection.horizontal;
  }

  return ScrollDirection.vertical;
}
