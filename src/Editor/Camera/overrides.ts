import { LyricText } from "../types";
import { easeFocusChange, getFocusTransitionDuration } from "./focusTarget";
import {
  CameraOverride,
  CameraSettings,
  CameraValues,
  normalizeCameraValues,
  normalizeCameraZPosition,
} from "./store";

let overrideId = 0;

export function createCameraOverride(
  values: CameraValues,
  startOffset: number,
  endOffset: number
): CameraOverride {
  overrideId += 1;

  return {
    id: `camera-override-${Date.now().toString(36)}-${overrideId}`,
    startOffset: Math.max(0, startOffset),
    endOffset: Math.max(startOffset + 0.01, endOffset),
    ...normalizeCameraValues(values),
  };
}

interface ValueTransition {
  from: number;
  target: number;
  start: number;
  duration: number;
}

function resolveValueTransition(transition: ValueTransition, time: number) {
  if (transition.from === transition.target || transition.duration <= 0) {
    return transition.target;
  }

  const progress = (time - transition.start) / transition.duration;
  const easedProgress = easeFocusChange(progress);

  return (
    transition.from +
    (transition.target - transition.from) * easedProgress
  );
}

/**
 * Resolves persistent camera state. Overrides transition to a complete camera
 * snapshot from Start through End and remain active afterward. Text focus cues
 * replace only focus distance and use the speed active at the cue timestamp.
 */
export function resolveCameraSettingsAtPosition(
  settings: CameraSettings,
  focusCues: LyricText[],
  focusTargetsById: ReadonlyMap<number, LyricText>,
  cameraStart: number,
  position: number
): CameraSettings {
  const baseValues = normalizeCameraValues(settings);
  let focalLengthTransition: ValueTransition = {
    from: baseValues.focalLength,
    target: baseValues.focalLength,
    start: cameraStart,
    duration: 0,
  };
  let focusDistanceTransition: ValueTransition = {
    from: baseValues.focusDistance,
    target: baseValues.focusDistance,
    start: cameraStart,
    duration: 0,
  };
  let focusChangeSpeedTransition: ValueTransition = {
    from: baseValues.focusChangeSpeed,
    target: baseValues.focusChangeSpeed,
    start: cameraStart,
    duration: 0,
  };
  let overrideIndex = 0;
  let focusCueIndex = 0;
  let focusIsLockedByOverride = false;

  while (focusCueIndex < focusCues.length) {
    if (focusCues[focusCueIndex].start >= cameraStart) {
      break;
    }
    focusCueIndex += 1;
  }

  while (true) {
    const cameraOverride = settings.overrides[overrideIndex];
    const focusCue = focusCues[focusCueIndex];
    const overrideTime = cameraOverride
      ? cameraStart + cameraOverride.startOffset
      : Number.POSITIVE_INFINITY;
    const focusCueTime = focusCue?.start ?? Number.POSITIVE_INFINITY;
    const nextTime = Math.min(overrideTime, focusCueTime);

    if (nextTime > position || !Number.isFinite(nextTime)) {
      break;
    }

    // Schedule camera overrides first at shared timestamps. An explicit
    // override target locks focus; a manual override still allows text cues.
    if (overrideTime <= focusCueTime) {
      const transitionDuration = Math.max(
        0.01,
        cameraOverride.endOffset - cameraOverride.startOffset
      );
      const focusTarget = cameraOverride.focusTargetId !== undefined
        ? focusTargetsById.get(cameraOverride.focusTargetId)
        : undefined;
      const targetValues = normalizeCameraValues({
        ...cameraOverride,
        focusDistance: focusTarget
          ? normalizeCameraZPosition(
              focusTarget.cameraZPosition ?? focusTarget.cameraDepth
            )
          : cameraOverride.focusDistance,
      });
      focalLengthTransition = {
        from: resolveValueTransition(focalLengthTransition, overrideTime),
        target: targetValues.focalLength,
        start: overrideTime,
        duration: transitionDuration,
      };
      focusDistanceTransition = {
        from: resolveValueTransition(focusDistanceTransition, overrideTime),
        target: targetValues.focusDistance,
        start: overrideTime,
        duration: focusTarget
          ? getFocusTransitionDuration(targetValues.focusChangeSpeed)
          : transitionDuration,
      };
      focusIsLockedByOverride = focusTarget !== undefined;
      focusChangeSpeedTransition = {
        from: resolveValueTransition(
          focusChangeSpeedTransition,
          overrideTime
        ),
        target: targetValues.focusChangeSpeed,
        start: overrideTime,
        duration: transitionDuration,
      };
      overrideIndex += 1;
      continue;
    }

    if (focusIsLockedByOverride) {
      focusCueIndex += 1;
      continue;
    }

    const focusAtCue = resolveValueTransition(
      focusDistanceTransition,
      focusCueTime
    );
    const focusChangeSpeed = resolveValueTransition(
      focusChangeSpeedTransition,
      focusCueTime
    );
    focusDistanceTransition = {
      from: focusAtCue,
      target: normalizeCameraZPosition(
        focusCue.cameraZPosition ?? focusCue.cameraDepth
      ),
      start: focusCueTime,
      duration: getFocusTransitionDuration(focusChangeSpeed),
    };
    focusCueIndex += 1;
  }

  return {
    ...settings,
    focalLength: resolveValueTransition(focalLengthTransition, position),
    focusDistance: resolveValueTransition(
      focusDistanceTransition,
      position
    ),
    focusChangeSpeed: resolveValueTransition(
      focusChangeSpeedTransition,
      position
    ),
  };
}
