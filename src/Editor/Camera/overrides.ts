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

function closestRotationTarget(from: number, target: number) {
  const delta = ((target - from + 540) % 360) - 180;

  return from + delta;
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
  let dollyPositionTransition: ValueTransition = {
    from: baseValues.dollyPosition,
    target: baseValues.dollyPosition,
    start: cameraStart,
    duration: 0,
  };
  let truckPositionTransition: ValueTransition = {
    from: baseValues.truckPosition,
    target: baseValues.truckPosition,
    start: cameraStart,
    duration: 0,
  };
  let tiltTransition: ValueTransition = {
    from: baseValues.tilt,
    target: baseValues.tilt,
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
  let rotationTransition: ValueTransition = {
    from: baseValues.rotation,
    target: baseValues.rotation,
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
      const currentValues: CameraValues = {
        focalLength: resolveValueTransition(
          focalLengthTransition,
          overrideTime
        ),
        dollyPosition: resolveValueTransition(
          dollyPositionTransition,
          overrideTime
        ),
        truckPosition: resolveValueTransition(
          truckPositionTransition,
          overrideTime
        ),
        tilt: resolveValueTransition(tiltTransition, overrideTime),
        focusDistance: resolveValueTransition(
          focusDistanceTransition,
          overrideTime
        ),
        focusChangeSpeed: resolveValueTransition(
          focusChangeSpeedTransition,
          overrideTime
        ),
        rotation: resolveValueTransition(rotationTransition, overrideTime),
      };
      const startValues = cameraOverride.preOverride
        ? normalizeCameraValues(cameraOverride.preOverride, currentValues)
        : currentValues;
      focalLengthTransition = {
        from: startValues.focalLength,
        target: targetValues.focalLength,
        start: overrideTime,
        duration: transitionDuration,
      };
      dollyPositionTransition = {
        from: startValues.dollyPosition,
        target: targetValues.dollyPosition,
        start: overrideTime,
        duration: transitionDuration,
      };
      truckPositionTransition = {
        from: startValues.truckPosition,
        target: targetValues.truckPosition,
        start: overrideTime,
        duration: transitionDuration,
      };
      tiltTransition = {
        from: startValues.tilt,
        target: targetValues.tilt,
        start: overrideTime,
        duration: transitionDuration,
      };
      focusDistanceTransition = {
        from: startValues.focusDistance,
        target: targetValues.focusDistance,
        start: overrideTime,
        duration: focusTarget
          ? getFocusTransitionDuration(targetValues.focusChangeSpeed)
          : transitionDuration,
      };
      focusIsLockedByOverride = focusTarget !== undefined;
      focusChangeSpeedTransition = {
        from: startValues.focusChangeSpeed,
        target: targetValues.focusChangeSpeed,
        start: overrideTime,
        duration: transitionDuration,
      };
      rotationTransition = {
        from: startValues.rotation,
        target: closestRotationTarget(
          startValues.rotation,
          targetValues.rotation
        ),
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
    dollyPosition: resolveValueTransition(dollyPositionTransition, position),
    truckPosition: resolveValueTransition(truckPositionTransition, position),
    tilt: resolveValueTransition(tiltTransition, position),
    focusDistance: resolveValueTransition(
      focusDistanceTransition,
      position
    ),
    focusChangeSpeed: resolveValueTransition(
      focusChangeSpeedTransition,
      position
    ),
    rotation: resolveValueTransition(rotationTransition, position),
  };
}
