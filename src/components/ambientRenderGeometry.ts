import { getPreviewSize } from "../Editor/Lyrics/LyricPreview/previewSizing";
import type { VideoAspectRatio } from "../Project/types";

const PREVIEW_SCALE = 0.08;
const MAX_PREVIEW_DIMENSION = 256;
const BLUR_SIGMA = 80;

/** Blur in preview coordinates; scaling restores the original 80px softness. */
export function getAmbientRenderGeometry(width: number, height: number) {
  const scale = Math.min(PREVIEW_SCALE, MAX_PREVIEW_DIMENSION / Math.max(width, height, 1));
  const previewWidth = Math.max(1, width * scale);
  const previewHeight = Math.max(1, height * scale);
  const blurSigma = BLUR_SIGMA * scale;
  // Gaussian blur needs transparent space outside the source, before masking.
  const margin = Math.ceil(blurSigma * 3) + 1;
  return { scale, previewWidth, previewHeight, blurSigma, margin };
}

/** Cover the viewport with actual scene pixels, not the letterboxed wrapper. */
export function getAmbientCoverScale(width: number, height: number, resolution?: VideoAspectRatio) {
  const scene = getPreviewSize(width, height, resolution);
  return 2.5 * Math.max(width / scene.previewWidth, height / scene.previewHeight);
}
