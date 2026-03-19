export const MAX_ZOOM_MULTIPLIER = 80;
export const ZOOM_KEYBOARD_FACTOR = 1.15;

export function zoomSliderValueFromWidth(
  initWidth: number,
  currentWidth: number
): number {
  const zoomMultiplier = Math.max(1, currentWidth / initWidth);
  return Math.min(
    1,
    Math.max(0, Math.log(zoomMultiplier) / Math.log(MAX_ZOOM_MULTIPLIER))
  );
}

export function widthFromZoomSliderValue(
  initWidth: number,
  sliderValue: number
): number {
  return initWidth * Math.pow(MAX_ZOOM_MULTIPLIER, sliderValue);
}

export function getNextZoomInWidth(
  currentWidth: number,
  initWidth: number
): number {
  const maxWidth = initWidth * MAX_ZOOM_MULTIPLIER;
  return Math.min(maxWidth, currentWidth * ZOOM_KEYBOARD_FACTOR);
}

export function getNextZoomOutWidth(
  currentWidth: number,
  initWidth: number
): number {
  return Math.max(initWidth, currentWidth / ZOOM_KEYBOARD_FACTOR);
}

export function calculateHorizontalScrollbarLength(
  windowWidth: number,
  timelineWidth: number,
  minThumbLength: number = 20
): number {
  let length = minThumbLength;

  if (windowWidth > 0 && windowWidth < timelineWidth) {
    const proportionalLength = (windowWidth / timelineWidth) * windowWidth;
    if (proportionalLength > minThumbLength) {
      length = proportionalLength;
    }
  }

  return length;
}
