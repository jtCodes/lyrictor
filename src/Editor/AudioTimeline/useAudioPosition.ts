import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Howler } from "howler";

// ---------------------------------------------------------------------------
// Singleton audio-position store
//
// A single rAF loop (or 1 s interval) polls Howler and writes to a shared
// snapshot. React components subscribe via useSyncExternalStore — React
// decides when & how to batch re-renders, which is faster than per-component
// setState. The loop auto-starts/stops with subscriber count.
// ---------------------------------------------------------------------------

interface Snapshot {
  position: number;
  duration: number;
}

// Two snapshots: high-refresh updates every rAF, low-refresh updates every 1s
let hiSnapshot: Snapshot = { position: 0, duration: 0 };
let loSnapshot: Snapshot = { position: 0, duration: 0 };

const hiSubscribers = new Set<() => void>();
const loSubscribers = new Set<() => void>();

let rafId: number | null = null;
let intervalId: number | null = null;
let highRefreshCount = 0;
let lowRefreshCount = 0;

function getPlayer(): Howl | null {
  const howls = (Howler as any)._howls as Howl[] | undefined;
  return howls && howls.length > 0 ? howls[howls.length - 1] : null;
}

function readPlayer(): Snapshot | null {
  const player = getPlayer();
  if (!player) return null;
  const raw = player.seek();
  const pos = typeof raw === "number" ? raw : 0;
  const dur = player.duration() || hiSnapshot.duration;
  return { position: pos, duration: dur };
}

function pollHigh() {
  const next = readPlayer();
  if (!next) return;
  if (next.position !== hiSnapshot.position || next.duration !== hiSnapshot.duration) {
    hiSnapshot = next;
    hiSubscribers.forEach((cb) => cb());
  }
}

function pollLow() {
  const next = readPlayer();
  if (!next) return;
  if (next.position !== loSnapshot.position || next.duration !== loSnapshot.duration) {
    loSnapshot = next;
    loSubscribers.forEach((cb) => cb());
  }
}

function startHighRefresh() {
  if (rafId !== null) return;
  const loop = () => {
    pollHigh();
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

function stopHighRefresh() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function startLowRefresh() {
  if (intervalId !== null) return;
  intervalId = window.setInterval(pollLow, 1000);
}

function stopLowRefresh() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function subscribeHigh(callback: () => void): () => void {
  hiSubscribers.add(callback);
  highRefreshCount++;
  if (highRefreshCount === 1) startHighRefresh();

  return () => {
    hiSubscribers.delete(callback);
    highRefreshCount--;
    if (highRefreshCount === 0) stopHighRefresh();
  };
}

function subscribeLow(callback: () => void): () => void {
  loSubscribers.add(callback);
  lowRefreshCount++;
  if (lowRefreshCount === 1) startLowRefresh();

  return () => {
    loSubscribers.delete(callback);
    lowRefreshCount--;
    if (lowRefreshCount === 0) stopLowRefresh();
  };
}

function getHiSnapshot(): Snapshot {
  return hiSnapshot;
}

function getLoSnapshot(): Snapshot {
  return loSnapshot;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseAudioPositionConfig {
  highRefreshRate?: boolean;
}

interface AudioPosition {
  position: number;
  duration: number;
  percentComplete: number;
  seek: (position: number) => number;
}

export function useAudioPosition(
  config: UseAudioPositionConfig = {}
): AudioPosition {
  const { highRefreshRate = false } = config;

  const subscribe = useCallback(
    (callback: () => void) =>
      highRefreshRate ? subscribeHigh(callback) : subscribeLow(callback),
    [highRefreshRate]
  );

  const getSnap = highRefreshRate ? getHiSnapshot : getLoSnapshot;
  const { position, duration } = useSyncExternalStore(subscribe, getSnap);

  const seek = useCallback((pos: number): number => {
    const player = getPlayer();
    if (!player) return 0;
    player.seek(pos);
    const raw = player.seek();
    const updatedPos = typeof raw === "number" ? raw : pos;
    const dur = player.duration() || hiSnapshot.duration;
    // Update both snapshots so all subscribers see the seek immediately
    hiSnapshot = { position: updatedPos, duration: dur };
    loSnapshot = { position: updatedPos, duration: dur };
    hiSubscribers.forEach((cb) => cb());
    loSubscribers.forEach((cb) => cb());
    return updatedPos;
  }, []);

  const percentComplete = useMemo(
    () => (duration > 0 ? (position / duration) * 100 : 0),
    [position, duration]
  );

  return { position, duration, percentComplete, seek };
}
