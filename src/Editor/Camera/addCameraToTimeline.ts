import { CameraSettings, DEFAULT_CAMERA_SETTINGS } from "./store";

export function buildDefaultCameraSetting(): CameraSettings {
  return { ...DEFAULT_CAMERA_SETTINGS, overrides: [] };
}
