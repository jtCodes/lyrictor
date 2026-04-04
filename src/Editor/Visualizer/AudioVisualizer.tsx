import React, { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Circle, Rect } from "react-konva";
import { useAudioPlayer } from "react-use-audio-player";
import { Howler } from "howler";
import { useProjectStore } from "../../Project/store";
import { getCurrentVisualizer } from "../utils";
import { LyricText } from "../types";
import {
  AuroraShape,
  colorStopToArray,
  normalizeVisualizerSetting,
} from "./store";

const VISUALIZER_REACTIVITY_GAIN = 1.65;
const VISUALIZER_REACTIVITY_CURVE = 0.72;
const VISUALIZER_RADIUS_BOOST = 90;
const GLOBAL_AUDIO_REACTIVE_FOCUS_NEUTRAL = 0.5;

function getFocusedBeatIntensity(dataArray: Uint8Array, focus: number) {
  if (dataArray.length === 0) {
    return 0;
  }

  const clampedFocus = Math.max(0, Math.min(1, focus));
  const centerIndex = clampedFocus * (dataArray.length - 1);
  const spread = Math.max(3, dataArray.length * 0.18);

  let weightedSum = 0;
  let totalWeight = 0;

  for (let index = 0; index < dataArray.length; index += 1) {
    const distance = Math.abs(index - centerIndex);
    const weight = Math.max(0, 1 - distance / spread);

    if (weight === 0) {
      continue;
    }

    weightedSum += dataArray[index] * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function getAmplifiedReactiveIntensity(beatIntensity: number) {
  const normalizedIntensity = Math.max(0, Math.min(1, beatIntensity / 255));
  return Math.max(
    0,
    Math.min(
      1,
      Math.pow(normalizedIntensity, VISUALIZER_REACTIVITY_CURVE) *
        VISUALIZER_REACTIVITY_GAIN
    )
  );
}

function applyReactiveThreshold(intensity: number, threshold: number) {
  const clampedThreshold = clamp(threshold, 0, 0.95);

  if (intensity <= clampedThreshold) {
    return 0;
  }

  return clamp(
    (intensity - clampedThreshold) / (1 - clampedThreshold),
    0,
    1
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function toRgbaString(
  color: { r: number; g: number; b: number; a?: number },
  opacityMultiplier: number = 1
) {
  const alpha = clamp((color.a ?? 1) * opacityMultiplier, 0, 1);
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function getEffectiveAudioFocus(stopFocus: number, globalFocus: number) {
  return clamp(
    stopFocus + (globalFocus - GLOBAL_AUDIO_REACTIVE_FOCUS_NEUTRAL),
    0,
    1
  );
}

function getAuroraShapeProfile(shape: AuroraShape) {
  if (shape === "beam") {
    return {
      lengthScale: 1.18,
      thicknessScale: 0.72,
      bandSpread: 0.06,
      haloScaleX: 1.52,
      haloScaleY: 1.8,
      drift: 0.55,
    };
  }

  if (shape === "bloom") {
    return {
      lengthScale: 0.7,
      thicknessScale: 1.22,
      bandSpread: 0.2,
      haloScaleX: 1.32,
      haloScaleY: 1.46,
      drift: 0.38,
    };
  }

  return {
    lengthScale: 0.96,
    thicknessScale: 0.92,
    bandSpread: 0.14,
    haloScaleX: 1.42,
    haloScaleY: 1.62,
    drift: 0.48,
  };
}

interface MusicVisualizerProps {
  width: number;
  height: number;
  variant: "circle" | "vignette";
  position: number;
  lyricText?: LyricText;
  disableAnimation?: boolean;
}

const MusicVisualizer: React.FC<MusicVisualizerProps> = ({
  width,
  height,
  variant,
  position,
  lyricText,
  disableAnimation = false,
}) => {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const editingProject = useProjectStore((state) => state.editingProject);

  const [circleRadius, setCircleRadius] = useState<number>(10);
  const [vignetteIntensity, setVignetteIntensity] = useState<number>(0); // Adjusted to intensity for clarity
  const animationRef = useRef<number>(null);
  const { playing } = useAudioPlayer();
  const analyserRef = useRef<AnalyserNode>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | undefined>(undefined);
  const focusedBeatIntensitiesRef = useRef<number[]>([]);
  const animationTimeRef = useRef(0);

  const currentVisualizerSetting = useMemo(() => {
    if (lyricText?.visualizerSettings) {
      return lyricText;
    }

    return getCurrentVisualizer(lyricTexts, position);
  }, [lyricText, lyricTexts, position]);

  const initAnalyser = () => {
    if (!Howler.ctx || analyserRef.current) return;

    analyserRef.current = Howler.ctx.createAnalyser();
    Howler.masterGain.connect(analyserRef.current);
    analyserRef.current.fftSize = 64;
    const bufferLength = analyserRef.current.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);
  };

  const animate = () => {
    if (!analyserRef.current || !dataArrayRef.current) {
      return;
    }

    animationTimeRef.current = performance.now() * 0.001;
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    const visualizerSettings = normalizeVisualizerSetting(
      currentVisualizerSetting?.visualizerSettings
    );
    const focusedBeatIntensities = visualizerSettings.fillRadialGradientColorStops.map(
      (colorStop) =>
        getFocusedBeatIntensity(
          dataArrayRef.current!,
          getEffectiveAudioFocus(
            colorStop.audioReactiveFocus,
            visualizerSettings.globalAudioReactiveFocus
          )
        )
    );
    const amplifiedBeatIntensities = focusedBeatIntensities.map(
      getAmplifiedReactiveIntensity
    );
    focusedBeatIntensitiesRef.current = amplifiedBeatIntensities;
    const beatIntensity =
      focusedBeatIntensities.length > 0
        ? amplifiedBeatIntensities.reduce((sum, value) => sum + value, 0) /
          amplifiedBeatIntensities.length
        : 0;
    const newRadius = Math.max(50, 50 + beatIntensity * VISUALIZER_RADIUS_BOOST);
    const newIntensity = beatIntensity;

    setCircleRadius(newRadius);
    setVignetteIntensity(newIntensity);
    animationRef.current = requestAnimationFrame(animate);
  };

  const effectiveVignetteIntensity = disableAnimation
    ? 0.65
    : playing
    ? vignetteIntensity
    : 0.65;

  useEffect(() => {
    if (disableAnimation) {
      setCircleRadius(50);
      setVignetteIntensity(0.65);
      return;
    }

    if (playing) {
      initAnalyser();
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [disableAnimation, playing]); // Re-run if playing state changes

  //   if (!playing) {
  //     return null;
  //   }

  if (currentVisualizerSetting?.visualizerSettings) {
    const visualizerSettings = normalizeVisualizerSetting(
      currentVisualizerSetting.visualizerSettings
    );
    const stopReactiveIntensities = visualizerSettings.fillRadialGradientColorStops.map(
      (_, index) =>
        disableAnimation
          ? 0.82
          : playing
          ? focusedBeatIntensitiesRef.current[index] ?? effectiveVignetteIntensity
          : 0.72
    );

    if (visualizerSettings.mode === "aurora") {
      const bandCount = Math.max(1, visualizerSettings.fillRadialGradientColorStops.length);
      const bandCenterIndex = (bandCount - 1) / 2;

      return (
        <Layer>
          {visualizerSettings.fillRadialGradientColorStops.map((colorStop, index) => {
            const shapeProfile = getAuroraShapeProfile(colorStop.auroraShape);
            const rotationInRadians = toRadians(colorStop.auroraRotation);
            const directionX = Math.cos(rotationInRadians);
            const directionY = Math.sin(rotationInRadians);
            const normalX = -directionY;
            const normalY = directionX;
            const baseX = width * colorStop.x;
            const baseY = height * colorStop.y;
            const span = Math.max(
              width * 0.22,
              width * colorStop.auroraWidth * shapeProfile.lengthScale
            );
            const thickness = Math.max(
              height * 0.08,
              height * colorStop.auroraHeight * shapeProfile.thicknessScale
            );
            const reactiveIntensity = applyReactiveThreshold(
              stopReactiveIntensities[index] ?? effectiveVignetteIntensity,
              colorStop.auroraReactiveThreshold
            );
            const beatSyncIntensity = Math.max(0, colorStop.beatSyncIntensity);
            const expansionGain = 1 + reactiveIntensity * colorStop.auroraExpansionAmount;
            const glowGain = 0.48 + colorStop.auroraGlowIntensity * 0.56;
            const contrastGain = 0.64 + colorStop.auroraContrast * 0.46;
            const shapeExpansionBias =
              colorStop.auroraShape === "beam"
                ? 0.28
                : colorStop.auroraShape === "bloom"
                ? -0.08
                : 0.12;
            const shapeThicknessBias =
              colorStop.auroraShape === "beam"
                ? 0.06
                : colorStop.auroraShape === "bloom"
                ? 0.28
                : 0.16;
            const bandOffset = colorStop.stop - 0.5;
            const travelDistance = bandOffset * span * 0.94;
            const crossAxisOffset =
              (index - bandCenterIndex) * thickness * shapeProfile.bandSpread;
            const motionAmount = disableAnimation
              ? 0
              : colorStop.auroraMotionAmount;
            const seed = currentVisualizerSetting.id * 0.237 + (index + 1) * 2.173;
            const swayPrimary =
              Math.sin(animationTimeRef.current * (0.64 + index * 0.08) + seed) *
              thickness *
              0.12 *
              shapeProfile.drift *
              motionAmount;
            const swaySecondary =
              Math.cos(animationTimeRef.current * (0.42 + index * 0.05) + seed * 1.7) *
              thickness *
              0.08 *
              shapeProfile.drift *
              motionAmount;
            const centerX =
              baseX +
              directionX * travelDistance +
              normalX * (crossAxisOffset + swayPrimary) +
              directionX * swaySecondary;
            const centerY =
              baseY +
              directionY * travelDistance +
              normalY * (crossAxisOffset + swayPrimary) +
              directionY * swaySecondary;
            const coreScaleX =
              span *
              (0.16 + glowGain * 0.1) *
              (0.64 + expansionGain * (0.34 + shapeExpansionBias));
            const coreScaleY =
              thickness *
              (0.24 + contrastGain * 0.09) *
              (0.44 + expansionGain * (0.34 + shapeThicknessBias + beatSyncIntensity * 0.22));
            const haloScaleX = coreScaleX * (shapeProfile.haloScaleX + expansionGain * 0.08);
            const haloScaleY = coreScaleY * (shapeProfile.haloScaleY + expansionGain * 0.14);
            const haloOpacity = clamp(
              (0.02 + colorStop.auroraGlowIntensity * 0.14) *
                Math.pow(reactiveIntensity, 0.72) *
                (0.7 + colorStop.auroraExpansionAmount * 0.18),
              0,
              1
            );
            const coreOpacity = clamp(
              (0.03 + colorStop.auroraGlowIntensity * 0.1) *
                (0.62 + colorStop.auroraContrast * 0.42) *
                Math.pow(reactiveIntensity, 0.82) *
                (0.9 + beatSyncIntensity * 0.34),
              0,
              1
            );
            const highlightOpacity = clamp(
              coreOpacity * (0.9 + colorStop.auroraContrast * 0.18),
              0,
              1
            );

            return (
              <React.Fragment key={`${currentVisualizerSetting.id}-${index}`}>
                <Circle
                  x={centerX}
                  y={centerY}
                  radius={1}
                  scaleX={haloScaleX}
                  scaleY={haloScaleY}
                  rotation={colorStop.auroraRotation}
                  listening={false}
                  fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                  fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                  fillRadialGradientStartRadius={0}
                  fillRadialGradientEndRadius={1}
                  fillRadialGradientColorStops={[
                    0,
                    toRgbaString(colorStop.color, haloOpacity),
                    0.28,
                    toRgbaString(colorStop.color, haloOpacity * 0.78),
                    0.7,
                    toRgbaString(colorStop.color, haloOpacity * 0.24),
                    1,
                    toRgbaString(colorStop.color, 0),
                  ]}
                />
                <Circle
                  x={centerX}
                  y={centerY}
                  radius={1}
                  scaleX={coreScaleX}
                  scaleY={coreScaleY}
                  rotation={colorStop.auroraRotation}
                  listening={false}
                  fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                  fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                  fillRadialGradientStartRadius={0}
                  fillRadialGradientEndRadius={1}
                  fillRadialGradientColorStops={[
                    0,
                    toRgbaString(colorStop.color, highlightOpacity),
                    0.16,
                    toRgbaString(colorStop.color, coreOpacity),
                    0.45,
                    toRgbaString(colorStop.color, coreOpacity * 0.68),
                    0.84,
                    toRgbaString(colorStop.color, coreOpacity * 0.08),
                    1,
                    toRgbaString(colorStop.color, 0),
                  ]}
                />
              </React.Fragment>
            );
          })}
        </Layer>
      );
    }

    return (
      <Layer>
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fillRadialGradientStartPoint={{ x: width / 2, y: height / 2 }}
          fillRadialGradientEndPoint={{ x: width / 2, y: height / 2 }}
          fillRadialGradientStartRadius={
            visualizerSettings.fillRadialGradientStartRadius.value *
            (height * 0.0025)
          }
          fillRadialGradientEndRadius={Math.max(
            1,
            height *
              visualizerSettings.fillRadialGradientEndRadius.value *
              (visualizerSettings.fillRadialGradientEndRadius.beatSyncIntensity > 0
                ? visualizerSettings.fillRadialGradientEndRadius.beatSyncIntensity *
                  effectiveVignetteIntensity
                : 1)
          )}
          fillRadialGradientColorStops={
            visualizerSettings.fillRadialGradientColorStops
              ? colorStopToArray(
                  visualizerSettings.fillRadialGradientColorStops,
                  stopReactiveIntensities
                )
              : []
          }
        />
      </Layer>
    );
  } else {
    return <></>;
  }

  const PRESET = {
    eclipse: (
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillRadialGradientStartPoint={{ x: width / 2, y: height / 2 }}
        fillRadialGradientEndPoint={{ x: width / 2, y: height / 2 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndRadius={(height / 4) * 4}
        fillRadialGradientColorStops={[
          0,
          "rgba(0,0,0,0)",
          0.25,
          `rgba(256,256,256,${vignetteIntensity})`,
          0.76,
          `rgba(90,0,0,${vignetteIntensity * 0.6})`,
          1,
          `rgba(48,0,0,${vignetteIntensity})`,
        ]}
      />
    ),
    magnetic: (
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillRadialGradientStartPoint={{ x: width / 2, y: height / 2 }}
        fillRadialGradientEndPoint={{ x: width / 2, y: height / 2 }}
        fillRadialGradientStartRadius={width * 2}
        fillRadialGradientEndRadius={(height / 2) * vignetteIntensity}
        fillRadialGradientColorStops={[
          0.2,
          `rgba(201,23,23, 1)`, // Red
          0.3,
          `rgba(255,165,203, 0.8)`, // Orange
          0.5,
          `rgba(200,65,165, ${vignetteIntensity * 0.6})`, // Orange
          1,
          `rgba(238,130,238, ${vignetteIntensity + 0.2})`, // Violet
        ]}
      />
    ),
    abc: (
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillRadialGradientStartPoint={{ x: width / 2, y: height / 2 }}
        fillRadialGradientEndPoint={{ x: width / 2, y: height / 2 }}
        fillRadialGradientStartRadius={width * 2}
        fillRadialGradientEndRadius={height / 2}
        fillRadialGradientColorStops={[
          0,
          `rgba(201,23,23, 0.8)`, // Red
          0.3,
          `rgba(255,165,23, 0.8)`, // Orange
          0.5,
          `rgba(0,165,165, ${vignetteIntensity})`, // Orange
          1,
          `rgba(238,130,238, 0.8)`, // Violet
        ]}
      />
    ),
  };

  return (
    <Layer>
      {variant === "circle" && (
        <Circle x={0} y={0} radius={circleRadius} fill="red" />
      )}

      {variant === "vignette" && (
        // <Rect
        //   x={0}
        //   y={0}
        //   width={width}
        //   height={height}
        //   fillRadialGradientStartPoint={{ x: width / 2, y: height / 2 }}
        //   fillRadialGradientEndPoint={{ x: width / 2, y: height / 2 }}
        //   fillRadialGradientStartRadius={width / 4 * vignetteIntensity}
        //   fillRadialGradientEndRadius={
        //    (height / 4)
        //   } // Ensuring the gradient covers the corners
        //   fillRadialGradientColorStops={[
        //     0,
        //     "rgba(0,0,0,0)",
        //     0,
        //     "rgba(0,0,0,0)",
        //     1,
        //     `rgba(151,0,0, ${vignetteIntensity})`,
        //   ]}
        // />
        <>
          {editingProject?.name.includes("(Demo) Invent Animate - Dark")
            ? PRESET.eclipse
            : PRESET.magnetic}
        </>
      )}
    </Layer>
  );
};

// sun like
/**
 *    <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fillRadialGradientStartPoint={{ x: width / 2, y: height / 2 }}
          fillRadialGradientEndPoint={{ x: width / 2, y: height / 2 }}
          fillRadialGradientStartRadius={width / 4 * vignetteIntensity}
          fillRadialGradientEndRadius={
           (height / 4) * vignetteIntensity
          } // Ensuring the gradient covers the corners
          fillRadialGradientColorStops={[
            0,
            "rgba(0,0,0,0)", // Starting with transparent red at the center
            1,
            `rgba(151,0,0, ${vignetteIntensity})`, // Transitioning to opaque red at the edges
          ]}
        />
 */

export default MusicVisualizer;
