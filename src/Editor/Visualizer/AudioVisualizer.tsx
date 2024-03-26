import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Circle } from "react-konva";
import { useAudioPlayer } from "react-use-audio-player";
import { Howler } from "howler";

const MusicVisualizer: React.FC = () => {
  const [circleRadius, setCircleRadius] = useState<number>(50);
  const animationRef = useRef<number>();
  const { playing } = useAudioPlayer();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();

  const initAnalyser = () => {
    if (!Howler.ctx || analyserRef.current) return;

    analyserRef.current = Howler.ctx.createAnalyser();
    Howler.masterGain.connect(analyserRef.current);
    analyserRef.current.fftSize = 256;
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
    setCircleRadius(newRadius);
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (playing) {
      initAnalyser();
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animationRef.current!);
      // Consider resetting analyserRef.current and its connection here if needed
    };
  }, [playing]); // Re-run if playing state changes

  return (
    <Layer>
      <Circle
        x={window.innerWidth / 2}
        y={window.innerHeight / 2}
        radius={circleRadius}
        fill="red"
      />
    </Layer>
  );
};

export default MusicVisualizer;
