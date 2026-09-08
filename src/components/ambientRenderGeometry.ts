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
