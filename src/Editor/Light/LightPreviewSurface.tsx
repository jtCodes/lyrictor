import { View } from "@adobe/react-spectrum";
import { useEffect, useState } from "react";
import { Circle, Layer, Rect, Stage } from "react-konva";
import { RGBColor } from "react-color";
import { LyricText } from "../types";
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
  opacity,
  disableAnimation = false,
}: {
  width: number;
  height: number;
  lyricText: LyricText;
  opacity: number;
  disableAnimation?: boolean;
}) {
  const lightSettings = normalizeLightSettings(lyricText.lightSettings);
  const blurStrength = Math.max(0, Math.min(1, lightSettings.blur));
  const [animationTime, setAnimationTime] = useState(0);

  useEffect(() => {
    if (disableAnimation) {
      setAnimationTime(0);
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
  }, [disableAnimation]);

  return (
    <View
      position={"absolute"}
      width={width}
      height={height}
      UNSAFE_style={{ pointerEvents: "none", opacity }}
      data-export-non-text-layer="light"
    >
      <Stage width={width} height={height}>
        <Layer>
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={toRgbaString(lightSettings.baseColor, lightSettings.baseOpacity)}
          />
          {lightSettings.fields.map((field, index) => {
            const seed = lyricText.id * 0.173 + (index + 1) * 1.618;
            const motionAmount = clamp(field.motionAmount ?? 0, 0, 1);
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
              Math.sin(animationTime * (0.18 + index * 0.025) + seed) * driftXAmplitude +
              Math.sin(animationTime * (0.34 + index * 0.018) + seed * 1.7) * driftXAmplitude * 0.65;
            const driftY =
              Math.cos(animationTime * (0.16 + index * 0.02) + seed * 1.2) * driftYAmplitude +
              Math.sin(animationTime * (0.29 + index * 0.022) + seed * 2.1) * driftYAmplitude * 0.52;
            const scaleXWave =
              (Math.sin(animationTime * (0.22 + index * 0.02) + seed * 0.8) * 0.2 +
                Math.cos(animationTime * (0.41 + index * 0.015) + seed * 1.5) * 0.08) *
              motionStrength;
            const scaleYWave =
              (Math.cos(animationTime * (0.2 + index * 0.018) + seed * 1.1) * 0.18 +
                Math.sin(animationTime * (0.37 + index * 0.02) + seed * 1.8) * 0.07) *
              motionStrength;
            const animatedRadiusX = Math.max(1, baseRadiusX * (1 + scaleXWave));
            const animatedRadiusY = Math.max(1, baseRadiusY * (1 + scaleYWave));
            const animatedRotation =
              field.rotation +
              Math.sin(animationTime * (0.14 + index * 0.012) + seed * 0.9) * 18 * motionStrength +
              Math.cos(animationTime * (0.27 + index * 0.01) + seed * 1.3) * 7 * motionStrength;
            const opacityWave =
              1 +
              Math.sin(animationTime * (0.24 + index * 0.02) + seed * 1.4) * 0.14 * motionStrength +
              Math.cos(animationTime * (0.33 + index * 0.018) + seed * 0.6) * 0.08 * motionStrength;
            const coreOpacity = clamp(
              field.opacity * (1 - blurStrength * 0.06) * opacityWave,
              0,
              1
            );
            const midOpacity = clamp(
              field.opacity * (0.72 - blurStrength * 0.12) * opacityWave,
              0,
              1
            );
            const outerOpacity = clamp(
              field.opacity * (0.2 - blurStrength * 0.08) * opacityWave,
              0,
              1
            );

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
                fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndRadius={1}
                fillRadialGradientColorStops={[
                  0,
                  toRgbaString(field.color, coreOpacity),
                  coreStop,
                  toRgbaString(field.color, coreOpacity),
                  midStop,
                  toRgbaString(field.color, midOpacity),
                  outerStop,
                  toRgbaString(field.color, Math.max(0, outerOpacity)),
                  1,
                  toRgbaString(field.color, 0),
                ]}
              />
            );
          })}
        </Layer>
      </Stage>
    </View>
  );
}