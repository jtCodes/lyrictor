import React, { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Circle, Rect } from "react-konva";
import { useAudioPlayer } from "react-use-audio-player";
import { Howler } from "howler";
import { useProjectStore } from "../../Project/store";
import { getCurrentVisualizer } from "../utils";
import { LyricText } from "../types";
import { colorStopToArray, normalizeVisualizerSetting } from "./store";

const VISUALIZER_REACTIVITY_GAIN = 1.65;
const VISUALIZER_REACTIVITY_CURVE = 0.72;
const VISUALIZER_RADIUS_BOOST = 90;

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
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    const visualizerSettings = normalizeVisualizerSetting(
      currentVisualizerSetting?.visualizerSettings
    );
    const focusedBeatIntensities = visualizerSettings.fillRadialGradientColorStops.map(
      (colorStop) =>
        getFocusedBeatIntensity(dataArrayRef.current!, colorStop.audioReactiveFocus)
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
                  focusedBeatIntensitiesRef.current.map((intensity) =>
                    disableAnimation ? 0.65 : playing ? intensity : 0.65
                  )
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
