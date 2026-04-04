import {
  DEFAULT_VISUALIZER_SETTING,
  VisualizerMode,
  VisualizerSetting,
} from "./store";
import { extractProminentColors } from "./colorExtractor";

export async function buildDefaultVisualizerSetting(
  albumArtSrc?: string,
  mode: VisualizerMode = "classic"
) {
  const setting: VisualizerSetting = JSON.parse(
    JSON.stringify(DEFAULT_VISUALIZER_SETTING)
  );
  setting.mode = mode;
  setting.previewEffectsEnabled = false;

  if (mode === "aurora") {
    setting.globalAudioReactiveFocus = 0.34;
    setting.auroraShape = "ribbon";
    setting.auroraOriginX = 0.08;
    setting.auroraOriginY = 0.56;
    setting.auroraWidth = 1.04;
    setting.auroraHeight = 0.34;
    setting.auroraRotation = -14;
    setting.auroraGlowIntensity = 1.75;
    setting.auroraContrast = 1.8;
    setting.auroraReactiveThreshold = 0.24;
    setting.auroraExpansionAmount = 1.8;
    setting.auroraMotionAmount = 0.42;
  }

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
      if (mode === "aurora") {
        const darkest = sorted[sorted.length - 1];
        setting.fillRadialGradientColorStops = [
          {
            stop: 0.12,
            color: { r: darkest.r, g: darkest.g, b: darkest.b, a: 1 },
            beatSyncIntensity: 0.65,
            audioReactiveFocus: 0.12,
            x: -0.08,
            y: 0.02,
            auroraShape: "ribbon",
            auroraWidth: 0.92,
            auroraHeight: 0.32,
            auroraRotation: -18,
            auroraGlowIntensity: 1.2,
            auroraContrast: 1.5,
            auroraReactiveThreshold: 0.2,
            auroraExpansionAmount: 1.55,
            auroraMotionAmount: 0.3,
          },
          {
            stop: 0.52,
            color: { r: middle.r, g: middle.g, b: middle.b, a: 1 },
            beatSyncIntensity: 1.15,
            audioReactiveFocus: 0.42,
            x: 0,
            y: 0,
            auroraShape: "beam",
            auroraWidth: 1.08,
            auroraHeight: 0.26,
            auroraRotation: -14,
            auroraGlowIntensity: 1.95,
            auroraContrast: 2.05,
            auroraReactiveThreshold: 0.24,
            auroraExpansionAmount: 2,
            auroraMotionAmount: 0.44,
          },
          {
            stop: 0.9,
            color: { r: lightest.r, g: lightest.g, b: lightest.b, a: 1 },
            beatSyncIntensity: 0.9,
            audioReactiveFocus: 0.72,
            x: 0.08,
            y: -0.02,
            auroraShape: "bloom",
            auroraWidth: 0.76,
            auroraHeight: 0.4,
            auroraRotation: -8,
            auroraGlowIntensity: 1.65,
            auroraContrast: 1.85,
            auroraReactiveThreshold: 0.28,
            auroraExpansionAmount: 1.72,
            auroraMotionAmount: 0.36,
          },
        ];
      } else {
        setting.fillRadialGradientColorStops = [
          {
            stop: 0,
            color: { r: lightest.r, g: lightest.g, b: lightest.b, a: 1 },
            beatSyncIntensity: 1,
            audioReactiveFocus: 0.15,
            x: 0,
            y: 0,
            auroraShape: "ribbon",
            auroraWidth: 0.95,
            auroraHeight: 0.28,
            auroraRotation: -12,
            auroraGlowIntensity: 1.35,
            auroraContrast: 1.45,
            auroraReactiveThreshold: 0.18,
            auroraExpansionAmount: 1.4,
            auroraMotionAmount: 0.32,
          },
          {
            stop: 1,
            color: { r: middle.r, g: middle.g, b: middle.b, a: 1 },
            beatSyncIntensity: 0,
            audioReactiveFocus: 0.15,
            x: 0,
            y: 0,
            auroraShape: "ribbon",
            auroraWidth: 0.95,
            auroraHeight: 0.28,
            auroraRotation: -12,
            auroraGlowIntensity: 1.35,
            auroraContrast: 1.45,
            auroraReactiveThreshold: 0.18,
            auroraExpansionAmount: 1.4,
            auroraMotionAmount: 0.32,
          },
        ];
      }
    }
  } catch {
    // Fall back to defaults when artwork extraction fails.
  }

  return setting;
}

export async function buildDefaultAuroraSetting(albumArtSrc?: string) {
  return buildDefaultVisualizerSetting(albumArtSrc, "aurora");
}