import { View } from "@adobe/react-spectrum";
import { Circle, Layer, Rect, Stage } from "react-konva";
import { RGBColor } from "react-color";
import { LyricText } from "../types";
import { normalizeLightSettings } from "./store";

function toRgbaString(color: RGBColor, opacityMultiplier: number = 1) {
  const alpha = Math.max(0, Math.min(1, (color.a ?? 1) * opacityMultiplier));
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

export default function LightPreviewSurface({
  width,
  height,
  lyricText,
  opacity,
}: {
  width: number;
  height: number;
  lyricText: LyricText;
  opacity: number;
}) {
  const lightSettings = normalizeLightSettings(lyricText.lightSettings);
  const blurStrength = Math.max(0, Math.min(1, lightSettings.blur));

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
            const centerX = field.x * width;
            const centerY = field.y * height;
            const radiusScale = 1 + blurStrength * 0.9;
            const radiusX = Math.max(1, field.radiusX * width * radiusScale);
            const radiusY = Math.max(1, field.radiusY * height * radiusScale);
            const coreStop = Math.max(0.08, 0.22 - blurStrength * 0.08);
            const midStop = Math.min(0.9, 0.45 + blurStrength * 0.16);
            const outerStop = Math.min(0.98, 0.78 + blurStrength * 0.14);
            const coreOpacity = field.opacity * (1 - blurStrength * 0.06);
            const midOpacity = field.opacity * (0.72 - blurStrength * 0.12);
            const outerOpacity = field.opacity * (0.2 - blurStrength * 0.08);

            return (
              <Circle
                key={`${lyricText.id}-${index}`}
                x={centerX}
                y={centerY}
                radius={1}
                scaleX={radiusX}
                scaleY={radiusY}
                rotation={field.rotation}
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