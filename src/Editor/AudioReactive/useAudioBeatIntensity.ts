import { Howler } from "howler";
import { useCallback, useSyncExternalStore } from "react";

const ANALYSIS_FPS = 30;
const MIN_FOCUS_FREQUENCY = 70;
const MAX_FOCUS_FREQUENCY = 10_000;
const FOCUS_SPREAD_OCTAVES = 1.15;

let analyser: AnalyserNode | undefined;
let frequencyData: Uint8Array<ArrayBuffer> | undefined;
let animationFrame: number | undefined;
let lastAnalysisTime = 0;
let spectrumVersion = 0;
const listeners = new Set<() => void>();

function initializeAnalyser() {
  if (analyser || !Howler.ctx) {
    return;
  }

  analyser = Howler.ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.6;
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  Howler.masterGain.connect(analyser);
}

function analyze(now: number) {
  if (listeners.size === 0) {
    animationFrame = undefined;
    return;
  }

  initializeAnalyser();

  if (
    analyser &&
    frequencyData &&
    now - lastAnalysisTime >= 1000 / ANALYSIS_FPS
  ) {
    analyser.getByteFrequencyData(frequencyData);
    spectrumVersion += 1;
    listeners.forEach((listener) => listener());
    lastAnalysisTime = now;
  }

  animationFrame = window.requestAnimationFrame(analyze);
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (animationFrame === undefined) {
    animationFrame = window.requestAnimationFrame(analyze);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && animationFrame !== undefined) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
      spectrumVersion = 0;
      lastAnalysisTime = 0;
    }
  };
}

function getSpectrumVersion() {
  return spectrumVersion;
}

function getDisabledSpectrumVersion() {
  return 0;
}

function getFocusedBeatIntensity(focus: number) {
  if (!analyser || !frequencyData || frequencyData.length === 0) {
    return 0;
  }

  const clampedFocus = Math.min(1, Math.max(0, focus));
  const nyquistFrequency = analyser.context.sampleRate / 2;
  const maximumFrequency = Math.min(
    MAX_FOCUS_FREQUENCY,
    nyquistFrequency * 0.9
  );
  const centerFrequency =
    MIN_FOCUS_FREQUENCY *
    Math.pow(maximumFrequency / MIN_FOCUS_FREQUENCY, clampedFocus);
  const frequencyPerBin = nyquistFrequency / frequencyData.length;
  let weightedSum = 0;
  let totalWeight = 0;

  for (let index = 1; index < frequencyData.length; index += 1) {
    const frequency = index * frequencyPerBin;
    const octaveDistance = Math.abs(
      Math.log2(frequency / centerFrequency)
    );
    const weight = Math.max(
      0,
      1 - octaveDistance / FOCUS_SPREAD_OCTAVES
    );

    if (weight > 0) {
      weightedSum += frequencyData[index] * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    return 0;
  }

  const normalizedIntensity = weightedSum / totalWeight / 255;
  return Math.min(1, Math.pow(normalizedIntensity, 0.72) * 1.5);
}

export function useAudioBeatIntensityReader(enabled: boolean) {
  const subscribeWhenEnabled = useCallback(
    (listener: () => void) => (enabled ? subscribe(listener) : () => undefined),
    [enabled]
  );

  useSyncExternalStore(
    subscribeWhenEnabled,
    enabled ? getSpectrumVersion : getDisabledSpectrumVersion,
    getDisabledSpectrumVersion
  );

  return useCallback(
    (focus: number) => (enabled ? getFocusedBeatIntensity(focus) : 0),
    [enabled]
  );
}

export function useAudioBeatIntensity(enabled: boolean, focus = 0.15) {
  const readBeatIntensity = useAudioBeatIntensityReader(enabled);
  return readBeatIntensity(focus);
}
