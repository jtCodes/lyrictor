export interface CameraValues {
  focalLength: number;
  dollyPosition: number;
  truckPosition: number;
  tilt: number;
  focusDistance: number;
  focusChangeSpeed: number;
  rotation: number;
}

export interface CameraOverride extends CameraValues {
  id: string;
  startOffset: number;
  endOffset: number;
  focusTargetId?: number;
  preOverride?: CameraValues;
}

export interface CameraSettings extends CameraValues {
  overrides: CameraOverride[];
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  focalLength: 50,
  dollyPosition: 0,
  truckPosition: 0,
  tilt: 0,
  focusDistance: 0.5,
  focusChangeSpeed: 70,
  rotation: 0,
  overrides: [],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRotation(value: number) {
  const wrapped = ((value + 180) % 360 + 360) % 360 - 180;

  return wrapped === -180 && value > 0 ? 180 : wrapped;
}

function normalizeCameraMovement(value: number) {
  const normalizedValue = clamp(value, -100, 100) / 100;

  return (
    Math.sign(normalizedValue) * Math.pow(Math.abs(normalizedValue), 1.2)
  );
}

export function normalizeCameraSettings(
  settings?: Partial<CameraSettings>
): CameraSettings {
  const baseValues = normalizeCameraValues(settings);

  return {
    ...baseValues,
    overrides: (settings?.overrides ?? [])
      .map((override, index) => {
        const startOffset = Math.max(0, override.startOffset ?? 0);

        return {
          id: override.id || `camera-override-${index}`,
          startOffset,
          endOffset: Math.max(
            startOffset + 0.01,
            override.endOffset ?? startOffset + 1
          ),
          focusTargetId:
            typeof override.focusTargetId === "number"
              ? override.focusTargetId
              : undefined,
          preOverride: override.preOverride
            ? normalizeCameraValues(override.preOverride, baseValues)
            : undefined,
          ...normalizeCameraValues(override, baseValues),
        };
      })
      .sort(
        (left, right) =>
          left.startOffset - right.startOffset ||
          left.id.localeCompare(right.id)
      ),
  };
}

export function normalizeCameraValues(
  settings?: Partial<CameraValues>,
  fallback: CameraValues = DEFAULT_CAMERA_SETTINGS
): CameraValues {
  return {
    focalLength: clamp(settings?.focalLength ?? fallback.focalLength, 18, 200),
    dollyPosition: clamp(
      settings?.dollyPosition ?? fallback.dollyPosition,
      -100,
      100
    ),
    truckPosition: clamp(
      settings?.truckPosition ?? fallback.truckPosition,
      -100,
      100
    ),
    tilt: clamp(settings?.tilt ?? fallback.tilt, -90, 90),
    focusDistance: clamp(
      settings?.focusDistance ?? fallback.focusDistance,
      0,
      1
    ),
    focusChangeSpeed: clamp(
      settings?.focusChangeSpeed ?? fallback.focusChangeSpeed,
      0,
      100
    ),
    rotation: normalizeRotation(settings?.rotation ?? fallback.rotation),
  };
}

export function normalizeCameraZPosition(zPosition?: number) {
  return clamp(zPosition ?? DEFAULT_CAMERA_SETTINGS.focusDistance, 0, 1);
}

export function getCameraZPositionScale(zPosition?: number) {
  const normalizedZPosition = normalizeCameraZPosition(zPosition);
  const relativeDistance = 0.65 + normalizedZPosition * 0.7;

  return 1 / relativeDistance;
}

/**
 * Simulates camera travel along the scene's depth axis. Positive values move
 * forward. Near subjects change size more than distant subjects, unlike a
 * focal-length change, which applies the lens profile to the whole scene.
 */
export function getCameraDollyScale(
  dollyPosition: number,
  zPosition?: number
) {
  const normalizedZPosition = normalizeCameraZPosition(zPosition);
  const relativeDistance = 0.65 + normalizedZPosition * 0.7;
  const normalizedMovement = normalizeCameraMovement(dollyPosition);
  const cameraTravel =
    normalizedMovement * (normalizedMovement >= 0 ? 0.75 : 3);

  return clamp(
    relativeDistance / Math.max(0.08, relativeDistance - cameraTravel),
    0.12,
    6
  );
}

/**
 * Converts lateral camera travel into screen-space parallax. Positive values
 * move the camera right, so scene content shifts left. Near subjects travel
 * farther across the frame than distant subjects.
 */
export function getCameraTruckOffset(
  truckPosition: number,
  zPosition: number | undefined,
  previewWidth: number
) {
  const normalizedZPosition = normalizeCameraZPosition(zPosition);
  const depthParallax = 1.25 - normalizedZPosition * 0.5;

  return (
    -normalizeCameraMovement(truckPosition) *
    previewWidth *
    1.15 *
    depthParallax
  );
}

/**
 * Maps vertical camera direction to framing movement. At either 90-degree
 * limit, the original forward-facing scene has moved beyond the frame.
 */
export function getCameraTiltOffset(tilt: number, previewHeight: number) {
  const normalizedTilt = clamp(tilt, -90, 90) / 90;
  const easedTilt =
    Math.sign(normalizedTilt) * Math.pow(Math.abs(normalizedTilt), 1.15);

  return easedTilt * previewHeight * 1.15;
}

export function getCameraFocusBlurRadius(
  settings: CameraSettings,
  zPosition: number | undefined,
  previewWidth: number
) {
  const focusDistanceDelta = Math.abs(
    normalizeCameraZPosition(zPosition) - settings.focusDistance
  );

  if (focusDistanceDelta < 0.015) {
    return 0;
  }

  const focalDepthFactor = clamp(settings.focalLength / 50, 0.55, 2);

  return (
    Math.pow(focusDistanceDelta, 1.35) *
    previewWidth *
    0.028 *
    focalDepthFactor
  );
}

export function getCameraMaxFocusBlurRadius(
  settings: CameraSettings,
  zPosition: number | undefined,
  previewWidth: number
) {
  const normalizedZPosition = normalizeCameraZPosition(zPosition);
  const maximumFocusDistanceDelta = Math.max(
    normalizedZPosition,
    1 - normalizedZPosition
  );
  const focalDepthFactor = clamp(settings.focalLength / 50, 0.55, 2);

  return (
    Math.pow(maximumFocusDistanceDelta, 1.35) *
    previewWidth *
    0.028 *
    focalDepthFactor
  );
}

export function cameraScaleFromFocalLength(focalLength: number) {
  return normalizeCameraSettings({ focalLength }).focalLength / 50;
}

export interface CameraLensProfile {
  sceneScale: number;
  wideAmount: number;
  telephotoAmount: number;
  radialDistortion: number;
  backgroundScaleX: number;
  backgroundScaleY: number;
}

export function getCameraLensProfile(focalLength: number): CameraLensProfile {
  const normalizedFocalLength = normalizeCameraSettings({ focalLength })
    .focalLength;
  const sceneScale = normalizedFocalLength / 50;
  const wideAmount = clamp((50 - normalizedFocalLength) / 32, 0, 1);
  const telephotoAmount = clamp((normalizedFocalLength - 50) / 150, 0, 1);
  const backgroundCompression = 1 + telephotoAmount * 0.16;
  const backgroundScale = Math.max(1, sceneScale * backgroundCompression);

  return {
    sceneScale,
    wideAmount,
    telephotoAmount,
    radialDistortion: -wideAmount * 0.09 + telephotoAmount * 0.018,
    backgroundScaleX:
      backgroundScale * (1 + wideAmount * 0.055 + telephotoAmount * 0.008),
    backgroundScaleY: backgroundScale * (1 + wideAmount * 0.018),
  };
}

export function getRadialLensScale(
  profile: CameraLensProfile,
  normalizedX: number,
  normalizedY: number
) {
  const radiusSquared = clamp(
    normalizedX * normalizedX + normalizedY * normalizedY,
    0,
    2
  );

  return clamp(1 + profile.radialDistortion * radiusSquared, 0.82, 1.08);
}
