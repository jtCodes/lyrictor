import { RGBColor } from "react-color";
import { LyricText } from "../Editor/types";
import { getActiveNonTextItems, getElementType, isItemRenderEnabled } from "../Editor/utils";
import { normalizeLightSettings } from "../Editor/Light/store";
import { resolveLightPalette } from "../Editor/Light/paletteKeyframes";
import { normalizeVisualizerSetting } from "../Editor/Visualizer/store";

// Decoration uses a fixed palette, never a second playback/rendering loop.
export function getAmbientBackground(items: LyricText[]): string {
  const colorItems = items.filter((item) =>
    isItemRenderEnabled(item) && item.end > item.start &&
    (getElementType(item) === "light" || getElementType(item) === "visualizer")
  );
  if (!colorItems.length) return "none";

  const firstStart = Math.min(...colorItems.map((item) => item.start));
  let position = firstStart + 16;
  let activeItems = getActiveNonTextItems(colorItems, position);
  if (!activeItems.length) {
    position = firstStart;
    activeItems = getActiveNonTextItems(colorItems, position);
  }

  const colors: RGBColor[] = [];
  const addColor = (color: RGBColor, opacity: number) => {
    const a = Math.max(0, Math.min(1, (color.a ?? 1) * opacity));
    if (a > 0) colors.push({ ...color, a });
  };
  for (const item of activeItems) {
    const opacity = item.itemOpacity ?? 1;
    if (getElementType(item) === "light") {
      const settings = normalizeLightSettings(item.lightSettings);
      const palette = resolveLightPalette(settings, item.start, position);
      addColor(palette.baseColor, palette.baseOpacity * opacity);
      palette.fieldColors.forEach((color, index) =>
        addColor(color, palette.fieldOpacities[index] * opacity)
      );
    } else {
      normalizeVisualizerSetting(item.visualizerSettings)
        .fillRadialGradientColorStops.forEach(({ color }) => addColor(color, opacity));
    }
  }

  // Bound decorative paint complexity even for projects with many fields.
  const count = Math.min(4, colors.length);
  return Array.from({ length: count }, (_, index) => {
    const colorIndex = count === 1 ? 0 : Math.round(index * (colors.length - 1) / (count - 1));
    const { r, g, b, a } = colors[colorIndex];
    const x = count === 1 ? 50 : 15 + index * 70 / (count - 1);
    return `radial-gradient(ellipse 65% 85% at ${x}% 25%, rgba(${r}, ${g}, ${b}, ${a}) 0%, rgba(${r}, ${g}, ${b}, 0) 100%)`;
  }).join(", ") || "none";
}
