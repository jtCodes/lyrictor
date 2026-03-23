export const ZOOM_KEYBOARD_FACTOR = 1.15;
const MAX_VISIBLE_DURATION_AT_MAX_ZOOM_SECONDS = 0.5;

function getMaxZoomWidth(minWidth: number, duration: number): number {
  if (duration <= 0) {
    return minWidth;
  }

  return Math.max(
    minWidth,
    minWidth * (duration / MAX_VISIBLE_DURATION_AT_MAX_ZOOM_SECONDS)
  );
}

export function zoomSliderValueFromWidth(
  minWidth: number,
  currentWidth: number,
  duration: number
): number {
  const maxWidth = getMaxZoomWidth(minWidth, duration);
  const zoomRange = maxWidth / minWidth;

  if (zoomRange <= 1) {
    return 0;
  }

  const zoomMultiplier = Math.min(zoomRange, Math.max(1, currentWidth / minWidth));
  return Math.min(1, Math.max(0, Math.log(zoomMultiplier) / Math.log(zoomRange)));
}

export function widthFromZoomSliderValue(
  minWidth: number,
  sliderValue: number,
  duration: number
): number {
  const maxWidth = getMaxZoomWidth(minWidth, duration);
  const zoomRange = maxWidth / minWidth;

  if (zoomRange <= 1) {
    return minWidth;
  }

  return minWidth * Math.pow(zoomRange, sliderValue);
}

export function getNextZoomInWidth(
  currentWidth: number,
  minWidth: number,
  duration: number
): number {
  const maxWidth = getMaxZoomWidth(minWidth, duration);
  return Math.min(maxWidth, currentWidth * ZOOM_KEYBOARD_FACTOR);
}

export function getNextZoomOutWidth(
  currentWidth: number,
  minWidth: number
): number {
  return Math.max(minWidth, currentWidth / ZOOM_KEYBOARD_FACTOR);
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
