import type { LyricText } from "../../types";
import type { PreviewPreparationScene } from "../../previewPreparation";
import type { PreparationPolicy } from "../../Rendering/renderPreparation";
import { getCurrentCamera, isItemRenderEnabled, isTextItem } from "../../utils";
import { getCameraFocusBlurRadius, normalizeCameraSettings } from "../../Camera/store";
import { resolveCameraSettingsAtPosition } from "../../Camera/overrides";
import { getTextBlurRenderProps } from "../Effects/Blur/BlurEffect";

// The current text adapter prepares the cue's initial pose. Temporal sampling
// belongs here when added, rather than in the scheduler or playback controls.
export const textBlurPreparationPolicy: PreparationPolicy<LyricText, PreviewPreparationScene> = {
  needsPreparation(item, scene) {
    if (!scene.cpuBlur || !isTextItem(item) || !isItemRenderEnabled(item) || item.end <= item.start) return false;
    const camera = getCurrentCamera(scene.items, item.start);
    const settings = camera ? resolveCameraSettingsAtPosition(normalizeCameraSettings(camera.cameraSettings),
      scene.focusCues, scene.focusTargets, camera.start, item.start) : undefined;
    const focusBlur = settings ? getCameraFocusBlurRadius(settings,
      item.cameraZPosition ?? item.cameraDepth, scene.width) : 0;
    const effectBlur = Number(getTextBlurRenderProps(item, item.start, scene.width).blurRadius ?? 0);
    return Math.max(focusBlur, effectBlur) > 0.2;
  },
};
