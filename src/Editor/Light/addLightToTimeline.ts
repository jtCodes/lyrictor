import { RGBColor } from "react-color";
import { extractProminentColors } from "../Visualizer/colorExtractor";
import { DEFAULT_LIGHT_SETTINGS, LightSettings } from "./store";

function cloneSettings(): LightSettings {
  return JSON.parse(JSON.stringify(DEFAULT_LIGHT_SETTINGS)) as LightSettings;
}

function luminance(color: RGBColor) {
  return color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
}

export async function buildDefaultLightSetting(albumArtSrc?: string) {
  const settings = cloneSettings();

  if (!albumArtSrc) {
    return settings;
  }

  try {
    const colors = await extractProminentColors(albumArtSrc, 8);
    if (colors.length >= 3) {
      const sorted = [...colors].sort((a, b) => luminance(b) - luminance(a));
      const brightest = sorted[0];
      const middle = sorted[Math.floor(sorted.length / 2)];
      const darkest = sorted[sorted.length - 1];

      settings.baseColor = {
        r: Math.round((middle.r + darkest.r) / 2),
        g: Math.round((middle.g + darkest.g) / 2),
        b: Math.round((middle.b + darkest.b) / 2),
        a: 1,
      };
      settings.fields[0].color = { ...brightest, a: 1 };
      settings.fields[1].color = { ...middle, a: 1 };
      settings.fields[2].color = { ...darkest, a: 1 };
    }
  } catch {
    // Fall back to defaults when artwork extraction fails.
  }

  return settings;
}