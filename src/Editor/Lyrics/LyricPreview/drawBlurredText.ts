import { Text } from "konva/lib/shapes/Text";
import { createBlurRenderer } from "../../Rendering/blur/createBlurRenderer";
import { ensureFontReady } from "./fontLoad";

// Text-specific drawing and asset readiness; the shared renderer owns the rest.
export const textBlurRenderer = createBlurRenderer<Text>({
  cacheKey: "attributes",
  draw: (node, context) => Text.prototype._sceneFunc.call(node, context),
  overhang: node => node.fontSize(),
  ready: node => ensureFontReady(node.fontFamily(), node.fontStyle(), node.fontSize()),
});
export const drawBlurredText = textBlurRenderer.draw;
export const preRenderBlurredText = textBlurRenderer.preRender;
