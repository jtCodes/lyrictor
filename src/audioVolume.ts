import { Howler } from "howler";
import { useSyncExternalStore } from "react";

type VolumeListener = () => void;

const listeners = new Set<VolumeListener>();
let volumeSnapshot = normalizeVolume(Howler.volume());

function normalizeVolume(volume: number) {
  if (!Number.isFinite(volume)) {
    return 1;
  }

  return Math.min(1, Math.max(0, volume));
}

function subscribe(listener: VolumeListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return volumeSnapshot;
}

export function setGlobalAudioVolume(volume: number) {
  const nextVolume = normalizeVolume(volume);

  if (nextVolume === volumeSnapshot) {
    return;
  }

  volumeSnapshot = nextVolume;
  Howler.volume(nextVolume);
  listeners.forEach((listener) => listener());
}

export function useGlobalAudioVolume() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
