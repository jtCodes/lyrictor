import { Howler } from "howler";
import { useEffect, useRef, useState } from "react";

export default function TinySoundMeter({
  playing,
  scale = 1,
  fillWidth = false,
}: {
  playing: boolean;
  scale?: number;
  fillWidth?: boolean;
}) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSampleTimeRef = useRef(0);
  const smoothedBarsRef = useRef<number[]>(Array.from({ length: 8 }, () => 0.16));
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 8 }, () => 0.16));

  useEffect(() => {
    if (!playing) {
      smoothedBarsRef.current = Array.from({ length: 8 }, () => 0.16);
      setBars(smoothedBarsRef.current);

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    if (!Howler.ctx) {
      return;
    }

    if (!analyserRef.current) {
      analyserRef.current = Howler.ctx.createAnalyser();
      Howler.masterGain.connect(analyserRef.current);
      analyserRef.current.fftSize = 64;
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    }

    const tick = (now: number) => {
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;

      if (!analyser || !dataArray) {
        return;
      }

      if (now - lastSampleTimeRef.current >= 42) {
        lastSampleTimeRef.current = now;
        analyser.getByteFrequencyData(dataArray);

        const nextBars = smoothedBarsRef.current.map((previousValue, index) => {
          const startIndex = index * 2;
          const endIndex = startIndex + 2;
          const slice = dataArray.slice(startIndex, endIndex);
          const average = slice.reduce((sum, value) => sum + value, 0) / slice.length;
          const normalized = Math.max(0.06, Math.min(0.72, (average / 255) * 0.58));
          return previousValue * 0.78 + normalized * 0.22;
        });

        smoothedBarsRef.current = nextBars;
        setBars(nextBars);
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [playing]);

  const meterScale = Math.max(0.5, scale);
  const gap = Math.max(1, Math.round(2 * meterScale));
  const meterWidth = Math.round(26 * meterScale);
  const meterHeight = Math.round(14 * meterScale);
  const barWidth = Math.max(1, Math.round(2 * meterScale));
  const minimumBarHeight = Math.max(2, Math.round(3 * meterScale));

  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: fillWidth ? "space-between" : "flex-start",
        gap,
        width: fillWidth ? "100%" : meterWidth,
        height: meterHeight,
        opacity: 0.8,
      }}
    >
      {bars.map((value, index) => (
        <div
          key={index}
          style={{
            width: barWidth,
            flex: fillWidth ? "0 0 auto" : undefined,
            height: `${Math.max(minimumBarHeight, Math.round(value * meterHeight))}px`,
            borderRadius: 999,
            background:
              value > 0.72
                ? "rgba(255, 255, 255, 0.95)"
                : value > 0.42
                  ? "rgba(255, 255, 255, 0.82)"
                  : "rgba(255, 255, 255, 0.45)",
            transition: "height 80ms linear, background-color 80ms linear",
          }}
        />
      ))}
    </div>
  );
}