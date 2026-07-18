import { LyricText } from "../types";
import { isItemRenderEnabled, isTextItem } from "../utils";
import { normalizeCameraZPosition } from "./store";

function getFocusTransitionDuration(focusChangeSpeed: number) {
  const normalizedSpeed = Math.min(
    100,
    Math.max(0, focusChangeSpeed)
  );

  return 2.5 - normalizedSpeed * 0.024;
}

function easeFocusChange(progress: number) {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return clampedProgress * clampedProgress * (3 - 2 * clampedProgress);
}

export function getCameraFocusDistanceAtPosition(
  focusCues: LyricText[],
  position: number,
  cameraStart: number,
  baseFocusDistance: number,
  focusChangeSpeed: number
) {
  const transitionDuration = getFocusTransitionDuration(focusChangeSpeed);
  let transitionFrom = normalizeCameraZPosition(baseFocusDistance);
  let transitionTarget = transitionFrom;
  let transitionStart = cameraStart;

  const resolveTransitionAt = (time: number) => {
    if (transitionFrom === transitionTarget) {
      return transitionTarget;
    }

    const progress = (time - transitionStart) / transitionDuration;
    const easedProgress = easeFocusChange(progress);

    return (
      transitionFrom +
      (transitionTarget - transitionFrom) * easedProgress
    );
  };

  for (const focusCue of focusCues) {
    if (focusCue.start < cameraStart) {
      continue;
    }

    if (focusCue.start > position) {
      break;
    }

    transitionFrom = resolveTransitionAt(focusCue.start);
    transitionTarget = normalizeCameraZPosition(
      focusCue.cameraZPosition ?? focusCue.cameraDepth
    );
    transitionStart = focusCue.start;
  }

  return resolveTransitionAt(position);
}

export function getCameraFocusCues(lyricTexts: LyricText[]) {
  return lyricTexts
    .filter(
      (lyricText) =>
        (lyricText.cameraFocusTarget || lyricText.cameraAutofocusTarget) &&
        isTextItem(lyricText) &&
        isItemRenderEnabled(lyricText)
    )
    .sort((left, right) => left.start - right.start || left.id - right.id);
}
