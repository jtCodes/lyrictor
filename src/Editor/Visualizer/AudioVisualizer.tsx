import React, { useEffect, useRef, useState } from "react";
import { Layer, Circle, Rect } from "react-konva";
import { useAudioPlayer } from "react-use-audio-player";
import { Howler } from "howler";
import { useProjectStore } from "../../Project/store";

interface MusicVisualizerProps {
  width: number;
  height: number;
  variant: "circle" | "vignette";
}

const MusicVisualizer: React.FC<MusicVisualizerProps> = ({
  width,
  height,
  variant,
}) => {
  const editingProject = useProjectStore((state) => state.editingProject);

  const [circleRadius, setCircleRadius] = useState<number>(10);
  const [vignetteIntensity, setVignetteIntensity] = useState<number>(0); // Adjusted to intensity for clarity
  const animationRef = useRef<number>();
  const { playing } = useAudioPlayer();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();

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
    const beatIntensity =
      dataArrayRef.current.slice(0, 10).reduce((acc, val) => acc + val, 0) / 10;
    const newRadius = Math.max(50, beatIntensity); // Map beat intensity to circle radius
    // Amplify the intensity for a more pronounced effect and ensure a higher base opacity
    const newIntensity = Math.min(1, beatIntensity / 256);

    setCircleRadius(newRadius);
    setVignetteIntensity(newIntensity);
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (playing) {
      initAnalyser();
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animationRef.current!);
    };
  }, [playing]); // Re-run if playing state changes

  //   if (!playing) {
  //     return null;
  //   }

  const PRESET = {
    eclipse: (
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillRadialGradientStartPoint={{ x: width / 2, y: height / 2 }}
        fillRadialGradientEndPoint={{ x: width / 2, y: height / 2 }}
        fillRadialGradientStartRadius={0} // Dynamic inner "moon" radius based on intensity
        fillRadialGradientEndRadius={(height / 4) * 4} // Static outer "corona" radius
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
        fillRadialGradientStartRadius={width * 2 * vignetteIntensity}
        fillRadialGradientEndRadius={(height / 2) * vignetteIntensity}
        fillRadialGradientColorStops={[
          0.2,
          `rgba(201,23,23, 1)`, // Red
          0.3,
          `rgba(255,165,23, 0.8)`, // Orange
          0.6,
          `rgba(0,165,165, ${vignetteIntensity * 0.6})`, // Orange
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
            : PRESET.abc}
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
