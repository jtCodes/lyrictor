export interface CameraSettings {
  focalLength: number;
  focusDistance: number;
  focusChangeSpeed: number;
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  focalLength: 50,
  focusDistance: 0.5,
  focusChangeSpeed: 70,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeCameraSettings(
  settings?: Partial<CameraSettings>
): CameraSettings {
  return {
    focalLength: clamp(
      settings?.focalLength ?? DEFAULT_CAMERA_SETTINGS.focalLength,
      18,
      200
    ),
    focusDistance: clamp(
      settings?.focusDistance ?? DEFAULT_CAMERA_SETTINGS.focusDistance,
      0,
      1
    ),
    focusChangeSpeed: clamp(
      settings?.focusChangeSpeed ?? DEFAULT_CAMERA_SETTINGS.focusChangeSpeed,
      0,
      100
    ),
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
