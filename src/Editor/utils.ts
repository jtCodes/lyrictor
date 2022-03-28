import { LyricText } from "./types";

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
  position: number,
  maxEndTime: number
): LyricText | undefined {
  if (position > maxEndTime) {
    return undefined;
  }

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
