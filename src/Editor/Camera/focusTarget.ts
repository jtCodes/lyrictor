import { LyricText } from "../types";
import { isItemRenderEnabled, isTextItem } from "../utils";

export function getFocusTransitionDuration(focusChangeSpeed: number) {
  const normalizedSpeed = Math.min(
    100,
    Math.max(0, focusChangeSpeed)
  );

  return 2.5 - normalizedSpeed * 0.024;
}

export function easeFocusChange(progress: number) {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return clampedProgress * clampedProgress * (3 - 2 * clampedProgress);
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

export function getCameraFocusTargetsById(lyricTexts: LyricText[]) {
  return new Map(
    lyricTexts
      .filter(
        (lyricText) =>
          isTextItem(lyricText) && isItemRenderEnabled(lyricText)
      )
      .map((lyricText) => [lyricText.id, lyricText])
  );
}
