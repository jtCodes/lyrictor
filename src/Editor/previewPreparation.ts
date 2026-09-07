import type { LyricText } from "./types";
import type { getCameraFocusCues, getCameraFocusTargetsById } from "./Camera/focusTarget";
import { collectPreparationCandidates, PreparationPolicy } from "./Rendering/renderPreparation";
import { textBlurPreparationPolicy } from "./Lyrics/LyricPreview/textBlurPreparation";
import { usesCpuCanvasBlur } from "./Rendering/blur/capabilities";

export interface PreviewPreparationScene {
  items: LyricText[];
  width: number;
  focusCues: ReturnType<typeof getCameraFocusCues>;
  focusTargets: ReturnType<typeof getCameraFocusTargetsById>;
  cpuBlur: boolean;
}

// Register each renderer's policy once here. The preview does not contain its
// effect-selection rules, and playback never needs to know about new effects.
const policies: PreparationPolicy<LyricText, PreviewPreparationScene>[] = [textBlurPreparationPolicy];
export function getPreviewPreparationCandidates(scene: Omit<PreviewPreparationScene, "cpuBlur">) {
  return collectPreparationCandidates(scene.items, { ...scene, cpuBlur: usesCpuCanvasBlur() }, policies);
}
