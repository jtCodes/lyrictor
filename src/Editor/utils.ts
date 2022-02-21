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
