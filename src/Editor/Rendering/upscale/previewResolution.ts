/** 720p in either orientation, never supersample a smaller physical preview. */
export function previewResolution(width: number, height: number, dpr: number) {
  if (!(width > 0 && height > 0)) return { ratio: 1, width: 0, height: 0 };
  const ratio = Math.min(Math.max(1, dpr || 1), 1280 / Math.max(width, height), 720 / Math.min(width, height));
  return { ratio, width: Math.max(1, Math.floor(width * ratio)), height: Math.max(1, Math.floor(height * ratio)) };
}
