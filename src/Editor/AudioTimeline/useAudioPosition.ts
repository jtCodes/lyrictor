import { useCallback, useMemo, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { Howler } from "howler";
import { notifyUserSeek } from "./audioSeekEvents";

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
const activeHiSubscribers = new Set<() => void>();
const loSubscribers = new Set<() => void>();

let rafId: number | null = null;
let intervalId: number | null = null;
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
    activeHiSubscribers.forEach((cb) => cb());
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
    // Commit the current playback pose before yielding this frame. Otherwise
    // React's deferred commit and Konva's separately queued draw can skip
    // visual updates even while the audio clock itself ticks at 60 Hz.
    flushSync(pollHigh);
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

function stopHighRefresh() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  const next = readPlayer();
  if (!next) return;

  if (next.position !== hiSnapshot.position || next.duration !== hiSnapshot.duration) {
    hiSnapshot = next;
    hiSubscribers.forEach((cb) => cb());
  }

  if (next.position !== loSnapshot.position || next.duration !== loSnapshot.duration) {
    loSnapshot = next;
    loSubscribers.forEach((cb) => cb());
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

function subscribeHigh(callback: () => void, active: boolean): () => void {
  hiSubscribers.add(callback);
  if (active) {
    activeHiSubscribers.add(callback);
    if (activeHiSubscribers.size === 1) startHighRefresh();
  }

  return () => {
    hiSubscribers.delete(callback);
    if (active) {
      activeHiSubscribers.delete(callback);
      if (activeHiSubscribers.size === 0) stopHighRefresh();
    }
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
  active?: boolean;
}

interface AudioPosition {
  position: number;
  duration: number;
  percentComplete: number;
  seek: (position: number, options?: { userInitiated?: boolean }) => number;
}

export function useAudioPosition(
  config: UseAudioPositionConfig = {}
): AudioPosition {
  const { highRefreshRate = false, active = true } = config;

  const subscribe = useCallback(
    (callback: () => void) => {
      if (highRefreshRate) {
        return subscribeHigh(callback, active);
      }

      if (!active) {
        return () => {};
      }

      return subscribeLow(callback);
    },
    [active, highRefreshRate]
  );

  const getSnap = highRefreshRate ? getHiSnapshot : getLoSnapshot;
  const { position, duration } = useSyncExternalStore(subscribe, getSnap);

  const seek = useCallback((pos: number, options?: { userInitiated?: boolean }): number => {
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
    if (options?.userInitiated) notifyUserSeek(updatedPos);
    return updatedPos;
  }, []);

  const percentComplete = useMemo(
    () => (duration > 0 ? (position / duration) * 100 : 0),
    [position, duration]
  );

  return { position, duration, percentComplete, seek };
}

/**
 * Subscribes at the requested refresh rate but only re-renders when the
 * selected value changes. Useful for playhead-derived UI such as active
 * timeline sections, which does not need to render on every animation frame.
 */
export function useAudioPositionSelector<T>(
  selector: (snapshot: Readonly<Snapshot>) => T,
  config: UseAudioPositionConfig = {}
): T {
  const { highRefreshRate = false, active = true } = config;
  const subscribe = useCallback(
    (callback: () => void) => {
      if (highRefreshRate) {
        return subscribeHigh(callback, active);
      }

      if (!active) {
        return () => {};
      }

      return subscribeLow(callback);
    },
    [active, highRefreshRate]
  );
  const getSelectedSnapshot = useCallback(
    () => selector(highRefreshRate ? hiSnapshot : loSnapshot),
    [highRefreshRate, selector]
  );

  return useSyncExternalStore(subscribe, getSelectedSnapshot);
}

export function getCurrentAudioPosition(): number {
  return readPlayer()?.position ?? hiSnapshot.position;
}
