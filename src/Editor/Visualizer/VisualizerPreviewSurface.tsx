import { View } from "@adobe/react-spectrum";
import { Stage } from "react-konva";
import { LyricText } from "../types";
import MusicVisualizer from "./AudioVisualizer";
import { normalizeVisualizerSetting } from "./store";

export default function VisualizerPreviewSurface({
  width,
  height,
  position,
  lyricText,
  opacity,
  previewMode,
  showPreviewEffects,
}: {
  width: number;
  height: number;
  position: number;
  lyricText: LyricText;
  opacity: number;
  previewMode: "free" | "static";
  showPreviewEffects: boolean;
}) {
  const visualizerSettings = normalizeVisualizerSetting(
    lyricText.visualizerSettings
  );
  const shouldRenderPreviewEffects =
    visualizerSettings.previewEffectsEnabled && showPreviewEffects;
  const previewBlurPx = Math.max(1, Math.round(visualizerSettings.blur * height * 0.08));

  return (
    <View
      position={"absolute"}
      width={width}
      height={height}
      UNSAFE_style={{ pointerEvents: "none", opacity }}
      data-export-non-text-layer="visualizer"
    >
      <Stage width={width} height={height}>
        <MusicVisualizer
          width={width}
          height={height}
          variant="vignette"
          position={position}
          lyricText={lyricText}
        />
      </Stage>
      {shouldRenderPreviewEffects && previewMode === "free" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            pointerEvents: "none",
          }}
        />
      ) : null}
      {shouldRenderPreviewEffects && visualizerSettings.blur > 0.001 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backdropFilter: `blur(${previewBlurPx}px)`,
            WebkitBackdropFilter: `blur(${previewBlurPx}px)`,
            backgroundColor: "rgba(255,255,255,0.001)",
          }}
        />
      ) : null}
      {shouldRenderPreviewEffects && previewMode === "static" ? (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backdropFilter: `blur(${Math.round(250 * (height / 1080))}px) saturate(180%)`,
              WebkitBackdropFilter: `blur(${Math.round(250 * (height / 1080))}px) saturate(180%)`,
              backgroundColor: "rgba(17, 25, 40, 0.30)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            }}
          >
            <div
              className="sticky top-0 left-0 right-0 z-10"
              style={{
                height: height * 0.3,
                WebkitMaskImage:
                  "linear-gradient( rgba(0, 0, 0, 1),transparent)",
                maskImage: "linear-gradient( rgba(0, 0, 0, 1),transparent)",
                backdropFilter: `blur(${Math.round(500 * (height / 1080))}px) saturate(100%)`,
                WebkitBackdropFilter: `blur(${Math.round(500 * (height / 1080))}px) saturate(100%)`,
                paddingLeft: "25%",
                paddingRight: "25%",
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            }}
          >
            <div
              className="sticky bottom-0 left-0 right-0 z-1"
              style={{
                height: height * 0.5,
                marginTop: height * 0.5,
                WebkitMaskImage:
                  "linear-gradient(transparent, rgba(0, 0, 0, 1))",
                maskImage: "linear-gradient(transparent, rgba(0, 0, 0, 1))",
                backdropFilter: `blur(${Math.round(500 * (height / 1080))}px) saturate(100%)`,
                WebkitBackdropFilter: `blur(${Math.round(500 * (height / 1080))}px) saturate(100%)`,
                paddingLeft: "25%",
                paddingRight: "25%",
              }}
            />
          </div>
        </>
      ) : null}
    </View>
  );
}