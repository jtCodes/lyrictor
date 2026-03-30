import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Layer } from "react-konva";
import { Howler } from "howler";
import { useAudioPlayer } from "react-use-audio-player";
import { useProjectStore } from "../../Project/store";
import { getCurrentParticles } from "../utils";
import { LyricText } from "../types";
import { normalizeParticleSettings } from "./store";

interface ParticlesProps {
  width: number;
  height: number;
  position: number;
  lyricText?: LyricText;
}

function seededValue(seed: number) {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

export default function Particles({
  width,
  height,
  position,
  lyricText,
}: ParticlesProps) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const activeParticleItem = useMemo(
    () => lyricText ?? getCurrentParticles(lyricTexts, position),
    [lyricText, lyricTexts, position]
  );
  const settings = useMemo(
    () => normalizeParticleSettings(activeParticleItem?.particleSettings),
    [activeParticleItem?.particleSettings]
  );

  const { playing } = useAudioPlayer();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | undefined>(undefined);
  const animationRef = useRef<number | null>(null);
  const [beatIntensity, setBeatIntensity] = useState(0);

  useEffect(() => {
    if (!activeParticleItem || settings.beatReactiveIntensity <= 0 || !playing) {
      setBeatIntensity(0);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
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

    const animate = () => {
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;

      if (!analyser || !dataArray) {
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.slice(0, 12).reduce((sum, value) => sum + value, 0) / 12;
      setBeatIntensity(Math.min(1, average / 255));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [activeParticleItem, playing, settings.beatReactiveIntensity]);

  const particles = useMemo(() => {
    if (!activeParticleItem) {
      return [];
    }

    const count = Math.max(1, Math.round(settings.count));
    const motionSpeed = Math.max(0, settings.speed);
    const sparkleSpeed = Math.max(0, settings.sparkleSpeed);
    const isStaticMotion = motionSpeed <= 0.0005;
    const beatBoost = 1 + beatIntensity * settings.beatReactiveIntensity * 1.35;
    const red = settings.color.r;
    const green = settings.color.g;
    const blue = settings.color.b;
    const baseAlpha = settings.color.a ?? 1;
    const vectorX = settings.travelVectorX;
    const vectorY = settings.travelVectorY;
    const vectorMagnitude = Math.min(
      1,
      Math.sqrt(vectorX * vectorX + vectorY * vectorY)
    );
    const directionalStrength = Math.max(0, Math.min(1, vectorMagnitude));
    const isNeutralMotion = directionalStrength < 0.02 || isStaticMotion;
    const normalizedMagnitude = Math.max(vectorMagnitude, 0.0001);
    const directionX = isNeutralMotion ? 0 : vectorX / normalizedMagnitude;
    const directionY = isNeutralMotion ? 0 : vectorY / normalizedMagnitude;
    const perpendicularX = -directionY;
    const perpendicularY = directionX;
    const frameSpan = Math.sqrt(width * width + height * height);
    const maxTravelDistance = frameSpan * (0.45 + motionSpeed * 1.1);
    const travelDistance = maxTravelDistance * directionalStrength;
    const centerX = width / 2;
    const centerY = height / 2;

    return Array.from({ length: count }, (_, index) => {
      const xSeed = seededValue(index * 11.13 + activeParticleItem.id * 0.17);
      const ySeed = seededValue(index * 7.31 + activeParticleItem.id * 0.43);
      const sizeSeed = seededValue(index * 5.87 + activeParticleItem.id * 0.29);
      const driftSeed = seededValue(index * 3.11 + activeParticleItem.id * 0.61);
      const twinkleSeed = seededValue(index * 13.91 + activeParticleItem.id * 0.09);
      const motionPhase = position * motionSpeed * (0.65 + driftSeed * 0.9);
      const sparklePhase =
        position * (3 + sparkleSpeed * 42) * (1 + driftSeed * 2.8);

      const cycle = (position * motionSpeed * 0.45 + ySeed * 3.5) % 1;
      const progress = 1 - cycle;
      const driftAmount =
        Math.sin(
          position * motionSpeed * (0.7 + driftSeed * 1.1) +
            driftSeed * Math.PI * 2
        ) *
        settings.spread * frameSpan * 0.08;
      const laneOffset = (xSeed - 0.5) * settings.spread * frameSpan * 0.75;
      const anchorOffset = (ySeed - 0.5) * travelDistance * 0.1;
      const startDistance = -maxTravelDistance * 0.5;
      const endDistance = startDistance + travelDistance;
      const neutralAnchorX = xSeed * width;
      const neutralAnchorY = ySeed * height;
      const neutralPulse = Math.sin(
        motionPhase + driftSeed * Math.PI * 2
      );
      const sparklePulse =
        0.5 + 0.5 * Math.sin(sparklePhase + twinkleSeed * Math.PI * 2);
      const breathingPulse =
        0.5 +
        0.5 *
          Math.sin(
            position * (0.5 + sparkleSpeed * 3.5) * (0.85 + driftSeed * 0.8) +
              twinkleSeed * Math.PI * 2
          );
      const flickerPulse = Math.pow(
        0.5 +
          0.5 *
            Math.sin(
              sparklePhase * 2.4 + twinkleSeed * Math.PI * 4 + driftSeed * 3.7
            ),
        0.18
      );
      const sparkleOpacityFactor =
        settings.animationMode === "steady"
          ? 1
          : settings.animationMode === "flicker"
          ? 0.02 + flickerPulse * 0.98
          : settings.animationMode === "pulse"
          ? 0.12 + breathingPulse * 0.88
          : 0.03 + sparklePulse * 0.97;
      const neutralDriftRadius = (0.02 + settings.spread * 0.08) * frameSpan;
      const neutralX = isStaticMotion
        ? neutralAnchorX
        : neutralAnchorX +
          Math.cos(twinkleSeed * Math.PI * 2) * neutralPulse * neutralDriftRadius;
      const neutralY = isStaticMotion
        ? neutralAnchorY
        : neutralAnchorY +
          Math.sin(twinkleSeed * Math.PI * 2) * neutralPulse * neutralDriftRadius;
      const distanceAlongDirection =
        startDistance + (endDistance - startDistance) * progress + anchorOffset;
      const directionalX =
        centerX +
        directionX * distanceAlongDirection +
        perpendicularX * (laneOffset + driftAmount);
      const directionalY =
        centerY +
        directionY * distanceAlongDirection +
        perpendicularY * (laneOffset + driftAmount);
      const x = isNeutralMotion ? neutralX : directionalX;
      const y = isNeutralMotion ? neutralY : directionalY;
      const radius = Math.max(
        0.5,
        width *
          settings.size *
          (0.45 + sizeSeed * 0.95) *
          beatBoost *
          (isNeutralMotion && !isStaticMotion
            ? 0.85 + Math.abs(neutralPulse) * 0.35
            : 1)
      );
      const opacity = Math.min(
        1,
        settings.opacity *
          sparkleOpacityFactor *
          (1 + beatIntensity * settings.beatReactiveIntensity * 0.45) *
          (isNeutralMotion && !isStaticMotion
            ? 0.78 + Math.abs(neutralPulse) * 0.4
            : 1)
      );

      return {
        id: `${activeParticleItem.id}-${index}`,
        x,
        y,
        radius,
        fill: `rgba(${red}, ${green}, ${blue}, ${baseAlpha * opacity})`,
      };
    });
  }, [activeParticleItem, beatIntensity, height, position, settings, width]);

  if (!activeParticleItem || particles.length === 0) {
    return null;
  }

  return (
    <Layer listening={false}>
      {particles.map((particle) => (
        <Circle
          key={particle.id}
          x={particle.x}
          y={particle.y}
          radius={particle.radius}
          fill={particle.fill}
        />
      ))}
    </Layer>
  );
}
