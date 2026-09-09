import PreviewSceneLayer from "../Rendering/upscale/PreviewSceneLayer";
import { View } from "@adobe/react-spectrum";
import { useEffect, useState } from "react";
import { Circle, Rect, Stage } from "react-konva";
import { RGBColor } from "react-color";
import { useAudioPlayer } from "react-use-audio-player";
import { useAudioBeatResponseReader } from "../AudioReactive/useAudioBeatIntensity";
import { LyricText } from "../types";
import { resolveLightPalette } from "./paletteKeyframes";
import { normalizeLightSettings } from "./store";

function toRgbaString(color: RGBColor, opacityMultiplier: number = 1) {
  const alpha = Math.max(0, Math.min(1, (color.a ?? 1) * opacityMultiplier));
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function LightPreviewSurface({
  width,
  height,
  lyricText,
  position,
  opacity,
  disableAnimation = false,
}: {
  width: number;
  height: number;
  lyricText: LyricText;
  position: number;
  opacity: number;
  disableAnimation?: boolean;
}) {
  const lightSettings = normalizeLightSettings(lyricText.lightSettings);
  const palette = resolveLightPalette(
    lightSettings,
    lyricText.start,
    position
  );
  const blurStrength = Math.max(0, Math.min(1, lightSettings.blur));
  const { playing } = useAudioPlayer();
  const hasBeatReactiveFields = palette.fieldBeatReactive.some(
    (settings) => settings.intensity > 0
  );
  const readBeatResponse = useAudioBeatResponseReader(
    !disableAnimation && playing && hasBeatReactiveFields
  );
  const hasMotion = lightSettings.fields.some(
    (field) => (field.motionAmount ?? 0) > 0.001
  );
  const shouldAnimate = !disableAnimation && hasMotion;
  const [animationTime, setAnimationTime] = useState(0);
  const renderedAnimationTime = shouldAnimate ? animationTime : 0;

  useEffect(() => {
    if (!shouldAnimate) {
      return;
    }

    let frameId = 0;
    let lastUpdate = 0;

    const tick = (now: number) => {
      if (now - lastUpdate >= 1000 / 30) {
        setAnimationTime(now * 0.001);
        lastUpdate = now;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [shouldAnimate]);

  return (
    <View
      position={"absolute"}
      width={width}
      height={height}
      UNSAFE_style={{ pointerEvents: "none", opacity }}
      data-export-non-text-layer="light"
    >
      <Stage width={width} height={height}>
        <PreviewSceneLayer>
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={toRgbaString(palette.baseColor, palette.baseOpacity)}
          />
          {lightSettings.fields.map((field, index) => {
            const beatReactive = palette.fieldBeatReactive[index] ?? {
              intensity: field.beatReactiveIntensity,
              focus: field.beatReactiveFocus,
              affectsSize: field.beatReactiveSize,
              affectsOpacity: field.beatReactiveOpacity,
            };
            const seed = lyricText.id * 0.173 + (index + 1) * 1.618;
            const motionAmount = clamp(field.motionAmount ?? 0, 0, 1);
            const beatResponse = readBeatResponse(beatReactive.focus);
            const reactiveIntensity = clamp(
              beatReactive.intensity,
              0,
              2
            );
            const normalizedReactiveIntensity = reactiveIntensity / 2;
            // 0.5 intensity gives a 0.9999–1 opacity range; 2 allows 0–1.
            const responseDepth = Math.pow(
              normalizedReactiveIntensity,
              6.643856
            );
            const beatStrength =
              beatResponse.intensity * responseDepth;
            const beatRadiusScale = beatReactive.affectsSize
              ? 1 + beatStrength * 0.6
              : 1;
            const beatOpacityMultiplier = beatReactive.affectsOpacity
              ? 1 - responseDepth * (1 - beatResponse.flash)
              : 1;
            const baseCenterX = field.x * width;
            const baseCenterY = field.y * height;
            const radiusScale = 1 + blurStrength * 0.9;
            const baseRadiusX = Math.max(1, field.radiusX * width * radiusScale);
            const baseRadiusY = Math.max(1, field.radiusY * height * radiusScale);
            const coreStop = Math.max(0.08, 0.22 - blurStrength * 0.08);
            const midStop = Math.min(0.9, 0.45 + blurStrength * 0.16);
            const outerStop = Math.min(0.98, 0.78 + blurStrength * 0.14);
            const motionStrength = motionAmount * motionAmount;
            const driftXAmplitude =
              width * (0.035 + Math.min(0.12, field.radiusX * 0.04)) * motionStrength;
            const driftYAmplitude =
              height * (0.03 + Math.min(0.1, field.radiusY * 0.04)) * motionStrength;
            const driftX =
              Math.sin(renderedAnimationTime * (0.18 + index * 0.025) + seed) * driftXAmplitude +
              Math.sin(renderedAnimationTime * (0.34 + index * 0.018) + seed * 1.7) * driftXAmplitude * 0.65;
            const driftY =
              Math.cos(renderedAnimationTime * (0.16 + index * 0.02) + seed * 1.2) * driftYAmplitude +
              Math.sin(renderedAnimationTime * (0.29 + index * 0.022) + seed * 2.1) * driftYAmplitude * 0.52;
            const scaleXWave =
              (Math.sin(renderedAnimationTime * (0.22 + index * 0.02) + seed * 0.8) * 0.2 +
                Math.cos(renderedAnimationTime * (0.41 + index * 0.015) + seed * 1.5) * 0.08) *
              motionStrength;
            const scaleYWave =
              (Math.cos(renderedAnimationTime * (0.2 + index * 0.018) + seed * 1.1) * 0.18 +
                Math.sin(renderedAnimationTime * (0.37 + index * 0.02) + seed * 1.8) * 0.07) *
              motionStrength;
            const animatedRadiusX = Math.max(
              1,
              baseRadiusX * (1 + scaleXWave) * beatRadiusScale
            );
            const animatedRadiusY = Math.max(
              1,
              baseRadiusY * (1 + scaleYWave) * beatRadiusScale
            );
            const animatedRotation =
              field.rotation +
              Math.sin(renderedAnimationTime * (0.14 + index * 0.012) + seed * 0.9) * 18 * motionStrength +
              Math.cos(renderedAnimationTime * (0.27 + index * 0.01) + seed * 1.3) * 7 * motionStrength;
            const opacityWave =
              1 +
              Math.sin(renderedAnimationTime * (0.24 + index * 0.02) + seed * 1.4) * 0.14 * motionStrength +
              Math.cos(renderedAnimationTime * (0.33 + index * 0.018) + seed * 0.6) * 0.08 * motionStrength;
            const baseCoreOpacity = clamp(
              (palette.fieldOpacities[index] ?? field.opacity) *
                (1 - blurStrength * 0.06) *
                opacityWave,
              0,
              1
            );
            const baseMidOpacity = clamp(
              (palette.fieldOpacities[index] ?? field.opacity) *
                (0.72 - blurStrength * 0.12) *
                opacityWave,
              0,
              1
            );
            const baseOuterOpacity = clamp(
              (palette.fieldOpacities[index] ?? field.opacity) *
                (0.2 - blurStrength * 0.08) *
                opacityWave,
              0,
              1
            );
            const coreOpacity = baseCoreOpacity * beatOpacityMultiplier;
            const midOpacity = baseMidOpacity * beatOpacityMultiplier;
            const outerOpacity = baseOuterOpacity * beatOpacityMultiplier;

            return (
              <Circle
                key={`${lyricText.id}-${index}`}
                x={baseCenterX + driftX}
                y={baseCenterY + driftY}
                radius={1}
                scaleX={animatedRadiusX}
                scaleY={animatedRadiusY}
                rotation={animatedRotation}
                listening={false}
                globalCompositeOperation={
                  lightSettings.blendMode === "normal"
                    ? "source-over"
                    : lightSettings.blendMode
                }
                fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndRadius={1}
                fillRadialGradientColorStops={[
                  0,
                  toRgbaString(palette.fieldColors[index], coreOpacity),
                  coreStop,
                  toRgbaString(palette.fieldColors[index], coreOpacity),
                  midStop,
                  toRgbaString(palette.fieldColors[index], midOpacity),
                  outerStop,
                  toRgbaString(
                    palette.fieldColors[index],
                    Math.max(0, outerOpacity)
                  ),
                  1,
                  toRgbaString(palette.fieldColors[index], 0),
                ]}
              />
            );
          })}
        </PreviewSceneLayer>
      </Stage>
    </View>
  );
}
