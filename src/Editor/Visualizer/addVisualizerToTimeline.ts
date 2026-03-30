import { DEFAULT_VISUALIZER_SETTING, VisualizerSetting } from "./store";
import { extractProminentColors } from "./colorExtractor";

export async function buildDefaultVisualizerSetting(albumArtSrc?: string) {
  const setting: VisualizerSetting = JSON.parse(
    JSON.stringify(DEFAULT_VISUALIZER_SETTING)
  );

  if (!albumArtSrc) {
    return setting;
  }

  try {
    const colors = await extractProminentColors(albumArtSrc, 10);
    if (colors.length >= 2) {
      const sorted = [...colors].sort(
        (a, b) =>
          (b.r * 0.299 + b.g * 0.587 + b.b * 0.114) -
          (a.r * 0.299 + a.g * 0.587 + a.b * 0.114)
      );
      const lightest = sorted[0];
      const middle = sorted[Math.floor(sorted.length / 2)];
      setting.fillRadialGradientColorStops = [
        {
          stop: 0,
          color: { r: lightest.r, g: lightest.g, b: lightest.b, a: 1 },
          beatSyncIntensity: 1,
        },
        {
          stop: 1,
          color: { r: middle.r, g: middle.g, b: middle.b, a: 1 },
          beatSyncIntensity: 0,
        },
      ];
    }
  } catch {
    // Fall back to defaults when artwork extraction fails.
  }

  return setting;
}